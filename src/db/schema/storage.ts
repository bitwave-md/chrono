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

import { users } from "./auth";
import { clients } from "./clients";
import { issues } from "./issues";
import { projects } from "./projects";
import { workspaceMemberships, workspaces } from "./workspaces";

export const storedObjectScope = pgEnum("stored_object_scope", ["personal", "workspace"]);
export const storedObjectState = pgEnum("stored_object_state", ["pending", "ready", "deleted"]);

export const storedObjects = pgTable("stored_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: storedObjectScope("scope").notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256"),
  state: storedObjectState("state").default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  readyAt: timestamp("ready_at", { mode: "date", withTimezone: true }),
  deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
}, (table) => [
  uniqueIndex("stored_objects_key_unique").on(table.objectKey),
  uniqueIndex("stored_objects_workspace_id_unique").on(table.workspaceId, table.id),
  index("stored_objects_owner_state_idx").on(table.ownerUserId, table.state, table.createdAt),
  index("stored_objects_workspace_state_idx").on(table.workspaceId, table.state, table.createdAt),
  check("stored_objects_scope_workspace_check", sql`(${table.scope} = 'personal' and ${table.workspaceId} is null) or (${table.scope} = 'workspace' and ${table.workspaceId} is not null)`),
  check("stored_objects_size_check", sql`${table.sizeBytes} >= 0`),
]);

export const userProfileAssets = pgTable("user_profile_assets", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  avatarObjectId: uuid("avatar_object_id").references(() => storedObjects.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  objectId: uuid("object_id").notNull(),
  uploaderMembershipId: uuid("uploader_membership_id").notNull(),
  clientId: uuid("client_id"),
  projectId: uuid("project_id"),
  issueId: uuid("issue_id"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
}, (table) => [
  uniqueIndex("attachments_workspace_id_unique").on(table.workspaceId, table.id),
  uniqueIndex("attachments_object_unique").on(table.objectId),
  index("attachments_client_created_idx").on(table.clientId, table.createdAt),
  index("attachments_project_created_idx").on(table.projectId, table.createdAt),
  index("attachments_issue_created_idx").on(table.issueId, table.createdAt),
  foreignKey({
    name: "attachments_object_tenant_fk",
    columns: [table.workspaceId, table.objectId],
    foreignColumns: [storedObjects.workspaceId, storedObjects.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "attachments_uploader_tenant_fk",
    columns: [table.workspaceId, table.uploaderMembershipId],
    foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
  }).onDelete("restrict"),
  foreignKey({
    name: "attachments_client_tenant_fk",
    columns: [table.workspaceId, table.clientId],
    foreignColumns: [clients.workspaceId, clients.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "attachments_project_tenant_fk",
    columns: [table.workspaceId, table.projectId],
    foreignColumns: [projects.workspaceId, projects.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "attachments_issue_tenant_fk",
    columns: [table.workspaceId, table.issueId],
    foreignColumns: [issues.workspaceId, issues.id],
  }).onDelete("cascade"),
  check("attachments_exact_target_check", sql`num_nonnulls(${table.clientId}, ${table.projectId}, ${table.issueId}) = 1`),
]);

export const attachmentShareLinks = pgTable("attachment_share_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  attachmentId: uuid("attachment_id").notNull(),
  createdByMembershipId: uuid("created_by_membership_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
  accessCount: integer("access_count").default(0).notNull(),
  lastAccessedAt: timestamp("last_accessed_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("attachment_share_links_token_unique").on(table.tokenHash),
  index("attachment_share_links_attachment_idx").on(table.attachmentId, table.createdAt),
  foreignKey({
    name: "attachment_share_links_attachment_tenant_fk",
    columns: [table.workspaceId, table.attachmentId],
    foreignColumns: [attachments.workspaceId, attachments.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "attachment_share_links_creator_tenant_fk",
    columns: [table.workspaceId, table.createdByMembershipId],
    foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
  }).onDelete("cascade"),
  check("attachment_share_links_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
]);
