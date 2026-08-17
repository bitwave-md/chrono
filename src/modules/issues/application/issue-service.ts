import { and, desc, eq, exists, isNull, or, sql } from "drizzle-orm";
import { db, type DatabaseTransaction } from "@/db/client";
import {
  clientMemberships,
  clients,
  issueAssignees,
  issueNamespaces,
  issues,
  issueTypes,
  projectMemberships,
  projectBranches,
  projects,
  timerSessions,
  workflowStatuses,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { GuestAccessService } from "@/modules/authorization/application/guest-access-service";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueContextResolver } from "@/modules/issues/application/issue-context-resolver";
import { IssueActivityWriter } from "@/modules/issues/application/issue-activity-writer";
import type { CreateIssueInput, IssueFilters, UpdateIssueInput } from "@/modules/issues/application/issue-contracts";
import { IssueListEnricher } from "@/modules/issues/application/issue-list-enricher";
import { IssueRelationValidator } from "@/modules/issues/application/issue-relation-validator";
import { IssueStatusMapper } from "@/modules/issues/application/issue-status-mapper";
import { IssueNotificationWriter } from "@/modules/inbox/application/issue-notification-writer";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/modules/shared/application/application-error";
export class IssueService {
  readonly #clientAccess = new ClientAccessService();
  readonly #guestAccess = new GuestAccessService();
  readonly #activity = new IssueActivityWriter();
  readonly #contextResolver = new IssueContextResolver();
  readonly #enricher = new IssueListEnricher();
  readonly #notifications = new IssueNotificationWriter();
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
        filters.mine
          ? exists(db.select({ value: sql`1` }).from(issueAssignees).where(and(
              eq(issueAssignees.workspaceId, issues.workspaceId),
              eq(issueAssignees.issueId, issues.id),
              eq(issueAssignees.membershipId, principal.membershipId),
            )))
          : filters.issueId
            ? or(
                isNull(issues.projectId),
                exists(db.select({ value: sql`1` }).from(projectMemberships).where(and(
                  eq(projectMemberships.workspaceId, issues.workspaceId),
                  eq(projectMemberships.projectId, issues.projectId),
                  eq(projectMemberships.workspaceMembershipId, principal.membershipId),
                )))!,
                exists(db.select({ value: sql`1` }).from(issueAssignees).where(and(
                  eq(issueAssignees.workspaceId, issues.workspaceId),
                  eq(issueAssignees.issueId, issues.id),
                  eq(issueAssignees.membershipId, principal.membershipId),
                )))!,
              )!
            : or(
                isNull(issues.projectId),
                exists(db.select({ value: sql`1` }).from(projectMemberships).where(and(
                  eq(projectMemberships.workspaceId, issues.workspaceId),
                  eq(projectMemberships.projectId, issues.projectId),
                  eq(projectMemberships.workspaceMembershipId, principal.membershipId),
                )))!,
              )!,
      );
    }

    const rows = await db
      .select({
        id: issues.id,
        creatorMembershipId: issues.creatorMembershipId,
        clientId: issues.clientId,
        clientName: clients.name,
        clientIconType: clients.iconType,
        clientIconKey: clients.iconKey,
        clientIconColor: clients.iconColor,
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

    return this.#enricher.attach(principal.workspaceId, rows);
  }

  async get(principal: Principal, issueId: string) {
    const [issue] = await this.list(principal, null, { issueId });
    if (!issue) throw new NotFoundError("Issue not found.");
    return issue;
  }

  async create(principal: Principal, input: CreateIssueInput) {
    await this.#guestAccess.assertCanCreateIssue(principal, input.clientId, input.projectId);
    if (principal.role !== "guest") await this.#clientAccess.assertCanContribute(principal, input.clientId);
    const title = this.#title(input.title);
    const guestInput = principal.role === "guest"
      ? { ...input, assigneeMembershipIds: [], statusId: null, visibility: "client_shared" as const }
      : input;

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
        guestInput.assigneeMembershipIds,
      );
      await this.#relationValidator.assertParentIssue(
        transaction,
        principal,
        input.clientId,
        guestInput.parentIssueId,
      );
      await this.#relationValidator.assertBranch(
        transaction,
        principal,
        input.clientId,
        guestInput.projectId,
        guestInput.branchId,
      );

      const context = await this.#contextResolver.resolve(
        transaction,
        principal,
        guestInput.clientId,
        guestInput.projectId,
      );
      const statusId = await this.#contextResolver.resolveStatus(
        transaction,
        context.workflow_id,
        guestInput.statusId,
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
          projectId: guestInput.projectId,
          branchId: guestInput.branchId,
          statusId,
          issueNamespaceId: context.namespace_id,
          number,
          title,
          description: input.description,
          priority: guestInput.priority,
          visibility: guestInput.visibility,
          creatorMembershipId: principal.membershipId,
          parentIssueId: input.parentIssueId,
          rank: number.toString().padStart(12, "0"),
        })
        .returning();

      await this.#replaceAssignees(
        transaction,
        principal,
        issue.id,
        guestInput.assigneeMembershipIds,
      );
      await this.#notifications.notify(
        transaction,
        principal,
        issue.id,
        "assigned",
        null,
        input.assigneeMembershipIds,
      );
      await this.#activity.created(transaction, activityContext(principal, issue.id), `${context.prefix}-${number}`);

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
    if (principal.role === "guest") {
      await this.#guestAccess.assertCanReadIssue(principal, issueId);
      if (input.projectId !== undefined || input.branchId !== undefined || input.assigneeMembershipIds !== undefined || input.statusId !== undefined || input.priority !== undefined || input.visibility !== undefined || input.issueTypeId !== undefined || input.estimateMinutes !== undefined || input.dueAt !== undefined) {
        throw new ForbiddenError("Guests can only edit their own Issue text.");
      }
    } else {
      await this.#clientAccess.assertCanContribute(principal, snapshot.clientId);
    }
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
      if (principal.role === "guest" && current.creatorMembershipId !== principal.membershipId) {
        throw new ForbiddenError("Guests can only edit Issues they created.");
      }

      const previousAssigneeIds = input.assigneeMembershipIds
        ? await transaction
            .select({ membershipId: issueAssignees.membershipId })
            .from(issueAssignees)
            .where(and(
              eq(issueAssignees.workspaceId, principal.workspaceId),
              eq(issueAssignees.issueId, issueId),
            ))
            .then((rows) => rows.map((row) => row.membershipId))
        : [];

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
        await this.#notifications.notify(
          transaction,
          principal,
          issueId,
          "assigned",
          null,
          input.assigneeMembershipIds.filter((membershipId) => !previousAssigneeIds.includes(membershipId)),
        );
      }

      const [[namespace], [status], [previousStatus]] = await Promise.all([
        transaction
          .select({ prefix: issueNamespaces.prefix })
          .from(issueNamespaces)
          .where(eq(issueNamespaces.id, updated.issueNamespaceId))
          .limit(1),
        transaction
          .select({ name: workflowStatuses.name })
          .from(workflowStatuses)
          .where(eq(workflowStatuses.id, updated.statusId))
          .limit(1),
        transaction
          .select({ name: workflowStatuses.name })
          .from(workflowStatuses)
          .where(eq(workflowStatuses.id, current.statusId))
          .limit(1),
      ]);
      if (updated.statusId !== current.statusId) {
        await this.#activity.statusChanged(transaction, activityContext(principal, issueId), previousStatus?.name ?? "Unknown", status?.name ?? "Unknown");
        await this.#notifications.notifyInterested(
          transaction,
          principal,
          issueId,
          "status_changed",
          status?.name ?? "another status",
        );
      }
      if (updated.priority !== current.priority) {
        await this.#activity.priorityChanged(transaction, activityContext(principal, issueId), current.priority, updated.priority);
      }

      return { issue: updated, identifier: `${namespace.prefix}-${updated.number}` };
    }, { isolationLevel: "serializable", accessMode: "read write" });
  }
  async archive(principal: Principal, issueId: string) {
    const issue = await this.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);
    const [activeTimer] = await db
      .select({ id: timerSessions.id })
      .from(timerSessions)
      .where(and(
        eq(timerSessions.workspaceId, principal.workspaceId),
        eq(timerSessions.issueId, issueId),
        isNull(timerSessions.stoppedAt),
      ))
      .limit(1);
    if (activeTimer) throw new ConflictError("Stop the active timer before deleting this Issue.");

    const archivedAt = new Date();
    const [archived] = await db
      .update(issues)
      .set({ archivedAt, updatedAt: archivedAt, version: sql`${issues.version} + 1` })
      .where(and(
        eq(issues.workspaceId, principal.workspaceId),
        eq(issues.id, issueId),
        isNull(issues.archivedAt),
      ))
      .returning({ id: issues.id });
    if (!archived) throw new NotFoundError("Issue not found.");
    return archived;
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
function activityContext(principal: Principal, issueId: string) {
  return { workspaceId: principal.workspaceId, issueId, actorMembershipId: principal.membershipId };
}
export { issuePriorities, issueVisibilities } from "@/modules/issues/application/issue-contracts";
export type { IssuePriority, IssueVisibility, UpdateIssueInput } from "@/modules/issues/application/issue-contracts";
