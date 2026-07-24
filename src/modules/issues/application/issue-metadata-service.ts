import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { issueLabels, issueTypes, labels } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueActivityWriter } from "@/modules/issues/application/issue-activity-writer";
import { IssueService } from "@/modules/issues/application/issue-service";
import { NotFoundError } from "@/modules/shared/application/application-error";

export class IssueMetadataService {
  readonly #issueService = new IssueService();
  readonly #clientAccess = new ClientAccessService();
  readonly #activity = new IssueActivityWriter();

  async list(principal: Principal) {
    const [typeRows, labelRows] = await Promise.all([
      db.select().from(issueTypes).where(and(eq(issueTypes.workspaceId, principal.workspaceId), isNull(issueTypes.archivedAt))).orderBy(asc(issueTypes.name)),
      db.select().from(labels).where(and(eq(labels.workspaceId, principal.workspaceId), isNull(labels.archivedAt))).orderBy(asc(labels.name)),
    ]);
    return { issueTypes: typeRows, labels: labelRows };
  }

  async replaceLabels(principal: Principal, issueId: string, labelIds: string[]) {
    const issue = await this.#issueService.get(principal, issueId);
    await this.#clientAccess.assertCanContribute(principal, issue.clientId);

    return db.transaction(async (transaction) => {
      const previous = await transaction.select({ id: labels.id, name: labels.name })
        .from(issueLabels)
        .innerJoin(labels, eq(labels.id, issueLabels.labelId))
        .where(and(eq(issueLabels.workspaceId, principal.workspaceId), eq(issueLabels.issueId, issueId)));
      let selected: Array<{ id: string; name: string }> = [];
      if (labelIds.length) {
        selected = await transaction.select({ id: labels.id, name: labels.name }).from(labels).where(and(
          eq(labels.workspaceId, principal.workspaceId),
          inArray(labels.id, labelIds),
          isNull(labels.archivedAt),
        ));
        if (selected.length !== new Set(labelIds).size) throw new NotFoundError("One or more labels are unavailable.");
      }

      await transaction.delete(issueLabels).where(and(
        eq(issueLabels.workspaceId, principal.workspaceId),
        eq(issueLabels.issueId, issueId),
      ));
      if (labelIds.length) await transaction.insert(issueLabels).values(labelIds.map((labelId) => ({ workspaceId: principal.workspaceId, issueId, labelId })));
      const previousIds = new Set(previous.map((label) => label.id));
      const selectedIds = new Set(selected.map((label) => label.id));
      const added = selected.filter((label) => !previousIds.has(label.id)).map((label) => label.name);
      const removed = previous.filter((label) => !selectedIds.has(label.id)).map((label) => label.name);
      if (added.length || removed.length) {
        await this.#activity.labelsChanged(transaction, {
          workspaceId: principal.workspaceId,
          issueId,
          actorMembershipId: principal.membershipId,
        }, added, removed);
      }
      return { labelIds };
    });
  }
}
