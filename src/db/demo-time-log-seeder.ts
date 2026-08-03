import { createHash } from "node:crypto";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { demoClients } from "@/db/demo-fixtures";
import { clients, issues, projects, timeCategories, timeLogs } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { defaultTimeCategories } from "@/modules/time-tracking/domain/default-time-categories";

interface DemoIssueContext {
  issueId: string;
  clientId: string;
  projectId: string;
  branchId: string | null;
  clientKey: string;
  projectSlug: string;
  title: string;
}

const durationsMinutes = [50, 70, 149, 150, 35, 95, 125, 180] as const;

const notesByCategory = {
  planning: "Scoped requirements and acceptance criteria",
  documenting: "Updated implementation notes and handoff",
  developing: "Implemented the next delivery slice",
  testing: "Verified behavior and regression coverage",
  other: "Reviewed progress and coordinated follow-up",
} as const;

export class DemoTimeLogSeeder {
  async seed(principal: Principal, now = new Date()): Promise<number> {
    const [issueRows, categoryRows] = await Promise.all([
      this.#issues(principal.workspaceId),
      db.select({ id: timeCategories.id, key: timeCategories.key })
        .from(timeCategories)
        .where(and(
          eq(timeCategories.workspaceId, principal.workspaceId),
          isNull(timeCategories.archivedAt),
        )),
    ]);
    const issuesByFixture = new Map(issueRows.map((row) => [fixtureKey(row.clientKey, row.projectSlug, row.title), row]));
    const categoriesByKey = new Map(categoryRows.map((row) => [row.key, row.id]));
    const values: Array<typeof timeLogs.$inferInsert> = [];
    let sequence = 0;

    for (const client of demoClients) {
      for (const project of client.projects) {
        for (const [issueIndex, issue] of project.issues.slice(0, 3).entries()) {
          const context = issuesByFixture.get(fixtureKey(client.key, project.slug, issue.title));
          if (!context) continue;
          values.push(this.#entry(principal, context, categoriesByKey, now, sequence, 0));
          sequence += 1;
          if (issueIndex === 0) {
            values.push(this.#entry(principal, context, categoriesByKey, now, sequence, 1));
            sequence += 1;
          }
        }
      }
    }

    if (!values.length) return 0;
    const inserted = await db.insert(timeLogs).values(values).onConflictDoNothing({ target: timeLogs.id }).returning({ id: timeLogs.id });
    return inserted.length;
  }

  async #issues(workspaceId: string): Promise<DemoIssueContext[]> {
    return db.select({
      issueId: issues.id,
      clientId: issues.clientId,
      projectId: projects.id,
      branchId: issues.branchId,
      clientKey: clients.key,
      projectSlug: projects.slug,
      title: issues.title,
    }).from(issues)
      .innerJoin(projects, and(eq(projects.id, issues.projectId), eq(projects.workspaceId, issues.workspaceId)))
      .innerJoin(clients, and(eq(clients.id, issues.clientId), eq(clients.workspaceId, issues.workspaceId)))
      .where(and(
        eq(issues.workspaceId, workspaceId),
        inArray(clients.key, demoClients.map((client) => client.key)),
        isNull(issues.archivedAt),
        isNull(projects.archivedAt),
        isNull(clients.archivedAt),
      ));
  }

  #entry(
    principal: Principal,
    issue: DemoIssueContext,
    categoriesByKey: Map<string, string>,
    now: Date,
    sequence: number,
    issueSlot: number,
  ): typeof timeLogs.$inferInsert {
    const category = defaultTimeCategories[sequence % defaultTimeCategories.length];
    const categoryId = categoriesByKey.get(category.key);
    if (!categoryId) throw new Error(`Demo time category "${category.key}" is missing.`);
    const durationSeconds = durationsMinutes[sequence % durationsMinutes.length] * 60;
    const endedAt = seededEndAt(now, sequence);
    return {
      id: stableUuid(`${principal.workspaceId}:${monthKey(now)}:${issue.issueId}:${issueSlot}`),
      workspaceId: principal.workspaceId,
      issueId: issue.issueId,
      workerMembershipId: principal.membershipId,
      workerUserId: principal.userId,
      clientId: issue.clientId,
      projectId: issue.projectId,
      branchId: issue.branchId,
      categoryId,
      source: "manual",
      note: notesByCategory[category.key],
      billable: sequence % 3 !== 0,
      startedAt: new Date(endedAt.getTime() - durationSeconds * 1_000),
      endedAt,
      durationSeconds,
    };
  }
}

function fixtureKey(clientKey: string, projectSlug: string, issueTitle: string): string {
  return `${clientKey}/${projectSlug}/${issueTitle}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seededEndAt(now: Date, sequence: number): Date {
  const daysAgo = sequence % Math.min(7, Math.max(1, now.getDate()));
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 9 + sequence % 8, 30);
  return candidate < now ? candidate : new Date(now.getTime() - (sequence + 5) * 60_000);
}

function stableUuid(value: string): string {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
