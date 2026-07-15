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

export const teamRole = pgEnum("team_role", ["lead", "member"]);

export const teams = pgTable(
  "teams",
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
    uniqueIndex("teams_workspace_key_unique").on(table.workspaceId, table.key),
    uniqueIndex("teams_workspace_id_unique").on(table.workspaceId, table.id),
  ],
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    workspaceId: uuid("workspace_id").notNull(),
    teamId: uuid("team_id").notNull(),
    workspaceMembershipId: uuid("workspace_membership_id").notNull(),
    role: teamRole("role").default("member").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.workspaceMembershipId] }),
    foreignKey({
      name: "team_memberships_team_tenant_fk",
      columns: [table.workspaceId, table.teamId],
      foreignColumns: [teams.workspaceId, teams.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "team_memberships_workspace_membership_tenant_fk",
      columns: [table.workspaceId, table.workspaceMembershipId],
      foreignColumns: [
        workspaceMemberships.workspaceId,
        workspaceMemberships.id,
      ],
    }).onDelete("cascade"),
    index("team_memberships_membership_idx").on(table.workspaceMembershipId),
  ],
);
