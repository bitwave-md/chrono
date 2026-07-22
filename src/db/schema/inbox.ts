import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { issues } from "./issues";
import { workspaceMemberships, workspaces } from "./workspaces";

export const inboxNotificationKind = pgEnum("inbox_notification_kind", [
  "assigned",
  "status_changed",
  "commented",
]);

export const inboxNotifications = pgTable(
  "inbox_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    recipientMembershipId: uuid("recipient_membership_id").notNull(),
    actorMembershipId: uuid("actor_membership_id").notNull(),
    issueId: uuid("issue_id").notNull(),
    kind: inboxNotificationKind("kind").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "inbox_notifications_recipient_tenant_fk",
      columns: [table.workspaceId, table.recipientMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "inbox_notifications_actor_tenant_fk",
      columns: [table.workspaceId, table.actorMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "inbox_notifications_issue_tenant_fk",
      columns: [table.workspaceId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.id],
    }).onDelete("cascade"),
    index("inbox_notifications_recipient_open_idx").on(
      table.workspaceId,
      table.recipientMembershipId,
      table.dismissedAt,
      table.createdAt,
    ),
    index("inbox_notifications_issue_created_idx").on(
      table.workspaceId,
      table.issueId,
      table.createdAt,
    ),
  ],
);
