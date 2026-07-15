import { and, eq, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { issues, teams, workspaceMemberships } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { NotFoundError } from "@/modules/shared/application/application-error";

export class IssueRelationValidator {
  async assertTeam(
    transaction: DatabaseTransaction,
    principal: Principal,
    teamId: string | null,
  ): Promise<void> {
    if (!teamId) {
      return;
    }

    const [team] = await transaction
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(
          eq(teams.id, teamId),
          eq(teams.workspaceId, principal.workspaceId),
          isNull(teams.archivedAt),
        ),
      )
      .limit(1);

    if (!team) {
      throw new NotFoundError("Team not found.");
    }
  }

  async assertAssignee(
    transaction: DatabaseTransaction,
    principal: Principal,
    assigneeId: string | null,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const [assignee] = await transaction
      .select({ id: workspaceMemberships.id })
      .from(workspaceMemberships)
      .where(
        and(
          eq(workspaceMemberships.workspaceId, principal.workspaceId),
          eq(workspaceMemberships.userId, assigneeId),
          eq(workspaceMemberships.status, "active"),
        ),
      )
      .limit(1);

    if (!assignee) {
      throw new NotFoundError("Assignee not found in the workspace.");
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
