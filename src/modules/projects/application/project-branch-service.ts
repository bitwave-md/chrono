import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import {
  issues,
  projectBranches,
  projects,
  workflowStatuses,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { ProjectSlug } from "@/modules/projects/domain/project-slug";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

export const projectBranchKinds = [
  "feature",
  "sprint",
  "refactor",
  "release",
  "other",
] as const;

export const projectBranchStates = [
  "planned",
  "active",
  "completed",
  "canceled",
] as const;

type BranchKind = (typeof projectBranchKinds)[number];
type BranchState = (typeof projectBranchStates)[number];

export interface CreateProjectBranchInput {
  name: string;
  slug: string;
  kind: BranchKind;
  state: BranchState;
  summary: string | null;
  description: string | null;
  startDate: Date | null;
  targetDate: Date | null;
}

export interface UpdateProjectBranchInput {
  name?: string;
  slug?: string;
  kind?: BranchKind;
  state?: BranchState;
  summary?: string | null;
  description?: string | null;
  startDate?: Date | null;
  targetDate?: Date | null;
  archived?: boolean;
}

export class ProjectBranchService {
  readonly #clientAccess = new ClientAccessService();

  async list(principal: Principal, projectId: string) {
    await this.#project(principal, projectId, false);

    return db
      .select({
        id: projectBranches.id,
        projectId: projectBranches.projectId,
        name: projectBranches.name,
        slug: projectBranches.slug,
        kind: projectBranches.kind,
        state: projectBranches.state,
        summary: projectBranches.summary,
        description: projectBranches.description,
        position: projectBranches.position,
        startDate: projectBranches.startDate,
        targetDate: projectBranches.targetDate,
        totalIssues: sql<number>`count(${issues.id})::int`,
        completedIssues:
          sql<number>`count(${issues.id}) filter (where ${workflowStatuses.category} = 'completed')::int`,
      })
      .from(projectBranches)
      .leftJoin(
        issues,
        and(
          eq(issues.branchId, projectBranches.id),
          isNull(issues.archivedAt),
        ),
      )
      .leftJoin(workflowStatuses, eq(workflowStatuses.id, issues.statusId))
      .where(
        and(
          eq(projectBranches.workspaceId, principal.workspaceId),
          eq(projectBranches.projectId, projectId),
          isNull(projectBranches.archivedAt),
        ),
      )
      .groupBy(projectBranches.id)
      .orderBy(asc(projectBranches.position), asc(projectBranches.name));
  }

  async create(
    principal: Principal,
    projectId: string,
    input: CreateProjectBranchInput,
  ) {
    const project = await this.#project(principal, projectId, true);
    const values = this.#normalized(input);

    try {
      const [branch] = await db
        .insert(projectBranches)
        .values({
          workspaceId: principal.workspaceId,
          clientId: project.clientId,
          projectId,
          ...values,
          name: values.name!,
          slug: values.slug!,
        })
        .returning();

      return branch;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("This Project already has a Branch with that slug.");
      }
      throw error;
    }
  }

  async update(
    principal: Principal,
    projectId: string,
    branchId: string,
    input: UpdateProjectBranchInput,
  ) {
    await this.#project(principal, projectId, true);
    const values = this.#normalized(input);

    try {
      const [branch] = await db
        .update(projectBranches)
        .set({
          ...values,
          ...(input.archived !== undefined
            ? { archivedAt: input.archived ? new Date() : null }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectBranches.id, branchId),
            eq(projectBranches.workspaceId, principal.workspaceId),
            eq(projectBranches.projectId, projectId),
          ),
        )
        .returning();

      if (!branch) throw new NotFoundError("Branch not found.");
      return branch;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("This Project already has a Branch with that slug.");
      }
      throw error;
    }
  }

  #normalized(input: CreateProjectBranchInput | UpdateProjectBranchInput) {
    const name = input.name?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 160)) {
      throw new ValidationError("Branch names must contain 2-160 characters.");
    }

    if (input.startDate && input.targetDate && input.startDate > input.targetDate) {
      throw new ValidationError("Branch start date must not follow its target date.");
    }

    return {
      ...(name !== undefined ? { name } : {}),
      ...(input.slug !== undefined
        ? { slug: new ProjectSlug(input.slug).value }
        : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
    };
  }

  async #project(principal: Principal, projectId: string, contribute: boolean) {
    const [project] = await db
      .select({ id: projects.id, clientId: projects.clientId })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, principal.workspaceId),
          isNull(projects.archivedAt),
          principal.role === "guest"
            ? eq(projects.visibility, "client_shared")
            : undefined,
        ),
      )
      .limit(1);

    if (!project) throw new NotFoundError("Project not found.");
    if (contribute) {
      await this.#clientAccess.assertCanContribute(principal, project.clientId);
    } else {
      await this.#clientAccess.assertCanRead(principal, project.clientId);
    }
    return project;
  }
}
