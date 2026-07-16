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

import { issues } from "./issues";
import { projects } from "./projects";
import { workspaceMemberships, workspaces } from "./workspaces";

export const timeLogSource = pgEnum("time_log_source", ["timer", "manual"]);

export const timeCategories = pgTable(
  "time_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(),
    color: text("color"),
    defaultBillable: boolean("default_billable").default(false).notNull(),
    position: integer("position").default(0).notNull(),
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
    uniqueIndex("time_categories_workspace_key_unique").on(
      table.workspaceId,
      table.key,
    ),
    uniqueIndex("time_categories_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    index("time_categories_workspace_position_idx").on(
      table.workspaceId,
      table.position,
    ),
    check("time_categories_position_check", sql`${table.position} >= 0`),
  ],
);

export const timerSessions = pgTable(
  "timer_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull(),
    workerMembershipId: uuid("worker_membership_id").notNull(),
    workerUserId: text("worker_user_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    rootProjectId: uuid("root_project_id"),
    categoryId: uuid("category_id"),
    note: text("note"),
    billable: boolean("billable").default(false).notNull(),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    stoppedAt: timestamp("stopped_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "timer_sessions_issue_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.clientId, issues.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "timer_sessions_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "timer_sessions_root_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.rootProjectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "timer_sessions_category_tenant_fk",
      columns: [table.workspaceId, table.categoryId],
      foreignColumns: [timeCategories.workspaceId, timeCategories.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "timer_sessions_worker_membership_fk",
      columns: [
        table.workspaceId,
        table.workerMembershipId,
        table.workerUserId,
      ],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.id,
        workspaceMemberships.userId,
      ],
    }).onDelete("restrict"),
    uniqueIndex("timer_sessions_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("timer_sessions_worker_active_unique")
      .on(table.workerUserId)
      .where(sql`${table.stoppedAt} is null`),
    index("timer_sessions_workspace_worker_started_idx").on(
      table.workspaceId,
      table.workerUserId,
      table.startedAt,
    ),
    check(
      "timer_sessions_stopped_after_started_check",
      sql`${table.stoppedAt} is null or ${table.stoppedAt} >= ${table.startedAt}`,
    ),
  ],
);

export const timeLogs = pgTable(
  "time_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull(),
    timerSessionId: uuid("timer_session_id"),
    workerMembershipId: uuid("worker_membership_id").notNull(),
    workerUserId: text("worker_user_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    rootProjectId: uuid("root_project_id"),
    categoryId: uuid("category_id"),
    source: timeLogSource("source").notNull(),
    note: text("note"),
    billable: boolean("billable").default(false).notNull(),
    startedAt: timestamp("started_at", { mode: "date", withTimezone: true })
      .notNull(),
    endedAt: timestamp("ended_at", { mode: "date", withTimezone: true })
      .notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    version: integer("version").default(1).notNull(),
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
      name: "time_logs_issue_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.issueId],
      foreignColumns: [issues.workspaceId, issues.clientId, issues.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "time_logs_timer_session_tenant_fk",
      columns: [table.workspaceId, table.timerSessionId],
      foreignColumns: [timerSessions.workspaceId, timerSessions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "time_logs_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "time_logs_root_project_tenant_client_fk",
      columns: [table.workspaceId, table.clientId, table.rootProjectId],
      foreignColumns: [projects.workspaceId, projects.clientId, projects.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "time_logs_category_tenant_fk",
      columns: [table.workspaceId, table.categoryId],
      foreignColumns: [timeCategories.workspaceId, timeCategories.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "time_logs_worker_membership_fk",
      columns: [
        table.workspaceId,
        table.workerMembershipId,
        table.workerUserId,
      ],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.id,
        workspaceMemberships.userId,
      ],
    }).onDelete("restrict"),
    uniqueIndex("time_logs_timer_session_unique")
      .on(table.timerSessionId)
      .where(sql`${table.timerSessionId} is not null`),
    index("time_logs_workspace_started_idx").on(
      table.workspaceId,
      table.startedAt,
    ),
    index("time_logs_client_started_idx").on(table.clientId, table.startedAt),
    index("time_logs_project_started_idx").on(
      table.projectId,
      table.startedAt,
    ),
    index("time_logs_root_project_started_idx").on(
      table.rootProjectId,
      table.startedAt,
    ),
    index("time_logs_worker_started_idx").on(
      table.workerUserId,
      table.startedAt,
    ),
    index("time_logs_category_started_idx").on(
      table.categoryId,
      table.startedAt,
    ),
    check("time_logs_duration_check", sql`${table.durationSeconds} > 0`),
    check("time_logs_version_check", sql`${table.version} > 0`),
    check(
      "time_logs_ended_after_started_check",
      sql`${table.endedAt} > ${table.startedAt}`,
    ),
  ],
);
