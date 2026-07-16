import { and, eq, inArray, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { issues, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

export class IssueRelationValidator {
  async assertAssignees(
    transaction: DatabaseTransaction,
    principal: Principal,
    membershipIds: string[],
  ): Promise<void> {
    if (membershipIds.length === 0) {
      return;
    }

    if (membershipIds.length > 20) {
      throw new ValidationError("A work item can have at most 20 assignees.");
    }

    const assignees = await transaction
      .select({ id: workspaceMemberships.id })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, principal.workspaceId),
          inArray(workspaceMemberships.id, membershipIds),
          eq(workspaceMemberships.status, "active"),
        ),
      );

    if (assignees.length !== new Set(membershipIds).size) {
      throw new NotFoundError("One or more assignees are unavailable.");
    }
  }

  async assertParentIssue(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
    parentIssueId: string | null,
  ): Promise<void> {
    if (!parentIssueId) {
      return;
    }

    const [parentIssue] = await transaction
      .select({ id: issues.id })
      .from(issues)
      .where(
        and(
          eq(issues.id, parentIssueId),
          eq(issues.workspaceId, principal.workspaceId),
          eq(issues.clientId, clientId),
          isNull(issues.archivedAt),
        ),
      )
      .limit(1);

    if (!parentIssue) {
      throw new NotFoundError("Parent issue not found.");
    }
  }
}
