import { and, eq, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import {
  issueNamespaces,
  projects,
  workflows,
  workflowStatuses,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

export interface ResolvedIssueContext extends Record<string, unknown> {
  namespace_id: string;
  prefix: string;
  workflow_id: string;
}

export class IssueContextResolver {
  async resolve(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
    projectId: string | null,
  ): Promise<ResolvedIssueContext> {
    return projectId
      ? this.#resolveProjectContext(
          transaction,
          principal,
          clientId,
          projectId,
        )
      : this.#resolveClientNamespace(
          transaction,
          principal,
          clientId,
        );
  }

  async resolveStatus(
    transaction: DatabaseTransaction,
    workflowId: string,
    requestedStatusId: string | null,
  ): Promise<string | null> {
    if (!workflowId) {
      if (requestedStatusId) {
        throw new ValidationError(
          "Client-backlog issues cannot have a workflow status.",
        );
      }

      return null;
    }

    const [status] = await transaction
      .select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          requestedStatusId
            ? eq(workflowStatuses.id, requestedStatusId)
            : eq(workflowStatuses.isDefault, true),
          isNull(workflowStatuses.archivedAt),
        ),
      )
      .limit(1);

    if (!status) {
      throw new ValidationError(
        requestedStatusId
          ? "The status does not belong to the project's workflow."
          : "The project's workflow has no default status.",
      );
    }

    return status.id;
  }

  async #resolveProjectContext(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
    projectId: string,
  ): Promise<ResolvedIssueContext> {
    const [project] = await transaction
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, principal.workspaceId),
          eq(projects.clientId, clientId),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    const [projectNamespaceRows, clientNamespaceRows, workflowRows] =
      await Promise.all([
        transaction
          .select({
            namespace_id: issueNamespaces.id,
            prefix: issueNamespaces.prefix,
          })
          .from(issueNamespaces)
          .where(
            and(
              eq(issueNamespaces.workspaceId, principal.workspaceId),
              eq(issueNamespaces.clientId, clientId),
              eq(issueNamespaces.projectId, projectId),
            ),
          )
          .limit(1),
        transaction
          .select({
            namespace_id: issueNamespaces.id,
            prefix: issueNamespaces.prefix,
          })
          .from(issueNamespaces)
          .where(
            and(
              eq(issueNamespaces.workspaceId, principal.workspaceId),
              eq(issueNamespaces.clientId, clientId),
              isNull(issueNamespaces.projectId),
            ),
          )
          .limit(1),
        transaction
          .select({ workflow_id: workflows.id })
          .from(workflows)
          .where(
            and(
              eq(workflows.workspaceId, principal.workspaceId),
              eq(workflows.projectId, projectId),
            ),
          )
          .limit(1),
      ]);

    const namespace = projectNamespaceRows[0] ?? clientNamespaceRows[0];
    const workflow = workflowRows[0];

    if (!namespace || !workflow) {
      throw new ConflictError("The project has no namespace or workflow.");
    }

    return { ...namespace, workflow_id: workflow.workflow_id };
  }

  async #resolveClientNamespace(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
  ): Promise<ResolvedIssueContext> {
    const [namespace] = await transaction
      .select({
        namespace_id: issueNamespaces.id,
        prefix: issueNamespaces.prefix,
      })
      .from(issueNamespaces)
      .where(
        and(
          eq(issueNamespaces.workspaceId, principal.workspaceId),
          eq(issueNamespaces.clientId, clientId),
          isNull(issueNamespaces.projectId),
        ),
      )
      .limit(1);

    if (!namespace) {
      throw new ConflictError("The client has no default issue namespace.");
    }

    return { ...namespace, workflow_id: "" };
  }
}
