import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
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
