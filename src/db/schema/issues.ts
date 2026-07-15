import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clients } from "./clients";
import { issueNamespaces, projects, workflowStatuses } from "./projects";
import { teams } from "./teams";
import { workspaceMemberships, workspaces } from "./workspaces";

export const issuePriority = pgEnum("issue_priority", [
  "none",
  "urgent",
  "high",
  "medium",
  "low",
]);

export const issueVisibility = pgEnum("issue_visibility", [
  "internal",
  "client_shared",
  "restricted",
]);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    teamId: uuid("team_id"),
    assigneeId: text("assignee_id"),
    statusId: uuid("status_id"),
    issueNamespaceId: uuid("issue_namespace_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    priority: issuePriority("priority").default("none").notNull(),
    visibility: issueVisibility("visibility").default("internal").notNull(),
    creatorMembershipId: uuid("creator_membership_id").notNull(),
    parentIssueId: uuid("parent_issue_id"),
    rank: text("rank").default("0").notNull(),
    estimateMinutes: integer("estimate_minutes"),
    dueAt: timestamp("due_at", { mode: "date", withTimezone: true }),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    archivedAt: timestamp("archived_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    foreignKey({
      name: "issues_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issues_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_team_tenant_fk",
      columns: [table.workspaceId, table.teamId],
      foreignColumns: [teams.workspaceId, teams.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_assignee_membership_tenant_fk",
      columns: [table.workspaceId, table.assigneeId],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.userId,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_status_tenant_fk",
      columns: [table.workspaceId, table.statusId],
      foreignColumns: [workflowStatuses.workspaceId, workflowStatuses.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_namespace_tenant_client_fk",
      columns: [
        table.workspaceId,
        table.clientId,
        table.issueNamespaceId,
      ],
      foreignColumns: [
        issueNamespaces.workspaceId,
        issueNamespaces.clientId,
        issueNamespaces.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_creator_membership_tenant_fk",
      columns: [table.workspaceId, table.creatorMembershipId],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_parent_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.parentIssueId],
      foreignColumns: [table.workspaceId, table.clientId, table.id],
    }).onDelete("restrict"),
    uniqueIndex("issues_namespace_number_unique").on(
      table.issueNamespaceId,
      table.number,
    ),
    uniqueIndex("issues_tenant_client_id_unique").on(
      table.workspaceId,
      table.clientId,
      table.id,
    ),
    index("issues_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("issues_project_rank_idx").on(table.projectId, table.rank),
    index("issues_team_rank_idx").on(table.teamId, table.rank),
    index("issues_assignee_idx").on(table.assigneeId, table.updatedAt),
    check(
      "issues_project_status_check",
      sql`(${table.projectId} is null and ${table.statusId} is null) or (${table.projectId} is not null and ${table.statusId} is not null)`,
    ),
    check("issues_number_check", sql`${table.number} > 0`),
    check("issues_version_check", sql`${table.version} > 0`),
    check(
      "issues_estimate_check",
      sql`${table.estimateMinutes} is null or ${table.estimateMinutes} >= 0`,
    ),
  ],
);
