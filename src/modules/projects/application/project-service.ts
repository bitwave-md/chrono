import { and, asc, eq, isNull, sql } from "drizzle-orm";

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
  ProjectTreeBuilder,
  type ProjectRecord,
} from "@/modules/projects/domain/project-tree-builder";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

const projectKinds = ["project", "subproject", "sprint"] as const;
const workflowModes = ["own", "inherit"] as const;
const projectVisibilities = [
  "internal",
  "client_shared",
  "restricted",
] as const;

export type ProjectKind = (typeof projectKinds)[number];
export type WorkflowMode = (typeof workflowModes)[number];
export type ProjectVisibility = (typeof projectVisibilities)[number];

export interface CreateProjectInput {
  clientId: string;
  parentId: string | null;
  kind: ProjectKind;
  workflowMode: WorkflowMode;
  visibility: ProjectVisibility;
  name: string;
  slug: string;
  description: string | null;
  namespacePrefix: string | null;
}

export class ProjectService {
  readonly #clientAccess = new ClientAccessService();
  readonly #policy = new WorkspacePolicy();
  readonly #treeBuilder = new ProjectTreeBuilder();
  readonly #workflowTemplate = new DefaultWorkflowTemplate();

  async listTree(principal: Principal, clientId: string) {
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

    const rows = await db
      .select({
        id: projects.id,
        parentId: projects.parentId,
        name: projects.name,
        slug: projects.slug,
        kind: projects.kind,
        workflowMode: projects.workflowMode,
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

    return this.#treeBuilder.build(rows satisfies ProjectRecord[], clientNamespace.prefix);
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

    this.#validatePlacement(input);

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

          if (input.parentId) {
            const [parent] = await transaction
              .select({ id: projects.id })
              .from(projects)
              .where(
                and(
                  eq(projects.id, input.parentId),
                  eq(projects.workspaceId, principal.workspaceId),
                  eq(projects.clientId, input.clientId),
                  isNull(projects.archivedAt),
                ),
              )
              .limit(1);

            if (!parent) {
              throw new NotFoundError("Parent project not found.");
            }
          }

          const [project] = await transaction
            .insert(projects)
            .values({
              workspaceId: principal.workspaceId,
              clientId: input.clientId,
              parentId: input.parentId,
              kind: input.kind,
              workflowMode: input.workflowMode,
              visibility: input.visibility,
              name,
              slug,
              description: input.description,
            })
            .returning();

          let namespace: { id: string; prefix: string } | null = null;

          if (namespacePrefix) {
            [namespace] = await transaction
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
              });
          }

          let workflow: { id: string; name: string } | null = null;

          if (input.workflowMode === "own") {
            const [createdWorkflow] = await transaction
              .insert(workflows)
              .values({
                workspaceId: principal.workspaceId,
                projectId: project.id,
                name: this.#workflowTemplate.name,
              })
              .returning({ id: workflows.id, name: workflows.name });

            workflow = createdWorkflow;

            await transaction.insert(workflowStatuses).values(
              this.#workflowTemplate.statuses().map((status) => ({
                workspaceId: principal.workspaceId,
                workflowId: createdWorkflow.id,
                ...status,
              })),
            );
          }

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

  async move(
    principal: Principal,
    projectId: string,
    targetParentId: string | null,
  ) {
    this.#policy.assertCanContribute(principal);

    const [projectSnapshot] = await db
      .select({ clientId: projects.clientId })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, principal.workspaceId),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    if (!projectSnapshot) {
      throw new NotFoundError("Project not found.");
    }

    await this.#clientAccess.assertCanContribute(
      principal,
      projectSnapshot.clientId,
    );

    return db.transaction(
      async (transaction) => {
        const [project] = await transaction
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.id, projectId),
              eq(projects.workspaceId, principal.workspaceId),
              isNull(projects.archivedAt),
            ),
          )
          .limit(1);

        if (!project) {
          throw new NotFoundError("Project not found.");
        }

        if (project.kind === "project" && targetParentId) {
          throw new ValidationError("Root projects cannot become child projects.");
        }

        if (project.kind !== "project" && !targetParentId) {
          throw new ValidationError("Subprojects and sprints require a parent.");
        }

        if (targetParentId === project.id) {
          throw new ValidationError("A project cannot be its own parent.");
        }

        if (targetParentId) {
          const [parent] = await transaction
            .select({ id: projects.id, clientId: projects.clientId })
            .from(projects)
            .where(
              and(
                eq(projects.id, targetParentId),
                eq(projects.workspaceId, principal.workspaceId),
                isNull(projects.archivedAt),
              ),
            )
            .limit(1);

          if (!parent || parent.clientId !== project.clientId) {
            throw new ValidationError(
              "The parent must belong to the same workspace and client.",
            );
          }

          const descendants = await transaction.execute<{ id: string }>(sql`
            with recursive project_descendants as (
              select ${projects.id}
              from ${projects}
              where ${projects.id} = ${project.id}
                and ${projects.workspaceId} = ${principal.workspaceId}
              union all
              select child.${sql.identifier("id")}
              from ${projects} child
              inner join project_descendants descendant
                on child.${sql.identifier("parent_id")} = descendant.id
              where child.${sql.identifier("workspace_id")} = ${principal.workspaceId}
            )
            select id from project_descendants where id = ${targetParentId}
          `);

          if (descendants.rows.length > 0) {
            throw new ConflictError(
              "A project cannot be moved below one of its descendants.",
            );
          }
        }

        const [updated] = await transaction
          .update(projects)
          .set({ parentId: targetParentId, updatedAt: new Date() })
          .where(eq(projects.id, project.id))
          .returning();

        return updated;
      },
      { isolationLevel: "serializable", accessMode: "read write" },
    );
  }

  #validatePlacement(input: CreateProjectInput): void {
    const isRoot = input.parentId === null;

    if (isRoot && input.kind !== "project") {
      throw new ValidationError("Root nodes must use the project kind.");
    }

    if (!isRoot && input.kind === "project") {
      throw new ValidationError(
        "Child nodes must be subprojects or sprints.",
      );
    }

    if (isRoot && input.workflowMode !== "own") {
      throw new ValidationError("Root projects must own their workflow.");
    }
  }
}

export { projectKinds, projectVisibilities, workflowModes };
