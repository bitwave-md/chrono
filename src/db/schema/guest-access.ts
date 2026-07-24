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
import { invitations } from "./workspaces";

export const invitationClientAccess = pgTable(
  "invitation_client_access",
  {
    workspaceId: uuid("workspace_id").notNull(),
    invitationId: uuid("invitation_id").notNull(),
    clientId: uuid("client_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.invitationId, table.clientId] }),
    foreignKey({
      name: "invitation_client_access_invitation_tenant_fk",
      columns: [table.workspaceId, table.invitationId],
      foreignColumns: [invitations.workspaceId, invitations.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "invitation_client_access_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    index("invitation_client_access_workspace_idx").on(table.workspaceId, table.invitationId),
  ],
);

export const invitationProjectExclusions = pgTable(
  "invitation_project_exclusions",
  {
    workspaceId: uuid("workspace_id").notNull(),
    invitationId: uuid("invitation_id").notNull(),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.invitationId, table.projectId] }),
    foreignKey({
      name: "invitation_project_exclusions_invitation_tenant_fk",
      columns: [table.workspaceId, table.invitationId],
      foreignColumns: [invitations.workspaceId, invitations.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "invitation_project_exclusions_client_tenant_fk",
      columns: [table.workspaceId, table.clientId],
      foreignColumns: [clients.workspaceId, clients.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "invitation_project_exclusions_project_tenant_fk",
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete("cascade"),
    uniqueIndex("invitation_project_exclusions_workspace_id_unique").on(table.workspaceId, table.invitationId, table.projectId),
    index("invitation_project_exclusions_client_idx").on(table.workspaceId, table.clientId),
  ],
);
