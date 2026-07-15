import { sql } from "drizzle-orm";
import {
  boolean,
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
import { workspaces } from "./workspaces";

export const projectKind = pgEnum("project_kind", [
  "project",
  "subproject",
  "sprint",
]);

export const projectWorkflowMode = pgEnum("project_workflow_mode", [
  "own",
  "inherit",
]);

export const projectVisibility = pgEnum("project_visibility", [
  "internal",
  "client_shared",
  "restricted",
]);

export const workflowStatusCategory = pgEnum("workflow_status_category", [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    parentId: uuid("parent_id"),
    kind: projectKind("kind").notNull(),
    workflowMode: projectWorkflowMode("workflow_mode").notNull(),
    visibility: projectVisibility("visibility").default("internal").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    startDate: timestamp("start_date", { mode: "date", withTimezone: true }),
    targetDate: timestamp("target_date", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    foreignKey({
      name: "projects_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "projects_parent_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.parentId],
      foreignColumns: [table.workspaceId, table.clientId, table.id],
    }).onDelete("cascade"),
    uniqueIndex("projects_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("projects_tenant_client_id_unique").on(
      table.workspaceId,
      table.clientId,
      table.id,
    ),
    uniqueIndex("projects_client_slug_unique").on(table.clientId, table.slug),
    index("projects_parent_position_idx").on(table.parentId, table.position),
    check(
      "projects_root_kind_check",
      sql`(${table.parentId} is null and ${table.kind} = 'project') or (${table.parentId} is not null and ${table.kind} <> 'project')`,
    ),
    check(
      "projects_root_workflow_check",
      sql`${table.parentId} is not null or ${table.workflowMode} = 'own'`,
    ),
  ],
);

export const issueNamespaces = pgTable(
  "issue_namespaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    prefix: text("prefix").notNull(),
    nextNumber: integer("next_number").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "issue_namespaces_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "issue_namespaces_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("cascade"),
    uniqueIndex("issue_namespaces_workspace_prefix_unique").on(
      table.workspaceId,
      table.prefix,
    ),
    uniqueIndex("issue_namespaces_client_default_unique")
      .on(table.clientId)
      .where(sql`${table.projectId} is null`),
    uniqueIndex("issue_namespaces_project_override_unique")
      .on(table.projectId)
      .where(sql`${table.projectId} is not null`),
    check("issue_namespaces_next_number_check", sql`${table.nextNumber} > 0`),
  ],
);

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "workflows_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    uniqueIndex("workflows_project_unique").on(table.projectId),
    uniqueIndex("workflows_workspace_id_unique").on(table.workspaceId, table.id),
  ],
);

export const workflowStatuses = pgTable(
  "workflow_statuses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    workflowId: uuid("workflow_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: workflowStatusCategory("category").notNull(),
    color: text("color").notNull(),
    position: integer("position").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (table) => [
    foreignKey({
      name: "workflow_statuses_workflow_tenant_fk",
      columns: [table.workspaceId, table.workflowId],
      foreignColumns: [workflows.workspaceId, workflows.id],
    }).onDelete("cascade"),
    uniqueIndex("workflow_statuses_workflow_slug_unique").on(
      table.workflowId,
      table.slug,
    ),
    uniqueIndex("workflow_statuses_default_unique")
      .on(table.workflowId)
      .where(sql`${table.isDefault} = true and ${table.archivedAt} is null`),
  ],
);
