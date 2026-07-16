import { and, eq, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { issues, projectBranches } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";
import { WorkspaceMemberService } from "@/modules/workspaces/application/workspace-member-service";

export class IssueRelationValidator {
  readonly #memberService = new WorkspaceMemberService();

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

    await this.#memberService.assertActive(transaction, principal, membershipIds);
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

  async assertBranch(
    transaction: DatabaseTransaction,
    principal: Principal,
    clientId: string,
    projectId: string | null,
    branchId: string | null,
  ): Promise<void> {
    if (!branchId) return;
    if (!projectId) {
      throw new ValidationError("Client-backlog Issues cannot belong to a Branch.");
    }

    const [branch] = await transaction
      .select({ id: projectBranches.id })
      .from(projectBranches)
      .where(
        and(
          eq(projectBranches.id, branchId),
          eq(projectBranches.workspaceId, principal.workspaceId),
          eq(projectBranches.clientId, clientId),
          eq(projectBranches.projectId, projectId),
          isNull(projectBranches.archivedAt),
        ),
      )
      .limit(1);

    if (!branch) {
      throw new NotFoundError("Branch not found in the selected Project.");
    }
  }
}
