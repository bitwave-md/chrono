import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  issueAssignees,
  issueLabels,
  labels,
  users,
  workspaceMemberships,
} from "@/db/schema";

export class IssueListEnricher {
  async attach<T extends { id: string }>(workspaceId: string, rows: T[]) {
    if (!rows.length) return rows.map((row) => ({ ...row, assignees: [], labels: [] }));

    const [assignments, labelRows] = await Promise.all([
      db
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
        )),
      db
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
}
