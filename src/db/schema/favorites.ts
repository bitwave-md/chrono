import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clients } from "./clients";
import { issues } from "./issues";
import { projects } from "./projects";
import { workspaceMemberships } from "./workspaces";

export const favoriteTargetType = pgEnum("favorite_target_type", [
  "client",
  "project",
  "issue",
]);

export const workspaceFavorites = pgTable(
  "workspace_favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    targetType: favoriteTargetType("target_type").notNull(),
    clientId: uuid("client_id"),
    projectId: uuid("project_id"),
    issueId: uuid("issue_id"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "workspace_favorites_membership_tenant_fk",
      columns: [table.workspaceId, table.membershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "workspace_favorites_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "workspace_favorites_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "workspace_favorites_issue_tenant_fk",
      columns: [table.workspaceId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.id],
    }).onDelete("cascade"),
    check(
      "workspace_favorites_target_check",
      sql`(${table.targetType} = 'client' and ${table.clientId} is not null and ${table.projectId} is null and ${table.issueId} is null)
        or (${table.targetType} = 'project' and ${table.clientId} is null and ${table.projectId} is not null and ${table.issueId} is null)
        or (${table.targetType} = 'issue' and ${table.clientId} is null and ${table.projectId} is null and ${table.issueId} is not null)`,
    ),
    uniqueIndex("workspace_favorites_membership_client_unique")
      .on(table.membershipId, table.clientId)
      .where(sql`${table.clientId} is not null`),
    uniqueIndex("workspace_favorites_membership_project_unique")
      .on(table.membershipId, table.projectId)
      .where(sql`${table.projectId} is not null`),
    uniqueIndex("workspace_favorites_membership_issue_unique")
      .on(table.membershipId, table.issueId)
      .where(sql`${table.issueId} is not null`),
    index("workspace_favorites_membership_created_idx").on(
      table.membershipId,
      table.createdAt,
    ),
  ],
);
