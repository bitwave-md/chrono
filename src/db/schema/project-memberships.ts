import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clients } from "./clients";
import { projects } from "./projects";
import { workspaceMemberships } from "./workspaces";

export const projectMemberships = pgTable(
  "project_memberships",
  {
    workspaceId: uuid("workspace_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id").notNull(),
    workspaceMembershipId: uuid("workspace_membership_id").notNull(),
    addedByMembershipId: uuid("added_by_membership_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.workspaceMembershipId] }),
    foreignKey({
      name: "project_memberships_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_memberships_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_memberships_member_tenant_fk",
      columns: [table.workspaceId, table.workspaceMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_memberships_adder_tenant_fk",
      columns: [table.workspaceId, table.addedByMembershipId],
      foreignColumns: [workspaceMemberships.workspaceId, workspaceMemberships.id],
    }).onDelete("restrict"),
    uniqueIndex("project_memberships_workspace_id_unique").on(
      table.workspaceId,
      table.projectId,
      table.workspaceMembershipId,
    ),
    index("project_memberships_member_idx").on(table.workspaceId, table.workspaceMembershipId),
    index("project_memberships_client_idx").on(table.workspaceId, table.clientId),
  ],
);
