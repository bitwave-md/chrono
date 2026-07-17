import { and, desc, eq, exists, inArray, isNull, or, sql } from "drizzle-orm";

import { db, type DatabaseTransaction } from "@/db/client";
import {
  clientMemberships,
  clients,
  issueAssignees,
  issueNamespaces,
  issueLabels,
  issues,
  issueTypes,
  labels,
  projectBranches,
  projects,
  users,
  workflowStatuses,
  workspaceMemberships,
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
const issueVisibilities = ["internal", "client_shared", "restricted"] as const;

export type IssuePriority = (typeof issuePriorities)[number];
export type IssueVisibility = (typeof issueVisibilities)[number];

export interface CreateIssueInput {
  clientId: string;
  projectId: string | null;
  branchId: string | null;
  assigneeMembershipIds: string[];
  statusId: string | null;
  parentIssueId: string | null;
  title: string;
  description: string | null;
  priority: IssuePriority;
  visibility: IssueVisibility;
}

export interface IssueFilters {
  issueId?: string;
  projectId?: string;
  branchId?: string;
  mainBranch?: boolean;
  assigneeMembershipId?: string;
  mine?: boolean;
}

export interface UpdateIssueInput {
  expectedVersion: number;
  projectId?: string | null;
  branchId?: string | null;
  assigneeMembershipIds?: string[];
  statusId?: string | null;
  issueTypeId?: string | null;
  title?: string;
  description?: string | null;
  priority?: IssuePriority;
  visibility?: IssueVisibility;
  estimateMinutes?: number | null;
  dueAt?: Date | null;
}

export class IssueService {
  readonly #clientAccess = new ClientAccessService();
  readonly #contextResolver = new IssueContextResolver();
  readonly #relationValidator = new IssueRelationValidator();
  readonly #statusMapper = new IssueStatusMapper();

  async list(
    principal: Principal,
    clientId: string | null,
    filters: IssueFilters,
  ) {
    if (clientId) {
      await this.#clientAccess.assertCanRead(principal, clientId);
    }

    const conditions = [
      eq(issues.workspaceId, principal.workspaceId),
      isNull(issues.archivedAt),
    ];

    if (clientId) conditions.push(eq(issues.clientId, clientId));
    if (filters.issueId) conditions.push(eq(issues.id, filters.issueId));
    if (filters.projectId) conditions.push(eq(issues.projectId, filters.projectId));
    if (filters.branchId) conditions.push(eq(issues.branchId, filters.branchId));
    if (filters.mainBranch) conditions.push(isNull(issues.branchId));

    const assigneeMembershipId = filters.mine
      ? principal.membershipId
      : filters.assigneeMembershipId;

    if (assigneeMembershipId) {
      conditions.push(
        exists(
          db
            .select({ value: sql`1` })
            .from(issueAssignees)
            .where(
              and(
                eq(issueAssignees.issueId, issues.id),
                eq(issueAssignees.membershipId, assigneeMembershipId),
              ),
            ),
        ),
      );
    }

    if (principal.role === "guest") {
      conditions.push(
        exists(
          db
            .select({ value: sql`1` })
            .from(clientMemberships)
            .where(
              and(
                eq(clientMemberships.clientId, issues.clientId),
                eq(clientMemberships.workspaceMembershipId, principal.membershipId),
              ),
            ),
        ),
        or(
          eq(issues.visibility, "client_shared"),
          exists(
            db
              .select({ value: sql`1` })
              .from(issueAssignees)
              .where(
                and(
                  eq(issueAssignees.issueId, issues.id),
                  eq(issueAssignees.membershipId, principal.membershipId),
                ),
              ),
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id: issues.id,
        clientId: issues.clientId,
        clientName: clients.name,
        identifier: sql<string>`${issueNamespaces.prefix} || '-' || ${issues.number}`.as("identifier"),
        title: issues.title,
        description: issues.description,
        priority: issues.priority,
        visibility: issues.visibility,
        projectId: issues.projectId,
        projectName: projects.name,
        branchId: issues.branchId,
        branchName: projectBranches.name,
        issueTypeId: issues.issueTypeId,
        issueTypeName: issueTypes.name,
        issueTypeColor: issueTypes.color,
        statusId: issues.statusId,
        statusName: workflowStatuses.name,
        statusColor: workflowStatuses.color,
        estimateMinutes: issues.estimateMinutes,
        dueAt: issues.dueAt,
        version: issues.version,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .innerJoin(clients, eq(clients.id, issues.clientId))
      .innerJoin(issueNamespaces, eq(issueNamespaces.id, issues.issueNamespaceId))
      .leftJoin(projects, eq(projects.id, issues.projectId))
      .leftJoin(projectBranches, eq(projectBranches.id, issues.branchId))
      .leftJoin(issueTypes, eq(issueTypes.id, issues.issueTypeId))
      .leftJoin(workflowStatuses, eq(workflowStatuses.id, issues.statusId))
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt));

    return this.#attachAssignees(principal.workspaceId, rows);
  }

  async get(principal: Principal, issueId: string) {
    const [issue] = await this.list(principal, null, { issueId });
    if (!issue) throw new NotFoundError("Issue not found.");
    return issue;
  }

  async create(principal: Principal, input: CreateIssueInput) {
    await this.#clientAccess.assertCanContribute(principal, input.clientId);
    const title = this.#title(input.title);

    return db.transaction(async (transaction) => {
      const [client] = await transaction
        .select({ id: clients.id })
        .from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.workspaceId, principal.workspaceId),
          isNull(clients.archivedAt),
        ))
        .limit(1);

      if (!client) throw new NotFoundError("Client not found.");

      await this.#relationValidator.assertAssignees(
        transaction,
        principal,
        input.assigneeMembershipIds,
      );
      await this.#relationValidator.assertParentIssue(
        transaction,
        principal,
        input.clientId,
        input.parentIssueId,
      );
      await this.#relationValidator.assertBranch(
        transaction,
        principal,
        input.clientId,
        input.projectId,
        input.branchId,
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
      const [namespace] = await transaction
        .update(issueNamespaces)
        .set({ nextNumber: sql`${issueNamespaces.nextNumber} + 1`, updatedAt: new Date() })
        .where(eq(issueNamespaces.id, context.namespace_id))
        .returning({ nextNumber: issueNamespaces.nextNumber });

      if (!namespace) throw new ConflictError("The issue namespace could not be allocated.");

      const number = namespace.nextNumber - 1;
      const [issue] = await transaction
        .insert(issues)
        .values({
          workspaceId: principal.workspaceId,
          clientId: input.clientId,
          projectId: input.projectId,
          branchId: input.branchId,
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

      await this.#replaceAssignees(
        transaction,
        principal,
        issue.id,
        input.assigneeMembershipIds,
      );

      return { issue, identifier: `${context.prefix}-${number}` };
    }, { isolationLevel: "serializable", accessMode: "read write" });
  }

  async update(principal: Principal, issueId: string, input: UpdateIssueInput) {
    const [snapshot] = await db
      .select({ clientId: issues.clientId })
      .from(issues)
      .where(and(
        eq(issues.id, issueId),
        eq(issues.workspaceId, principal.workspaceId),
        isNull(issues.archivedAt),
      ))
      .limit(1);

    if (!snapshot) throw new NotFoundError("Issue not found.");
    await this.#clientAccess.assertCanContribute(principal, snapshot.clientId);

    return db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(issues)
        .where(and(
          eq(issues.id, issueId),
          eq(issues.workspaceId, principal.workspaceId),
          isNull(issues.archivedAt),
        ))
        .limit(1);

      if (!current) throw new NotFoundError("Issue not found.");

      if (input.assigneeMembershipIds) {
        await this.#relationValidator.assertAssignees(
          transaction,
          principal,
          input.assigneeMembershipIds,
        );
      }

      const projectId = input.projectId === undefined ? current.projectId : input.projectId;
      const projectChanged = projectId !== current.projectId;
      const branchId = input.branchId !== undefined
        ? input.branchId
        : projectChanged
          ? null
          : current.branchId;
      let statusId = current.statusId;

      await this.#relationValidator.assertBranch(
        transaction,
        principal,
        current.clientId,
        projectId,
        branchId,
      );

      if (projectChanged || input.statusId !== undefined) {
        const context = await this.#contextResolver.resolve(
          transaction,
          principal,
          current.clientId,
          projectId,
        );

        if (input.statusId !== undefined) {
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

      const [updated] = await transaction
        .update(issues)
        .set({
          projectId,
          branchId,
          statusId,
          ...(input.issueTypeId !== undefined ? { issueTypeId: input.issueTypeId } : {}),
          ...(input.title !== undefined ? { title: this.#title(input.title) } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.estimateMinutes !== undefined ? { estimateMinutes: input.estimateMinutes } : {}),
          ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
          version: sql`${issues.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(issues.id, current.id), eq(issues.version, input.expectedVersion)))
        .returning();

      if (!updated) throw new ConflictError("The issue changed since it was loaded. Refresh and retry.");

      if (input.assigneeMembershipIds) {
        await this.#replaceAssignees(
          transaction,
          principal,
          issueId,
          input.assigneeMembershipIds,
        );
      }

      const [namespace] = await transaction
        .select({ prefix: issueNamespaces.prefix })
        .from(issueNamespaces)
        .where(eq(issueNamespaces.id, updated.issueNamespaceId))
        .limit(1);

      return { issue: updated, identifier: `${namespace.prefix}-${updated.number}` };
    }, { isolationLevel: "serializable", accessMode: "read write" });
  }

  async #attachAssignees<T extends { id: string }>(workspaceId: string, rows: T[]) {
    if (rows.length === 0) return rows.map((row) => ({ ...row, assignees: [] }));

    const [assignments, labelRows] = await Promise.all([db
      .select({
        issueId: issueAssignees.issueId,
        membershipId: workspaceMemberships.id,
        userId: users.id,
        displayName: users.name,
        email: users.email,
        avatarUrl: users.image,
      })
      .from(issueAssignees)
      .innerJoin(workspaceMemberships, eq(workspaceMemberships.id, issueAssignees.membershipId))
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .where(and(
        eq(issueAssignees.workspaceId, workspaceId),
        inArray(issueAssignees.issueId, rows.map((row) => row.id)),
      )), db
        .select({
          issueId: issueLabels.issueId,
          id: labels.id,
          name: labels.name,
          color: labels.color,
        })
        .from(issueLabels)
        .innerJoin(labels, eq(labels.id, issueLabels.labelId))
        .where(and(
          eq(issueLabels.workspaceId, workspaceId),
          inArray(issueLabels.issueId, rows.map((row) => row.id)),
          isNull(labels.archivedAt),
        )),
    ]);

    return rows.map((row) => ({
      ...row,
      assignees: assignments.filter((assignment) => assignment.issueId === row.id),
      labels: labelRows.filter((label) => label.issueId === row.id),
    }));
  }

  async #replaceAssignees(
    transaction: DatabaseTransaction,
    principal: Principal,
    issueId: string,
    membershipIds: string[],
  ) {
    await transaction.delete(issueAssignees).where(and(
      eq(issueAssignees.workspaceId, principal.workspaceId),
      eq(issueAssignees.issueId, issueId),
    ));

    if (membershipIds.length) {
      await transaction.insert(issueAssignees).values(membershipIds.map((membershipId) => ({
        workspaceId: principal.workspaceId,
        issueId,
        membershipId,
        createdByMembershipId: principal.membershipId,
      })));
    }
  }

  #title(value: string): string {
    const title = value.trim();
    if (title.length < 2 || title.length > 240) {
      throw new ValidationError("Issue titles must contain 2-240 characters.");
    }
    return title;
  }
}

export { issuePriorities, issueVisibilities };
