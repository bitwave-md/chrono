import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import {
  clients,
  clientMemberships,
  issueNamespaces,
  issues,
  projects,
  projectUpdates,
  users,
  workflows,
  workflowStatuses,
  workspaceMemberships,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { DefaultWorkflowTemplate } from "@/modules/projects/domain/default-workflow-template";
import { IssuePrefix } from "@/modules/projects/domain/issue-prefix";
import { ProjectSlug } from "@/modules/projects/domain/project-slug";
import { WorkspaceMemberService } from "@/modules/workspaces/application/workspace-member-service";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

const projectVisibilities = [
  "internal",
  "client_shared",
  "restricted",
] as const;
const projectPriorities = ["none", "urgent", "high", "medium", "low"] as const;

export type ProjectVisibility = (typeof projectVisibilities)[number];
export type ProjectPriority = (typeof projectPriorities)[number];

export interface CreateProjectInput {
  clientId: string;
  visibility: ProjectVisibility;
  priority: ProjectPriority;
  leadMembershipId: string | null;
  name: string;
  slug: string;
  description: string | null;
  namespacePrefix: string | null;
}

export class ProjectService {
  readonly #clientAccess = new ClientAccessService();
  readonly #policy = new WorkspacePolicy();
  readonly #memberService = new WorkspaceMemberService();
  readonly #workflowTemplate = new DefaultWorkflowTemplate();

  async list(principal: Principal, clientId: string | null) {
    if (clientId) await this.#clientAccess.assertCanRead(principal, clientId);

    const result = await db.execute<{
      id: string;
      client_id: string;
      client_name: string;
      name: string;
      slug: string;
      icon_type: "icon" | "emoji";
      icon_key: string;
      icon_color: string;
      visibility: ProjectVisibility;
      position: number;
      namespace_prefix: string | null;
      effective_namespace_prefix: string;
      workflow_id: string;
      state: "planned" | "active" | "paused" | "completed" | "canceled";
      priority: ProjectPriority;
      target_date: Date | null;
      lead_membership_id: string | null;
      lead_user_id: string | null;
      lead_name: string | null;
      lead_email: string | null;
      lead_avatar_url: string | null;
      health: "on_track" | "at_risk" | "off_track" | null;
      health_updated_at: Date | null;
      issue_count: number;
      completed_issue_count: number;
    }>(sql`
      select
        project.id,
        project.client_id,
        client.name as client_name,
        project.name,
        project.slug,
        project.icon_type,
        project.icon_key,
        project.icon_color,
        project.visibility,
        project.position,
        project_namespace.prefix as namespace_prefix,
        coalesce(project_namespace.prefix, client_namespace.prefix) as effective_namespace_prefix,
        workflow.id as workflow_id,
        project.state,
        project.priority,
        project.target_date,
        lead_membership.id as lead_membership_id,
        lead_user.id as lead_user_id,
        lead_user.name as lead_name,
        lead_user.email as lead_email,
        lead_user.image as lead_avatar_url,
        latest_update.health,
        latest_update.created_at as health_updated_at,
        coalesce(progress.issue_count, 0)::int as issue_count,
        coalesce(progress.completed_issue_count, 0)::int as completed_issue_count
      from ${projects} project
      inner join ${clients} client on client.id = project.client_id
      inner join ${issueNamespaces} client_namespace
        on client_namespace.client_id = project.client_id
        and client_namespace.project_id is null
      left join ${issueNamespaces} project_namespace
        on project_namespace.project_id = project.id
      inner join ${workflows} workflow on workflow.project_id = project.id
      left join ${workspaceMemberships} lead_membership
        on lead_membership.id = project.lead_membership_id
        and lead_membership.workspace_id = project.workspace_id
      left join ${users} lead_user on lead_user.id = lead_membership.user_id
      left join lateral (
        select project_update.health, project_update.created_at
        from ${projectUpdates} project_update
        where project_update.project_id = project.id
          and project_update.workspace_id = project.workspace_id
        order by project_update.created_at desc
        limit 1
      ) latest_update on true
      left join lateral (
        select
          count(issue.id) as issue_count,
          count(issue.id) filter (where status.category = 'completed') as completed_issue_count
        from ${issues} issue
        left join ${workflowStatuses} status on status.id = issue.status_id
        where issue.project_id = project.id
          and issue.workspace_id = project.workspace_id
          and issue.archived_at is null
      ) progress on true
      where project.workspace_id = ${principal.workspaceId}
        and project.archived_at is null
        ${clientId ? sql`and project.client_id = ${clientId}` : sql``}
        ${principal.role === "guest" ? sql`
          and project.visibility = 'client_shared'
          and exists (
            select 1 from ${clientMemberships} access
            where access.client_id = project.client_id
              and access.workspace_membership_id = ${principal.membershipId}
          )
        ` : sql``}
      order by project.name, client.name
    `);

    return result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      name: row.name,
      slug: row.slug,
      iconType: row.icon_type,
      iconKey: row.icon_key,
      iconColor: row.icon_color,
      visibility: row.visibility,
      position: row.position,
      namespacePrefix: row.namespace_prefix,
      effectiveNamespacePrefix: row.effective_namespace_prefix,
      workflowId: row.workflow_id,
      state: row.state,
      priority: row.priority,
      targetDate: row.target_date,
      lead: row.lead_membership_id ? {
        membershipId: row.lead_membership_id,
        userId: row.lead_user_id!,
        displayName: row.lead_name,
        email: row.lead_email!,
        avatarUrl: row.lead_avatar_url,
      } : null,
      health: row.health,
      healthUpdatedAt: row.health_updated_at,
      issueCount: row.issue_count,
      completedIssueCount: row.completed_issue_count,
      progressPercentage: row.issue_count
        ? Math.round((row.completed_issue_count / row.issue_count) * 100)
        : 0,
    }));
  }

  async create(principal: Principal, input: CreateProjectInput) {
    this.#policy.assertCanContribute(principal);
    await this.#clientAccess.assertCanContribute(principal, input.clientId);

    const name = input.name.trim();
    const slug = new ProjectSlug(input.slug).value;
    const namespacePrefix = input.namespacePrefix
      ? new IssuePrefix(input.namespacePrefix).value
      : null;

    if (name.length < 2 || name.length > 160) {
      throw new ValidationError("Project names must contain 2-160 characters.");
    }

    try {
      return await db.transaction(
        async (transaction) => {
          const [client] = await transaction
            .select({ id: clients.id })
            .from(clients)
            .where(
              and(
                eq(clients.id, input.clientId),
                eq(clients.workspaceId, principal.workspaceId),
                isNull(clients.archivedAt),
              ),
            )
            .limit(1);

          if (!client) {
            throw new NotFoundError("Client not found.");
          }

          if (input.leadMembershipId) {
            await this.#memberService.assertActive(
              transaction,
              principal,
              [input.leadMembershipId],
            );
          }

          const [project] = await transaction
            .insert(projects)
            .values({
              workspaceId: principal.workspaceId,
              clientId: input.clientId,
              visibility: input.visibility,
              priority: input.priority,
              leadMembershipId: input.leadMembershipId,
              name,
              slug,
              description: input.description,
            })
            .returning();

          const namespace = namespacePrefix
            ? (
                await transaction
                  .insert(issueNamespaces)
                  .values({
                    workspaceId: principal.workspaceId,
                    clientId: input.clientId,
                    projectId: project.id,
                    prefix: namespacePrefix,
                  })
                  .returning({
                    id: issueNamespaces.id,
                    prefix: issueNamespaces.prefix,
                  })
              )[0]
            : null;

          const [workflow] = await transaction
            .insert(workflows)
            .values({
              workspaceId: principal.workspaceId,
              clientId: input.clientId,
              projectId: project.id,
              name: this.#workflowTemplate.name,
            })
            .returning({ id: workflows.id, name: workflows.name });

          await transaction.insert(workflowStatuses).values(
            this.#workflowTemplate.statuses().map((status) => ({
              workspaceId: principal.workspaceId,
              workflowId: workflow.id,
              ...status,
            })),
          );

          return { project, namespace, workflow };
        },
        { isolationLevel: "serializable", accessMode: "read write" },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "The project slug or issue prefix is already in use.",
        );
      }

      throw error;
    }
  }
}

export { projectPriorities, projectVisibilities };
