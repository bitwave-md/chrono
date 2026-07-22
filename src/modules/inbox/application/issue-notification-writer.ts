import { and, eq, inArray, isNull, or } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { inboxNotifications, issueAssignees, issues, workspaceMemberships, workspaceNotificationPreferences } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { notificationRecipients } from "@/modules/inbox/domain/notification-recipients";

export type IssueNotificationKind = "assigned" | "status_changed" | "commented";

export class IssueNotificationWriter {
  async notifyInterested(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
    kind: IssueNotificationKind,
    detail: string | null,
  ): Promise<void> {
    const interested = await this.#interestedMembershipIds(
      transaction,
      principal.workspaceId,
      issueId,
    );
    await this.notify(transaction, principal, issueId, kind, detail, interested);
  }

  async notify(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
    kind: IssueNotificationKind,
    detail: string | null,
    interestedMembershipIds: readonly string[],
  ): Promise<void> {
    const interested = notificationRecipients(
      interestedMembershipIds,
      principal.membershipId,
    );
    const recipients = await this.#enabledRecipients(transaction, principal.workspaceId, interested, kind);
    if (!recipients.length) return;

    await transaction.insert(inboxNotifications).values(recipients.map((recipientMembershipId) => ({
      workspaceId: principal.workspaceId,
      recipientMembershipId,
      actorMembershipId: principal.membershipId,
      issueId,
      kind,
      detail,
    })));
  }

  async #enabledRecipients(
    transaction: DatabaseTransaction,
    workspaceId: string,
    membershipIds: string[],
    kind: IssueNotificationKind,
  ) {
    if (!membershipIds.length) return [];
    const preference = kind === "assigned"
      ? workspaceNotificationPreferences.assignments
      : kind === "status_changed"
        ? workspaceNotificationPreferences.statusChanges
        : workspaceNotificationPreferences.comments;
    const rows = await transaction.select({ id: workspaceMemberships.id }).from(workspaceMemberships)
      .leftJoin(workspaceNotificationPreferences, and(
        eq(workspaceNotificationPreferences.workspaceId, workspaceMemberships.workspaceId),
        eq(workspaceNotificationPreferences.membershipId, workspaceMemberships.id),
      ))
      .where(and(
        eq(workspaceMemberships.workspaceId, workspaceId),
        inArray(workspaceMemberships.id, membershipIds),
        eq(workspaceMemberships.status, "active"),
        or(isNull(workspaceNotificationPreferences.membershipId), eq(preference, true)),
      ));
    return rows.map((row) => row.id);
  }

  async #interestedMembershipIds(
    transaction: DatabaseTransaction,
    workspaceId: string,
    issueId: string,
  ): Promise<string[]> {
    const issue = await transaction
      .select({ creatorMembershipId: issues.creatorMembershipId })
      .from(issues)
      .where(and(eq(issues.workspaceId, workspaceId), eq(issues.id, issueId)))
      .limit(1);
    const assignees = await transaction
      .select({ membershipId: issueAssignees.membershipId })
      .from(issueAssignees)
      .where(and(
        eq(issueAssignees.workspaceId, workspaceId),
        eq(issueAssignees.issueId, issueId),
      ));
    return [
      ...(issue[0] ? [issue[0].creatorMembershipId] : []),
      ...assignees.map((assignee) => assignee.membershipId),
    ];
  }
}
