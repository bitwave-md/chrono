import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  clients,
  issueNamespaces,
  issues,
  projects,
  teams,
  users,
  workflowStatuses,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueContextResolver } from "@/modules/issues/application/issue-context-resolver";
import { IssueRelationValidator } from "@/modules/issues/application/issue-relation-validator";
import { IssueStatusMapper } from "@/modules/issues/application/issue-status-mapper";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";

const issuePriorities = ["none", "urgent", "high", "medium", "low"] as const;
const issueVisibilities = [
  "internal",
  "client_shared",
  "restricted",
] as const;

export type IssuePriority = (typeof issuePriorities)[number];
export type IssueVisibility = (typeof issueVisibilities)[number];

export interface CreateIssueInput {
  clientId: string;
  projectId: string | null;
  teamId: string | null;
  assigneeId: string | null;
  statusId: string | null;
  parentIssueId: string | null;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
}

export interface IssueFilters {
  projectId?: string;
  teamId?: string;
  assigneeId?: string;
}

export interface UpdateIssueInput {
  expectedVersion: number;
  projectId?: string | null;
  teamId?: string | null;
  assigneeId?: string | null;
  statusId?: string | null;
  title?: string;
  priority?: IssuePriority;
  visibility?: IssueVisibility;
}

export class IssueService {
  readonly #clientAccess = new ClientAccessService();
  readonly #contextResolver = new IssueContextResolver();
  readonly #relationValidator = new IssueRelationValidator();
  readonly #statusMapper = new IssueStatusMapper();

  async list(
    principal: Principal,
    clientId: string,
    filters: IssueFilters,
  ) {
    await this.#clientAccess.assertCanRead(principal, clientId);

    const conditions = [
      eq(issues.workspaceId, principal.workspaceId),
      eq(issues.clientId, clientId),
      isNull(issues.archivedAt),
    ];

    if (filters.projectId) {
      conditions.push(eq(issues.projectId, filters.projectId));
    }

    if (filters.teamId) {
      conditions.push(eq(issues.teamId, filters.teamId));
    }

    if (filters.assigneeId) {
      conditions.push(eq(issues.assigneeId, filters.assigneeId));
    }

    if (principal.role === "guest") {
      conditions.push(
        or(
          eq(issues.visibility, "client_shared"),
          eq(issues.assigneeId, principal.userId),
        )!,
      );
    }

    return db
      .select({
        id: issues.id,
        identifier:
          sql<string>`${issueNamespaces.prefix} || '-' || ${issues.number}`.as(
            "identifier",
          ),
        title: issues.title,
        description: issues.description,
        priority: issues.priority,
        visibility: issues.visibility,
        projectId: issues.projectId,
        projectName: projects.name,
        teamId: issues.teamId,
        teamName: teams.name,
        assigneeId: issues.assigneeId,
        assigneeName: users.name,
        statusId: issues.statusId,
        statusName: workflowStatuses.name,
        version: issues.version,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .innerJoin(
        issueNamespaces,
        eq(issueNamespaces.id, issues.issueNamespaceId),
      )
      .leftJoin(projects, eq(projects.id, issues.projectId))
      .leftJoin(teams, eq(teams.id, issues.teamId))
      .leftJoin(users, eq(users.id, issues.assigneeId))
      .leftJoin(workflowStatuses, eq(workflowStatuses.id, issues.statusId))
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt));
  }

  async create(principal: Principal, input: CreateIssueInput) {
    await this.#clientAccess.assertCanContribute(principal, input.clientId);

    const title = input.title.trim();

    if (title.length < 2 || title.length > 240) {
      throw new ValidationError("Issue titles must contain 2-240 characters.");
    }

    return db.transaction(
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

        await this.#relationValidator.assertTeam(
          transaction,
          principal,
          input.teamId,
        );
        await this.#relationValidator.assertAssignee(
          transaction,
          principal,
          input.assigneeId,
        );
        await this.#relationValidator.assertParentIssue(
          transaction,
          principal,
          input.clientId,
          input.parentIssueId,
        );

        const context = await this.#contextResolver.resolve(
          transaction,
          principal,
          input.clientId,
          input.projectId,
        );

        const statusId = await this.#contextResolver.resolveStatus(
          transaction,
          context.workflow_id,
          input.statusId,
        );

        const [incrementedNamespace] = await transaction
          .update(issueNamespaces)
          .set({
            nextNumber: sql`${issueNamespaces.nextNumber} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(issueNamespaces.id, context.namespace_id))
          .returning({ nextNumber: issueNamespaces.nextNumber });

        if (!incrementedNamespace) {
          throw new ConflictError("The issue namespace could not be allocated.");
        }

        const number = incrementedNamespace.nextNumber - 1;
        const [issue] = await transaction
          .insert(issues)
          .values({
            workspaceId: principal.workspaceId,
            clientId: input.clientId,
            projectId: input.projectId,
            teamId: input.teamId,
            assigneeId: input.assigneeId,
            statusId,
            issueNamespaceId: context.namespace_id,
            number,
            title,
            description: input.description,
            priority: input.priority,
            visibility: input.visibility,
            creatorMembershipId: principal.membershipId,
            parentIssueId: input.parentIssueId,
            rank: number.toString().padStart(12, "0"),
          })
          .returning();

        return {
          issue,
          identifier: `${context.prefix}-${number}`,
        };
      },
      { isolationLevel: "serializable", accessMode: "read write" },
    );
  }

  async update(
    principal: Principal,
    issueId: string,
    input: UpdateIssueInput,
  ) {
    const [snapshot] = await db
      .select({ clientId: issues.clientId })
      .from(issues)
      .where(
        and(
          eq(issues.id, issueId),
          eq(issues.workspaceId, principal.workspaceId),
          isNull(issues.archivedAt),
        ),
      )
      .limit(1);

    if (!snapshot) {
      throw new NotFoundError("Issue not found.");
    }

    await this.#clientAccess.assertCanContribute(principal, snapshot.clientId);

    return db.transaction(
      async (transaction) => {
        const [current] = await transaction
          .select()
          .from(issues)
          .where(
            and(
              eq(issues.id, issueId),
              eq(issues.workspaceId, principal.workspaceId),
              isNull(issues.archivedAt),
            ),
          )
          .limit(1);

        if (!current) {
          throw new NotFoundError("Issue not found.");
        }

        const projectId =
          input.projectId === undefined ? current.projectId : input.projectId;
        const teamId = input.teamId === undefined ? current.teamId : input.teamId;
        const assigneeId =
          input.assigneeId === undefined
            ? current.assigneeId
            : input.assigneeId;

        await this.#relationValidator.assertTeam(transaction, principal, teamId);
        await this.#relationValidator.assertAssignee(
          transaction,
          principal,
          assigneeId,
        );

        const projectChanged = projectId !== current.projectId;
        let statusId = current.statusId;

        if (projectChanged || input.statusId !== undefined) {
          const context = await this.#contextResolver.resolve(
            transaction,
            principal,
            current.clientId,
            projectId,
          );

          if (!context.workflow_id) {
            if (input.statusId) {
              throw new ValidationError(
                "Client-backlog issues cannot have a workflow status.",
              );
            }

            statusId = null;
          } else if (input.statusId !== undefined) {
            if (!input.statusId) {
              throw new ValidationError(
                "Project issues require a workflow status.",
              );
            }

            statusId = await this.#contextResolver.resolveStatus(
              transaction,
              context.workflow_id,
              input.statusId,
            );
          } else if (projectChanged) {
            statusId = await this.#statusMapper.map(
              transaction,
              current.statusId,
              context.workflow_id,
            );
          }
        }

        const title = input.title?.trim();

        if (title !== undefined && (title.length < 2 || title.length > 240)) {
          throw new ValidationError(
            "Issue titles must contain 2-240 characters.",
          );
        }

        const [updated] = await transaction
          .update(issues)
          .set({
            projectId,
            teamId,
            assigneeId,
            statusId,
            ...(title !== undefined ? { title } : {}),
            ...(input.priority !== undefined
              ? { priority: input.priority }
              : {}),
            ...(input.visibility !== undefined
              ? { visibility: input.visibility }
              : {}),
            version: sql`${issues.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(issues.id, current.id),
              eq(issues.version, input.expectedVersion),
            ),
          )
          .returning();

        if (!updated) {
          throw new ConflictError(
            "The issue changed since it was loaded. Refresh and retry.",
          );
        }

        const [namespace] = await transaction
          .select({ prefix: issueNamespaces.prefix })
          .from(issueNamespaces)
          .where(eq(issueNamespaces.id, updated.issueNamespaceId))
          .limit(1);

        return {
          issue: updated,
          identifier: `${namespace.prefix}-${updated.number}`,
        };
      },
      { isolationLevel: "serializable", accessMode: "read write" },
    );
  }

}

export { issuePriorities, issueVisibilities };
