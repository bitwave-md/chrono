import { boolean, foreignKey, pgEnum, pgTable, primaryKey, timestamp, uuid, text } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { workspaceMemberships, workspaces } from "./workspaces";
import { storedObjects } from "./storage";

export const userTheme = pgEnum("user_theme", ["dark", "light", "system"]);
export const interfaceDensity = pgEnum("interface_density", ["compact", "comfortable"]);
export const defaultIssueView = pgEnum("default_issue_view", ["list", "board"]);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  theme: userTheme("theme").default("dark").notNull(),
  density: interfaceDensity("density").default("compact").notNull(),
  issueView: defaultIssueView("issue_view").default("list").notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const workspaceNotificationPreferences = pgTable(
  "workspace_notification_preferences",
  {
    workspaceId: uuid("workspace_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    assignments: boolean("assignments").default(true).notNull(),
    statusChanges: boolean("status_changes").default(true).notNull(),
    comments: boolean("comments").default(true).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.membershipId] }),
    foreignKey({
      name: "workspace_notification_preferences_membership_tenant_fk",
      columns: [table.workspaceId, table.membershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
  ],
);

export const workspaceAssets = pgTable("workspace_assets", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  iconType: text("icon_type").default("icon").notNull(),
  iconKey: text("icon_key").default("waves").notNull(),
  iconColor: text("icon_color").default("#6366f1").notNull(),
  imageObjectId: uuid("image_object_id").references(() => storedObjects.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});
