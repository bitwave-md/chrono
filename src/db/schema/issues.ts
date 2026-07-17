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
import {
  issueNamespaces,
  projectBranches,
  projects,
  workflowStatuses,
} from "./projects";
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

export const issueTypes = pgTable(
  "issue_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").default("circle-dot").notNull(),
    color: text("color").default("#6b7280").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("issue_types_workspace_name_unique").on(
      table.workspaceId,
      table.name,
    ),
    uniqueIndex("issue_types_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
  ],
);

export const labels = pgTable(
  "labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#6b7280").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("labels_workspace_name_unique").on(table.workspaceId, table.name),
    uniqueIndex("labels_workspace_id_unique").on(table.workspaceId, table.id),
  ],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    branchId: uuid("branch_id"),
    issueTypeId: uuid("issue_type_id"),
    statusId: uuid("status_id").notNull(),
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
      name: "issues_branch_tenant_project_fk",
      columns: [
        table.workspaceId,
        table.clientId,
        table.projectId,
        table.branchId,
      ],
      foreignColumns: [
        projectBranches.workspaceId,
        projectBranches.clientId,
        projectBranches.projectId,
        projectBranches.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "issues_type_tenant_fk",
      columns: [table.workspaceId, table.issueTypeId],
      foreignColumns: [issueTypes.workspaceId, issueTypes.id],
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
    uniqueIndex("issues_workspace_id_unique").on(table.workspaceId, table.id),
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
    index("issues_branch_rank_idx").on(table.branchId, table.rank),
    index("issues_type_idx").on(table.issueTypeId, table.updatedAt),
    check(
      "issues_branch_project_check",
      sql`${table.branchId} is null or ${table.projectId} is not null`,
    ),
    check("issues_number_check", sql`${table.number} > 0`),
    check("issues_version_check", sql`${table.version} > 0`),
    check(
      "issues_estimate_check",
      sql`${table.estimateMinutes} is null or ${table.estimateMinutes} >= 0`,
    ),
  ],
);

export const issueAssignees = pgTable(
  "issue_assignees",
  {
    workspaceId: uuid("workspace_id").notNull(),
    issueId: uuid("issue_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    createdByMembershipId: uuid("created_by_membership_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "issue_assignees_issue_tenant_fk",
      columns: [table.workspaceId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issue_assignees_membership_tenant_fk",
      columns: [table.workspaceId, table.membershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issue_assignees_creator_tenant_fk",
      columns: [table.workspaceId, table.createdByMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    uniqueIndex("issue_assignees_issue_membership_unique").on(
      table.issueId,
      table.membershipId,
    ),
    index("issue_assignees_membership_idx").on(
      table.workspaceId,
      table.membershipId,
    ),
  ],
);

export const issueLabels = pgTable(
  "issue_labels",
  {
    workspaceId: uuid("workspace_id").notNull(),
    issueId: uuid("issue_id").notNull(),
    labelId: uuid("label_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "issue_labels_issue_tenant_fk",
      columns: [table.workspaceId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issue_labels_label_tenant_fk",
      columns: [table.workspaceId, table.labelId],
      foreignColumns: [labels.workspaceId, labels.id],
    }).onDelete("cascade"),
    uniqueIndex("issue_labels_issue_label_unique").on(
      table.issueId,
      table.labelId,
    ),
  ],
);

export const issueComments = pgTable(
  "issue_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    issueId: uuid("issue_id").notNull(),
    authorMembershipId: uuid("author_membership_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "issue_comments_issue_tenant_fk",
      columns: [table.workspaceId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issue_comments_author_tenant_fk",
      columns: [table.workspaceId, table.authorMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    index("issue_comments_issue_created_idx").on(table.issueId, table.createdAt),
  ],
);
