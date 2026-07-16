import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { workspaceMemberships, workspaces } from "./workspaces";

export const clientPermission = pgEnum("client_permission", [
  "view",
  "comment",
  "contribute",
]);

export const clientIconType = pgEnum("client_icon_type", ["icon", "emoji"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(),
    description: text("description"),
    iconType: clientIconType("icon_type").default("icon").notNull(),
    iconKey: text("icon_key").default("hash").notNull(),
    iconColor: text("icon_color").default("#6366f1").notNull(),
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
    uniqueIndex("clients_workspace_key_unique").on(
      table.workspaceId,
      table.key,
    ),
    uniqueIndex("clients_workspace_id_unique").on(table.workspaceId, table.id),
    index("clients_workspace_active_idx")
      .on(table.workspaceId, table.name)
      .where(sql`${table.archivedAt} is null`),
    check(
      "clients_icon_color_check",
      sql`${table.iconColor} ~ '^#[0-9A-Fa-f]{6}$'`,
    ),
  ],
);

export const clientMemberships = pgTable(
  "client_memberships",
  {
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    workspaceMembershipId: uuid("workspace_membership_id").notNull(),
    permission: clientPermission("permission").default("view").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clientId, table.workspaceMembershipId] }),
    foreignKey({
      name: "client_memberships_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "client_memberships_workspace_membership_tenant_fk",
      columns: [table.workspaceId, table.workspaceMembershipId],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.id,
      ],
    }).onDelete("cascade"),
    index("client_memberships_membership_idx").on(
      table.workspaceMembershipId,
    ),
  ],
);

export const clientResources = pgTable(
  "client_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    iconKey: text("icon_key"),
    position: integer("position").default(0).notNull(),
    createdByMembershipId: uuid("created_by_membership_id").notNull(),
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
      name: "client_resources_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "client_resources_creator_tenant_fk",
      columns: [table.workspaceId, table.createdByMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    uniqueIndex("client_resources_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    index("client_resources_client_position_idx").on(
      table.clientId,
      table.position,
    ),
  ],
);
