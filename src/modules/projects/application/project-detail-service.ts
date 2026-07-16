import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import {
  clients,
  issues,
  projectActivityEvents,
  projectAssignees,
  projectMilestones,
  projectResources,
  projects,
  projectUpdates,
  users,
  workflows,
  workflowStatuses,
  workspaceMemberships,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import {
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";
import { WorkspaceMemberService } from "@/modules/workspaces/application/workspace-member-service";

export const projectStates = ["planned", "active", "paused", "completed", "canceled"] as const;
export const projectHealthValues = ["on_track", "at_risk", "off_track"] as const;
export const milestoneStates = ["planned", "active", "completed", "canceled"] as const;

type ProjectState = (typeof projectStates)[number];
type ProjectHealth = (typeof projectHealthValues)[number];
type MilestoneState = (typeof milestoneStates)[number];

export interface UpdateProjectInput {
  state?: ProjectState;
  summary?: string | null;
  description?: string | null;
  visibility?: "internal" | "client_shared" | "restricted";
  startDate?: Date | null;
  targetDate?: Date | null;
  assigneeMembershipIds?: string[];
}

export class ProjectDetailService {
  readonly #clientAccess = new ClientAccessService();
  readonly #memberService = new WorkspaceMemberService();

  async get(principal: Principal, projectId: string) {
    const project = await this.#project(principal, projectId);
    const [assignees, progressRows, latestUpdate, resources, milestones, workflowRows] = await Promise.all([
      this.#assignees(principal.workspaceId, projectId),
      db
        .select({
          total: sql<number>`count(${issues.id})::int`,
          completed: sql<number>`count(${issues.id}) filter (where ${workflowStatuses.category} = 'completed')::int`,
        })
        .from(issues)
        .leftJoin(workflowStatuses, eq(workflowStatuses.id, issues.statusId))
        .where(and(
          eq(issues.workspaceId, principal.workspaceId),
          eq(issues.projectId, projectId),
          isNull(issues.archivedAt),
        )),
      this.#updates(principal.workspaceId, projectId, 1),
      db.select().from(projectResources).where(and(
        eq(projectResources.workspaceId, principal.workspaceId),
        eq(projectResources.projectId, projectId),
      )).orderBy(asc(projectResources.position)),
      db.select().from(projectMilestones).where(and(
        eq(projectMilestones.workspaceId, principal.workspaceId),
        eq(projectMilestones.projectId, projectId),
      )).orderBy(asc(projectMilestones.position)),
      db.execute<{ workflow_id: string }>(sql`
        with recursive ancestry as (
          select ${projects.id}, ${projects.parentId}, 0 as depth
          from ${projects}
          where ${projects.id} = ${projectId}
            and ${projects.workspaceId} = ${principal.workspaceId}
          union all
          select parent.${sql.identifier("id")}, parent.${sql.identifier("parent_id")}, child.depth + 1
          from ${projects} parent
          inner join ancestry child on parent.${sql.identifier("id")} = child.${sql.identifier("parent_id")}
          where parent.${sql.identifier("workspace_id")} = ${principal.workspaceId}
        )
        select workflow.${sql.identifier("id")} as workflow_id
        from ancestry
        inner join ${workflows} workflow on workflow.${sql.identifier("project_id")} = ancestry.${sql.identifier("id")}
        order by ancestry.depth
        limit 1
      `),
    ]);

    const progress = progressRows[0] ?? { total: 0, completed: 0 };
    return {
      ...project,
      effectiveWorkflowId: workflowRows.rows[0]?.workflow_id ?? null,
      assignees,
      progress: {
        total: progress.total,
        completed: progress.completed,
        percentage: progress.total ? Math.round((progress.completed / progress.total) * 100) : 0,
      },
      latestUpdate: latestUpdate[0] ?? null,
      resources,
      milestones,
    };
  }

  async activity(principal: Principal, projectId: string) {
    await this.#project(principal, projectId);
    const [updates, events] = await Promise.all([
      this.#updates(principal.workspaceId, projectId, 100),
      db
        .select({
          id: projectActivityEvents.id,
          eventType: projectActivityEvents.eventType,
          payload: projectActivityEvents.payload,
          createdAt: projectActivityEvents.createdAt,
          actorName: users.name,
          actorEmail: users.email,
        })
        .from(projectActivityEvents)
        .leftJoin(workspaceMemberships, eq(workspaceMemberships.id, projectActivityEvents.actorMembershipId))
        .leftJoin(users, eq(users.id, workspaceMemberships.userId))
        .where(and(
          eq(projectActivityEvents.workspaceId, principal.workspaceId),
          eq(projectActivityEvents.projectId, projectId),
        ))
        .orderBy(desc(projectActivityEvents.createdAt))
        .limit(250),
    ]);

    return { updates, events };
  }

  async update(principal: Principal, projectId: string, input: UpdateProjectInput) {
    const current = await this.#project(principal, projectId);
    await this.#clientAccess.assertCanContribute(principal, current.clientId);

    return db.transaction(async (transaction) => {
      if (input.assigneeMembershipIds) {
        await this.#memberService.assertActive(transaction, principal, input.assigneeMembershipIds);
      }

      const [updated] = await transaction
        .update(projects)
        .set({
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
          ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
          updatedAt: new Date(),
        })
        .where(and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, principal.workspaceId),
        ))
        .returning();

      if (!updated) throw new NotFoundError("Project not found.");

      if (input.assigneeMembershipIds) {
        await this.#replaceAssignees(transaction, principal, projectId, input.assigneeMembershipIds);
      }

      await transaction.insert(projectActivityEvents).values({
        workspaceId: principal.workspaceId,
        projectId,
        actorMembershipId: principal.membershipId,
        eventType: "project.updated",
        payload: Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
      });

      return updated;
    });
  }

  async publishUpdate(
    principal: Principal,
    projectId: string,
    input: { body: string; health: ProjectHealth | null; progress: number | null },
  ) {
    const project = await this.#project(principal, projectId);
    await this.#clientAccess.assertCanContribute(principal, project.clientId);
    const body = input.body.trim();

    if (!body || body.length > 20_000) throw new ValidationError("Update body must contain 1-20,000 characters.");
    if (input.progress !== null && (input.progress < 0 || input.progress > 100)) {
      throw new ValidationError("Progress must be between 0 and 100.");
    }

    const [update] = await db.insert(projectUpdates).values({
      workspaceId: principal.workspaceId,
      projectId,
      authorMembershipId: principal.membershipId,
      body,
      health: input.health,
      progress: input.progress,
    }).returning();

    return update;
  }

  async addResource(
    principal: Principal,
    projectId: string,
    input: { title: string; url: string; description: string | null },
  ) {
    const project = await this.#project(principal, projectId);
    await this.#clientAccess.assertCanContribute(principal, project.clientId);
    let url: URL;
    try { url = new URL(input.url); } catch { throw new ValidationError("Resource URL must be valid."); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new ValidationError("Resource URL must use HTTP or HTTPS.");

    const [resource] = await db.insert(projectResources).values({
      workspaceId: principal.workspaceId,
      projectId,
      title: input.title.trim(),
      url: url.toString(),
      description: input.description,
      createdByMembershipId: principal.membershipId,
    }).returning();
    return resource;
  }

  async addMilestone(
    principal: Principal,
    projectId: string,
    input: { name: string; description: string | null; state: MilestoneState; targetDate: Date | null },
  ) {
    const project = await this.#project(principal, projectId);
    await this.#clientAccess.assertCanContribute(principal, project.clientId);
    const [milestone] = await db.insert(projectMilestones).values({
      workspaceId: principal.workspaceId,
      projectId,
      name: input.name.trim(),
      description: input.description,
      state: input.state,
      targetDate: input.targetDate,
    }).returning();
    return milestone;
  }

  async #project(principal: Principal, projectId: string) {
    const [project] = await db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        clientId: projects.clientId,
        clientName: clients.name,
        parentId: projects.parentId,
        kind: projects.kind,
        name: projects.name,
        slug: projects.slug,
        summary: projects.summary,
        description: projects.description,
        state: projects.state,
        visibility: projects.visibility,
        startDate: projects.startDate,
        targetDate: projects.targetDate,
        workflowMode: projects.workflowMode,
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, principal.workspaceId),
        isNull(projects.archivedAt),
        principal.role === "guest" ? eq(projects.visibility, "client_shared") : undefined,
      ))
      .limit(1);

    if (!project) throw new NotFoundError("Project not found.");
    await this.#clientAccess.assertCanRead(principal, project.clientId);
    return project;
  }

  async #assignees(workspaceId: string, projectId: string) {
    return db
      .select({
        membershipId: workspaceMemberships.id,
        userId: users.id,
        displayName: users.name,
        email: users.email,
        avatarUrl: users.image,
      })
      .from(projectAssignees)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, projectAssignees.membershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(projectAssignees.workspaceId, workspaceId),
        eq(projectAssignees.projectId, projectId),
      ));
  }

  async #updates(workspaceId: string, projectId: string, limit: number) {
    return db
      .select({
        id: projectUpdates.id,
        body: projectUpdates.body,
        health: projectUpdates.health,
        progress: projectUpdates.progress,
        createdAt: projectUpdates.createdAt,
        authorName: users.name,
        authorEmail: users.email,
        authorAvatarUrl: users.image,
      })
      .from(projectUpdates)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, projectUpdates.authorMembershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(projectUpdates.workspaceId, workspaceId),
        eq(projectUpdates.projectId, projectId),
      ))
      .orderBy(desc(projectUpdates.createdAt))
      .limit(limit);
  }

  async #replaceAssignees(
    transaction: DatabaseTransaction,
    principal: Principal,
    projectId: string,
    membershipIds: string[],
  ) {
    await transaction.delete(projectAssignees).where(and(
      eq(projectAssignees.workspaceId, principal.workspaceId),
      eq(projectAssignees.projectId, projectId),
    ));

    if (membershipIds.length) {
      await transaction.insert(projectAssignees).values(membershipIds.map((membershipId) => ({
        workspaceId: principal.workspaceId,
        projectId,
        membershipId,
        createdByMembershipId: principal.membershipId,
      })));
    }
  }
}
