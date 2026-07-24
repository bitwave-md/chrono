import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  clients,
  issueNamespaces,
  issues,
  projectBranches,
  projects,
  timeCategories,
  timeLogs,
  users,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import {
  ForbiddenError,
  ValidationError,
} from "@/modules/shared/application/application-error";
import { TimeAttributionResolver } from "@/modules/time-tracking/application/time-attribution-resolver";
import { TimeEntryValidator } from "@/modules/time-tracking/application/time-entry-validator";

export interface CreateManualTimeLogInput {
  issueId: string;
  categoryId: string | null;
  startedAt: Date;
  durationSeconds: number;
  note: string | null;
  billable: boolean | null;
}

export interface TimeLogFilters {
  issueId?: string;
  clientId?: string;
  projectId?: string;
  branchId?: string;
  categoryId?: string;
  workerUserId?: string;
  from?: Date;
  to?: Date;
  dateBasis?: "started" | "ended";
  limit?: number;
}

export class TimeLogService {
  readonly #attributionResolver = new TimeAttributionResolver();
  readonly #entryValidator = new TimeEntryValidator();
  readonly #issues = new IssueService();
  readonly #clientAccess = new ClientAccessService();
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal, filters: TimeLogFilters) {
    this.#policy.assertCanUseTimeTracking(principal);
    this.#assertDateRange(filters.from, filters.to);
    if (filters.issueId) await this.#issues.get(principal, filters.issueId);
    else if (filters.clientId) await this.#clientAccess.assertCanRead(principal, filters.clientId);
    const workerUserId = this.#visibleWorker(
      principal,
      filters.workerUserId,
      Boolean(filters.issueId),
    );
    const conditions = [
      eq(timeLogs.workspaceId, principal.workspaceId),
      isNull(timeLogs.archivedAt),
    ];

    const filterColumns = [
      [timeLogs.issueId, filters.issueId],
      [timeLogs.clientId, filters.clientId],
      [timeLogs.projectId, filters.projectId],
      [timeLogs.branchId, filters.branchId],
      [timeLogs.categoryId, filters.categoryId],
      [timeLogs.workerUserId, workerUserId],
    ] as const;

    for (const [column, value] of filterColumns) {
      if (value) {
        conditions.push(eq(column, value));
      }
    }

    const dateColumn = filters.dateBasis === "ended"
      ? timeLogs.endedAt
      : timeLogs.startedAt;
    if (filters.from) conditions.push(gte(dateColumn, filters.from));
    if (filters.to) conditions.push(lt(dateColumn, filters.to));

    return db
      .select({
        id: timeLogs.id,
        source: timeLogs.source,
        issueId: timeLogs.issueId,
        identifier:
          sql<string>`${issueNamespaces.prefix} || '-' || ${issues.number}`.as(
            "identifier",
          ),
        issueTitle: issues.title,
        clientId: timeLogs.clientId,
        clientName: clients.name,
        projectId: timeLogs.projectId,
        projectName: projects.name,
        branchId: timeLogs.branchId,
        branchName: projectBranches.name,
        categoryId: timeLogs.categoryId,
        categoryName: timeCategories.name,
        categoryColor: timeCategories.color,
        workerUserId: timeLogs.workerUserId,
        workerName: users.name,
        workerEmail: users.email,
        workerAvatarUrl: users.image,
        note: timeLogs.note,
        billable: timeLogs.billable,
        startedAt: timeLogs.startedAt,
        endedAt: timeLogs.endedAt,
        durationSeconds: timeLogs.durationSeconds,
        version: timeLogs.version,
      })
      .from(timeLogs)
      .innerJoin(
        issues,
        and(
          eq(issues.id, timeLogs.issueId),
          eq(issues.workspaceId, timeLogs.workspaceId),
        ),
      )
      .innerJoin(
        issueNamespaces,
        eq(issueNamespaces.id, issues.issueNamespaceId),
      )
      .innerJoin(
        clients,
        and(
          eq(clients.id, timeLogs.clientId),
          eq(clients.workspaceId, timeLogs.workspaceId),
        ),
      )
      .leftJoin(
        projects,
        and(
          eq(projects.id, timeLogs.projectId),
          eq(projects.workspaceId, timeLogs.workspaceId),
        ),
      )
      .leftJoin(
        projectBranches,
        and(
          eq(projectBranches.id, timeLogs.branchId),
          eq(projectBranches.workspaceId, timeLogs.workspaceId),
        ),
      )
      .leftJoin(
        timeCategories,
        and(
          eq(timeCategories.id, timeLogs.categoryId),
          eq(timeCategories.workspaceId, timeLogs.workspaceId),
        ),
      )
      .innerJoin(users, eq(users.id, timeLogs.workerUserId))
      .where(and(...conditions))
      .orderBy(desc(dateColumn))
      .limit(this.#limit(filters.limit));
  }

  async createManual(principal: Principal, input: CreateManualTimeLogInput) {
    this.#policy.assertCanUseTimeTracking(principal);
    const period = this.#entryValidator.manualPeriod(
      input.startedAt,
      input.durationSeconds,
    );
    const note = this.#entryValidator.normalizeNote(input.note);

    return db.transaction(
      async (transaction) => {
        const attribution = await this.#attributionResolver.resolve(
          transaction,
          principal,
          input.issueId,
        );
        const category = await this.#attributionResolver.resolveCategory(
          transaction,
          principal,
          input.categoryId,
        );
        const [timeLog] = await transaction
          .insert(timeLogs)
          .values({
            workspaceId: principal.workspaceId,
            workerMembershipId: principal.membershipId,
            workerUserId: principal.userId,
            ...attribution,
            categoryId: category?.id ?? null,
            source: "manual",
            note,
            billable: this.#entryValidator.resolveBillable(
              input.billable,
              category,
            ),
            ...period,
          })
          .returning();

        return timeLog;
      },
      { isolationLevel: "serializable", accessMode: "read write" },
    );
  }

  #visibleWorker(
    principal: Principal,
    requestedWorkerUserId?: string,
    issueScoped = false,
  ): string | undefined {
    if (
      issueScoped ||
      principal.role === "owner" ||
      principal.role === "admin"
    ) {
      return requestedWorkerUserId;
    }

    if (
      requestedWorkerUserId &&
      requestedWorkerUserId !== principal.userId
    ) {
      throw new ForbiddenError("Members can only view their own time logs.");
    }

    return principal.userId;
  }

  #assertDateRange(from?: Date, to?: Date): void {
    if (from && to && from >= to) {
      throw new ValidationError("from must be earlier than to.");
    }
  }

  #limit(requested?: number): number {
    if (requested === undefined) return 250;
    if (!Number.isInteger(requested) || requested < 1 || requested > 1_000) {
      throw new ValidationError("Time-log limits must contain 1-1000 entries.");
    }
    return requested;
  }
}
