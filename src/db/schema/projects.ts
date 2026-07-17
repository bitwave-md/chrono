import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clientIconType, clients } from "./clients";
import { workspaceMemberships, workspaces } from "./workspaces";

export const projectVisibility = pgEnum("project_visibility", [
  "internal",
  "client_shared",
  "restricted",
]);

export const projectState = pgEnum("project_state", [
  "planned",
  "active",
  "paused",
  "completed",
  "canceled",
]);

export const projectPriority = pgEnum("project_priority", [
  "none",
  "urgent",
  "high",
  "medium",
  "low",
]);

export const projectBranchKind = pgEnum("project_branch_kind", [
  "feature",
  "sprint",
  "refactor",
  "release",
  "other",
]);

export const projectBranchState = pgEnum("project_branch_state", [
  "planned",
  "active",
  "completed",
  "canceled",
]);

export const projectHealth = pgEnum("project_health", [
  "on_track",
  "at_risk",
  "off_track",
]);

export const milestoneState = pgEnum("milestone_state", [
  "planned",
  "active",
  "completed",
  "canceled",
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
    visibility: projectVisibility("visibility").default("internal").notNull(),
    state: projectState("state").default("planned").notNull(),
    priority: projectPriority("priority").default("none").notNull(),
    leadMembershipId: uuid("lead_membership_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    iconType: clientIconType("icon_type").default("icon").notNull(),
    iconKey: text("icon_key").default("folder-kanban").notNull(),
    iconColor: text("icon_color").default("#8b5cf6").notNull(),
    summary: text("summary"),
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
      name: "projects_lead_membership_tenant_fk",
      columns: [table.workspaceId, table.leadMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    uniqueIndex("projects_workspace_id_unique").on(table.workspaceId, table.id),
    uniqueIndex("projects_tenant_client_id_unique").on(
      table.workspaceId,
      table.clientId,
      table.id,
    ),
    uniqueIndex("projects_client_slug_unique").on(table.clientId, table.slug),
    index("projects_client_position_idx").on(table.clientId, table.position),
    index("projects_lead_membership_idx").on(
      table.workspaceId,
      table.leadMembershipId,
    ),
    check(
      "projects_icon_color_check",
      sql`${table.iconColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
  ],
);

export const projectBranches = pgTable(
  "project_branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: projectBranchKind("kind").default("feature").notNull(),
    state: projectBranchState("state").default("planned").notNull(),
    summary: text("summary"),
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
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "project_branches_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("cascade"),
    uniqueIndex("project_branches_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("project_branches_tenant_project_id_unique").on(
      table.workspaceId,
      table.clientId,
      table.projectId,
      table.id,
    ),
    uniqueIndex("project_branches_project_slug_unique").on(
      table.projectId,
      table.slug,
    ),
    index("project_branches_project_position_idx").on(
      table.projectId,
      table.position,
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
    uniqueIndex("issue_namespaces_tenant_client_id_unique").on(
      table.workspaceId,
      table.clientId,
      table.id,
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
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
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
      name: "workflows_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "workflows_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("cascade"),
    uniqueIndex("workflows_client_default_unique")
      .on(table.clientId)
      .where(sql`${table.projectId} is null`),
    uniqueIndex("workflows_project_unique")
      .on(table.projectId)
      .where(sql`${table.projectId} is not null`),
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
    uniqueIndex("workflow_statuses_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("workflow_statuses_default_unique")
      .on(table.workflowId)
      .where(sql`${table.isDefault} = true and ${table.archivedAt} is null`),
  ],
);

export const projectAssignees = pgTable(
  "project_assignees",
  {
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    createdByMembershipId: uuid("created_by_membership_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_assignees_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_assignees_membership_tenant_fk",
      columns: [table.workspaceId, table.membershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_assignees_creator_tenant_fk",
      columns: [table.workspaceId, table.createdByMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    uniqueIndex("project_assignees_project_membership_unique").on(
      table.projectId,
      table.membershipId,
    ),
    index("project_assignees_membership_idx").on(
      table.workspaceId,
      table.membershipId,
    ),
  ],
);

export const projectUpdates = pgTable(
  "project_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    authorMembershipId: uuid("author_membership_id").notNull(),
    body: text("body").notNull(),
    health: projectHealth("health"),
    progress: integer("progress"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_updates_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_updates_author_tenant_fk",
      columns: [table.workspaceId, table.authorMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    index("project_updates_project_created_idx").on(table.projectId, table.createdAt),
    check(
      "project_updates_progress_check",
      sql`${table.progress} is null or (${table.progress} >= 0 and ${table.progress} <= 100)`,
    ),
  ],
);

export const projectActivityEvents = pgTable(
  "project_activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    actorMembershipId: uuid("actor_membership_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_activity_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_activity_actor_tenant_fk",
      columns: [table.workspaceId, table.actorMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("set null"),
    index("project_activity_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const projectResources = pgTable(
  "project_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    createdByMembershipId: uuid("created_by_membership_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_resources_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_resources_creator_tenant_fk",
      columns: [table.workspaceId, table.createdByMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    index("project_resources_project_position_idx").on(table.projectId, table.position),
  ],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    state: milestoneState("state").default("planned").notNull(),
    position: integer("position").default(0).notNull(),
    targetDate: timestamp("target_date", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_milestones_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    index("project_milestones_project_position_idx").on(table.projectId, table.position),
  ],
);
