import { and, eq, isNull, or, sql } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import {
  clientMemberships,
  clients,
  issueAssignees,
  issues,
  timeCategories,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError, NotFoundError } from "@/modules/shared/application/application-error";

export interface TimeAttribution {
  issueId: string;
  clientId: string;
  projectId: string | null;
  branchId: string | null;
}

export interface ResolvedTimeCategory {
  id: string;
  defaultBillable: boolean;
}

export class TimeAttributionResolver {
  async resolve(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
  ): Promise<TimeAttribution> {
    if (principal.role === "guest") throw new ForbiddenError("Guests cannot create time entries.");
    const issue = await this.#accessibleIssue(transaction, principal, issueId);

    if (!issue) {
      throw new NotFoundError("Issue not found or unavailable for time entry.");
    }

    return {
      issueId: issue.id,
      clientId: issue.clientId,
      projectId: issue.projectId,
      branchId: issue.branchId,
    };
  }

  async resolveCategory(
    transaction: DatabaseTransaction,
    principal: Principal,
    categoryId: string | null,
  ): Promise<ResolvedTimeCategory | null> {
    if (principal.role === "guest") throw new ForbiddenError("Guests cannot use time entry types.");
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
      branchId: issues.branchId,
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

}
