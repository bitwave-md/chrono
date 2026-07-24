import { and, desc, eq, exists, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  clientMemberships,
  clients,
  inboxNotifications,
  issueAssignees,
  issueNamespaces,
  issues,
  projectMemberships,
  projects,
  users,
  workflowStatuses,
  workspaceMemberships,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { NotFoundError } from "@/modules/shared/application/application-error";

export type InboxNotificationAction = "read" | "unread" | "dismiss";

export class InboxService {
  async list(principal: Principal, unreadOnly: boolean) {
    const conditions = [
      eq(inboxNotifications.workspaceId, principal.workspaceId),
      eq(inboxNotifications.recipientMembershipId, principal.membershipId),
      isNull(inboxNotifications.dismissedAt),
      isNull(issues.archivedAt),
    ];
    if (unreadOnly) conditions.push(isNull(inboxNotifications.readAt));
    if (principal.role === "guest") conditions.push(this.#guestVisibility(principal));

    return db
      .select({
        id: inboxNotifications.id,
        kind: inboxNotifications.kind,
        detail: inboxNotifications.detail,
        createdAt: inboxNotifications.createdAt,
        readAt: inboxNotifications.readAt,
        issueId: issues.id,
        identifier: sql<string>`${issueNamespaces.prefix} || '-' || ${issues.number}`.as("identifier"),
        issueTitle: issues.title,
        projectId: issues.projectId,
        projectName: projects.name,
        clientId: issues.clientId,
        clientName: clients.name,
        statusName: workflowStatuses.name,
        statusColor: workflowStatuses.color,
        statusCategory: workflowStatuses.category,
        actorMembershipId: inboxNotifications.actorMembershipId,
        actorName: users.name,
        actorEmail: users.email,
        actorAvatarUrl: users.image,
      })
      .from(inboxNotifications)
      .innerJoin(issues, and(
        eq(issues.workspaceId, inboxNotifications.workspaceId),
        eq(issues.id, inboxNotifications.issueId),
      ))
      .innerJoin(issueNamespaces, eq(issueNamespaces.id, issues.issueNamespaceId))
      .innerJoin(clients, eq(clients.id, issues.clientId))
      .innerJoin(workflowStatuses, eq(workflowStatuses.id, issues.statusId))
      .innerJoin(workspaceMemberships, and(
        eq(workspaceMemberships.workspaceId, inboxNotifications.workspaceId),
        eq(workspaceMemberships.id, inboxNotifications.actorMembershipId),
      ))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .leftJoin(projects, eq(projects.id, issues.projectId))
      .where(and(...conditions))
      .orderBy(desc(inboxNotifications.createdAt))
      .limit(100);
  }

  async update(
    principal: Principal,
    notificationId: string,
    action: InboxNotificationAction,
  ) {
    const now = new Date();
    const [updated] = await db
      .update(inboxNotifications)
      .set(action === "dismiss"
        ? { dismissedAt: now, readAt: now }
        : { readAt: action === "read" ? now : null })
      .where(and(
        eq(inboxNotifications.workspaceId, principal.workspaceId),
        eq(inboxNotifications.recipientMembershipId, principal.membershipId),
        eq(inboxNotifications.id, notificationId),
        isNull(inboxNotifications.dismissedAt),
      ))
      .returning({ id: inboxNotifications.id, readAt: inboxNotifications.readAt });
    if (!updated) throw new NotFoundError("Inbox notification not found.");
    return updated;
  }

  async markAllRead(principal: Principal) {
    const updated = await db
      .update(inboxNotifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(inboxNotifications.workspaceId, principal.workspaceId),
        eq(inboxNotifications.recipientMembershipId, principal.membershipId),
        isNull(inboxNotifications.readAt),
        isNull(inboxNotifications.dismissedAt),
      ))
      .returning({ id: inboxNotifications.id });
    return { count: updated.length };
  }

  #guestVisibility(principal: Principal) {
    return and(
      exists(
        db.select({ value: sql`1` }).from(clientMemberships).where(and(
          eq(clientMemberships.clientId, issues.clientId),
          eq(clientMemberships.workspaceMembershipId, principal.membershipId),
        )),
      ),
      or(
        isNull(issues.projectId),
        exists(
          db.select({ value: sql`1` }).from(projectMemberships).where(and(
            eq(projectMemberships.workspaceId, issues.workspaceId),
            eq(projectMemberships.projectId, issues.projectId),
            eq(projectMemberships.workspaceMembershipId, principal.membershipId),
          )),
        ),
        exists(
          db.select({ value: sql`1` }).from(issueAssignees).where(and(
            eq(issueAssignees.issueId, issues.id),
            eq(issueAssignees.membershipId, principal.membershipId),
          )),
        ),
      ),
    )!;
  }
}
