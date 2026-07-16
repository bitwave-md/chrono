import { and, eq, isNull, or, sql } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import {
  clientMemberships,
  clients,
  issueAssignees,
  issues,
  projects,
  timeCategories,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  ConflictError,
  NotFoundError,
} from "@/modules/shared/application/application-error";

export interface TimeAttribution {
  issueId: string;
  clientId: string;
  projectId: string | null;
  rootProjectId: string | null;
}

export interface ResolvedTimeCategory {
  id: string;
  defaultBillable: boolean;
}

interface RootProjectRow extends Record<string, unknown> {
  root_project_id: string;
}

export class TimeAttributionResolver {
  async resolve(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
  ): Promise<TimeAttribution> {
    const issue = await this.#accessibleIssue(transaction, principal, issueId);

    if (!issue) {
      throw new NotFoundError("Issue not found or unavailable for time entry.");
    }

    const rootProjectId = issue.projectId
      ? await this.#rootProjectId(
          transaction,
          principal,
          issue.clientId,
          issue.projectId,
        )
      : null;

    return {
      issueId: issue.id,
      clientId: issue.clientId,
      projectId: issue.projectId,
      rootProjectId,
    };
  }

  async resolveCategory(
    transaction: DatabaseTransaction,
    principal: Principal,
    categoryId: string | null,
  ): Promise<ResolvedTimeCategory | null> {
    if (!categoryId) {
      return null;
    }

    const [category] = await transaction
      .select({
        id: timeCategories.id,
        defaultBillable: timeCategories.defaultBillable,
      })
      .from(timeCategories)
      .where(
        and(
          eq(timeCategories.id, categoryId),
          eq(timeCategories.workspaceId, principal.workspaceId),
          isNull(timeCategories.archivedAt),
        ),
      )
      .limit(1);

    if (!category) {
      throw new NotFoundError("Time category not found.");
    }

    return category;
  }

  async #accessibleIssue(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
  ) {
    const conditions = and(
      eq(issues.id, issueId),
      eq(issues.workspaceId, principal.workspaceId),
      isNull(issues.archivedAt),
      isNull(clients.archivedAt),
    );

    const selection = {
      id: issues.id,
      clientId: issues.clientId,
      projectId: issues.projectId,
    };

    if (principal.role !== "guest") {
      const [issue] = await transaction
        .select(selection)
        .from(issues)
        .innerJoin(
          clients,
          and(
            eq(clients.id, issues.clientId),
            eq(clients.workspaceId, issues.workspaceId),
          ),
        )
        .where(conditions)
        .limit(1);

      return issue;
    }

    const [issue] = await transaction
      .select(selection)
      .from(issues)
      .innerJoin(
        clients,
        and(
          eq(clients.id, issues.clientId),
          eq(clients.workspaceId, issues.workspaceId),
        ),
      )
      .innerJoin(
        clientMemberships,
        and(
          eq(clientMemberships.workspaceId, issues.workspaceId),
          eq(clientMemberships.clientId, issues.clientId),
          eq(
            clientMemberships.workspaceMembershipId,
            principal.membershipId,
          ),
        ),
      )
      .where(
        and(
          conditions,
          eq(clientMemberships.permission, "contribute"),
          or(
            eq(issues.visibility, "client_shared"),
            sql`exists (
              select 1 from ${issueAssignees} assignment
              where assignment.issue_id = ${issues.id}
                and assignment.membership_id = ${principal.membershipId}
            )`,
          ),
        ),
      )
      .limit(1);

    return issue;
  }

  async #rootProjectId(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
    projectId: string,
  ): Promise<string> {
    const result = await transaction.execute<RootProjectRow>(sql`
      with recursive ancestry as (
        select ${projects.id}, ${projects.parentId}
        from ${projects}
        where ${projects.id} = ${projectId}
          and ${projects.workspaceId} = ${principal.workspaceId}
          and ${projects.clientId} = ${clientId}
        union all
        select parent.${sql.identifier("id")}, parent.${sql.identifier("parent_id")}
        from ${projects} parent
        inner join ancestry child
          on parent.${sql.identifier("id")} = child.parent_id
        where parent.${sql.identifier("workspace_id")} = ${principal.workspaceId}
          and parent.${sql.identifier("client_id")} = ${clientId}
      )
      select ${sql.identifier("id")} as root_project_id
      from ancestry
      where ${sql.identifier("parent_id")} is null
      limit 1
    `);

    const rootProjectId = result.rows[0]?.root_project_id;

    if (!rootProjectId) {
      throw new ConflictError("The Issue's Project hierarchy has no root.");
    }

    return rootProjectId;
  }
}
