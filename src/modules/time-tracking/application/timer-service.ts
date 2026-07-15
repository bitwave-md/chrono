import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import {
  issueNamespaces,
  issues,
  timeCategories,
  timeLogs,
  timerSessions,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import {
  ConflictError,
  NotFoundError,
} from "@/modules/shared/application/application-error";
import { TimeAttributionResolver } from "@/modules/time-tracking/application/time-attribution-resolver";
import { TimeEntryValidator } from "@/modules/time-tracking/application/time-entry-validator";

export interface StartTimerInput {
  issueId: string;
  categoryId: string | null;
  note: string | null;
  billable: boolean | null;
}

export class TimerService {
  readonly #attributionResolver = new TimeAttributionResolver();
  readonly #entryValidator = new TimeEntryValidator();

  async active(principal: Principal) {
    const [timer] = await db
      .select({
        id: timerSessions.id,
        issueId: timerSessions.issueId,
        identifier:
          sql<string>`${issueNamespaces.prefix} || '-' || ${issues.number}`.as(
            "identifier",
          ),
        issueTitle: issues.title,
        clientId: timerSessions.clientId,
        projectId: timerSessions.projectId,
        rootProjectId: timerSessions.rootProjectId,
        teamId: timerSessions.teamId,
        categoryId: timerSessions.categoryId,
        categoryName: timeCategories.name,
        note: timerSessions.note,
        billable: timerSessions.billable,
        startedAt: timerSessions.startedAt,
      })
      .from(timerSessions)
      .innerJoin(
        issues,
        and(
          eq(issues.id, timerSessions.issueId),
          eq(issues.workspaceId, timerSessions.workspaceId),
        ),
      )
      .innerJoin(
        issueNamespaces,
        eq(issueNamespaces.id, issues.issueNamespaceId),
      )
      .leftJoin(
        timeCategories,
        and(
          eq(timeCategories.id, timerSessions.categoryId),
          eq(timeCategories.workspaceId, timerSessions.workspaceId),
        ),
      )
      .where(
        and(
          eq(timerSessions.workspaceId, principal.workspaceId),
          eq(timerSessions.workerUserId, principal.userId),
          isNull(timerSessions.stoppedAt),
        ),
      )
      .limit(1);

    return { timer: timer ?? null, serverNow: new Date() };
  }

  async start(principal: Principal, input: StartTimerInput) {
    const note = this.#entryValidator.normalizeNote(input.note);

    try {
      const timer = await db.transaction(
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
          const startedAt = new Date();
          const [created] = await transaction
            .insert(timerSessions)
            .values({
              workspaceId: principal.workspaceId,
              workerMembershipId: principal.membershipId,
              workerUserId: principal.userId,
              ...attribution,
              categoryId: category?.id ?? null,
              note,
              billable: this.#entryValidator.resolveBillable(
                input.billable,
                category,
              ),
              startedAt,
            })
            .returning();

          return created;
        },
        { isolationLevel: "serializable", accessMode: "read write" },
      );

      return { timer, serverNow: new Date() };
    } catch (error) {
      if (
        isUniqueViolation(error, "timer_sessions_worker_active_unique")
      ) {
        throw new ConflictError("This user already has an active timer.");
      }

      throw error;
    }
  }

  async stop(principal: Principal) {
    return db.transaction(
      async (transaction) => {
        const stoppedAt = new Date();
        const [timer] = await transaction
          .update(timerSessions)
          .set({ stoppedAt, updatedAt: stoppedAt })
          .where(
            and(
              eq(timerSessions.workspaceId, principal.workspaceId),
              eq(timerSessions.workerUserId, principal.userId),
              isNull(timerSessions.stoppedAt),
            ),
          )
          .returning();

        if (!timer) {
          throw new NotFoundError("No active timer was found in this workspace.");
        }

        const period = this.#entryValidator.timerPeriod(
          timer.startedAt,
          stoppedAt,
        );

        if (period.endedAt.getTime() !== stoppedAt.getTime()) {
          await transaction
            .update(timerSessions)
            .set({ stoppedAt: period.endedAt, updatedAt: period.endedAt })
            .where(eq(timerSessions.id, timer.id));
        }

        const [timeLog] = await transaction
          .insert(timeLogs)
          .values({
            workspaceId: timer.workspaceId,
            issueId: timer.issueId,
            timerSessionId: timer.id,
            workerMembershipId: timer.workerMembershipId,
            workerUserId: timer.workerUserId,
            clientId: timer.clientId,
            projectId: timer.projectId,
            rootProjectId: timer.rootProjectId,
            teamId: timer.teamId,
            categoryId: timer.categoryId,
            source: "timer",
            note: timer.note,
            billable: timer.billable,
            ...period,
          })
          .returning();

        return {
          timer: { ...timer, stoppedAt: period.endedAt },
          timeLog,
          serverNow: new Date(),
        };
      },
      { isolationLevel: "serializable", accessMode: "read write" },
    );
  }
}
