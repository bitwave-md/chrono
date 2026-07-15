import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const workspaceRole = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "guest",
]);

export const membershipStatus = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
  (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull(),
    status: membershipStatus("status").default("active").notNull(),
    joinedAt: timestamp("joined_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_memberships_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
    uniqueIndex("workspace_memberships_workspace_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("workspace_memberships_tenant_id_user_unique").on(
      table.workspaceId,
      table.id,
      table.userId,
    ),
    index("workspace_memberships_user_status_idx").on(
      table.userId,
      table.status,
    ),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    emailNormalized: text("email_normalized").notNull(),
    role: workspaceRole("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true })
      .notNull(),
    acceptedAt: timestamp("accepted_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("invitations_token_hash_unique").on(table.tokenHash),
    index("invitations_workspace_email_idx").on(
      table.workspaceId,
      table.emailNormalized,
    ),
  ],
);
