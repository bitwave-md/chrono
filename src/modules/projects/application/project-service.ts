import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import {
  clients,
  issueNamespaces,
  projects,
  workflows,
  workflowStatuses,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { DefaultWorkflowTemplate } from "@/modules/projects/domain/default-workflow-template";
import { IssuePrefix } from "@/modules/projects/domain/issue-prefix";
import { ProjectSlug } from "@/modules/projects/domain/project-slug";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

const projectVisibilities = [
  "internal",
  "client_shared",
  "restricted",
] as const;

export type ProjectVisibility = (typeof projectVisibilities)[number];

export interface CreateProjectInput {
  clientId: string;
  visibility: ProjectVisibility;
  name: string;
  slug: string;
  description: string | null;
  namespacePrefix: string | null;
}

export class ProjectService {
  readonly #clientAccess = new ClientAccessService();
  readonly #policy = new WorkspacePolicy();
  readonly #workflowTemplate = new DefaultWorkflowTemplate();

  async list(principal: Principal, clientId: string) {
    await this.#clientAccess.assertCanRead(principal, clientId);

    const [clientNamespace] = await db
      .select({ prefix: issueNamespaces.prefix })
      .from(issueNamespaces)
      .where(
        and(
          eq(issueNamespaces.workspaceId, principal.workspaceId),
          eq(issueNamespaces.clientId, clientId),
          isNull(issueNamespaces.projectId),
        ),
      )
      .limit(1);

    if (!clientNamespace) {
      throw new ConflictError("The client has no default issue namespace.");
    }

    const records = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        visibility: projects.visibility,
        position: projects.position,
        namespacePrefix: issueNamespaces.prefix,
        workflowId: workflows.id,
      })
      .from(projects)
      .leftJoin(issueNamespaces, eq(issueNamespaces.projectId, projects.id))
      .leftJoin(workflows, eq(workflows.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, principal.workspaceId),
          eq(projects.clientId, clientId),
          isNull(projects.archivedAt),
          principal.role === "guest"
            ? eq(projects.visibility, "client_shared")
            : undefined,
        ),
      )
      .orderBy(asc(projects.position), asc(projects.name));

    return records.map((record) => {
      if (!record.workflowId) {
        throw new ConflictError("The project has no workflow.");
      }

      return {
        ...record,
        effectiveNamespacePrefix:
          record.namespacePrefix ?? clientNamespace.prefix,
      };
    });
  }

  async create(principal: Principal, input: CreateProjectInput) {
    this.#policy.assertCanContribute(principal);
    await this.#clientAccess.assertCanContribute(principal, input.clientId);

    const name = input.name.trim();
    const slug = new ProjectSlug(input.slug).value;
    const namespacePrefix = input.namespacePrefix
      ? new IssuePrefix(input.namespacePrefix).value
      : null;

    if (name.length < 2 || name.length > 160) {
      throw new ValidationError("Project names must contain 2-160 characters.");
    }

    try {
      return await db.transaction(
        async (transaction) => {
          const [client] = await transaction
            .select({ id: clients.id })
            .from(clients)
            .where(
              and(
                eq(clients.id, input.clientId),
                eq(clients.workspaceId, principal.workspaceId),
                isNull(clients.archivedAt),
              ),
            )
            .limit(1);

          if (!client) {
            throw new NotFoundError("Client not found.");
          }

          const [project] = await transaction
            .insert(projects)
            .values({
              workspaceId: principal.workspaceId,
              clientId: input.clientId,
              visibility: input.visibility,
              name,
              slug,
              description: input.description,
            })
            .returning();

          const namespace = namespacePrefix
            ? (
                await transaction
                  .insert(issueNamespaces)
                  .values({
                    workspaceId: principal.workspaceId,
                    clientId: input.clientId,
                    projectId: project.id,
                    prefix: namespacePrefix,
                  })
                  .returning({
                    id: issueNamespaces.id,
                    prefix: issueNamespaces.prefix,
                  })
              )[0]
            : null;

          const [workflow] = await transaction
            .insert(workflows)
            .values({
              workspaceId: principal.workspaceId,
              projectId: project.id,
              name: this.#workflowTemplate.name,
            })
            .returning({ id: workflows.id, name: workflows.name });

          await transaction.insert(workflowStatuses).values(
            this.#workflowTemplate.statuses().map((status) => ({
              workspaceId: principal.workspaceId,
              workflowId: workflow.id,
              ...status,
            })),
          );

          return { project, namespace, workflow };
        },
        { isolationLevel: "serializable", accessMode: "read write" },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "The project slug or issue prefix is already in use.",
        );
      }

      throw error;
    }
  }
}

export { projectVisibilities };
