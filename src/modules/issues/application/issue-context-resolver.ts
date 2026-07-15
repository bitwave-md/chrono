import { and, eq, isNull, sql } from "drizzle-orm";

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

    const resolved = await transaction.execute<ResolvedIssueContext>(sql`
      with recursive ancestry as (
        select ${projects.id}, ${projects.parentId}, 0 as depth
        from ${projects}
        where ${projects.id} = ${projectId}
          and ${projects.workspaceId} = ${principal.workspaceId}
          and ${projects.clientId} = ${clientId}
        union all
        select parent.${sql.identifier("id")}, parent.${sql.identifier("parent_id")}, child.depth + 1
        from ${projects} parent
        inner join ancestry child
          on parent.${sql.identifier("id")} = child.parent_id
        where parent.${sql.identifier("workspace_id")} = ${principal.workspaceId}
          and parent.${sql.identifier("client_id")} = ${clientId}
      )
      select
        coalesce(
          (
            select namespace.${sql.identifier("id")}
            from ancestry node
            inner join ${issueNamespaces} namespace
              on namespace.${sql.identifier("project_id")} = node.id
            order by node.depth
            limit 1
          ),
          client_namespace.${sql.identifier("id")}
        ) as namespace_id,
        coalesce(
          (
            select namespace.${sql.identifier("prefix")}
            from ancestry node
            inner join ${issueNamespaces} namespace
              on namespace.${sql.identifier("project_id")} = node.id
            order by node.depth
            limit 1
          ),
          client_namespace.${sql.identifier("prefix")}
        ) as prefix,
        (
          select workflow.${sql.identifier("id")}
          from ancestry node
          inner join ${workflows} workflow
            on workflow.${sql.identifier("project_id")} = node.id
          order by node.depth
          limit 1
        ) as workflow_id
      from ${issueNamespaces} client_namespace
      where client_namespace.${sql.identifier("workspace_id")} = ${principal.workspaceId}
        and client_namespace.${sql.identifier("client_id")} = ${clientId}
        and client_namespace.${sql.identifier("project_id")} is null
      limit 1
    `);

    const context = resolved.rows[0];

    if (!context?.namespace_id || !context.workflow_id) {
      throw new ConflictError(
        "The project has no effective namespace or workflow.",
      );
    }

    return context;
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
