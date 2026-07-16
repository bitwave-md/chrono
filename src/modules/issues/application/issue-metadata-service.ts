import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { issueLabels, issueTypes, labels } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import { NotFoundError } from "@/modules/shared/application/application-error";

export class IssueMetadataService {
  readonly #issueService = new IssueService();
  readonly #clientAccess = new ClientAccessService();

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
      if (labelIds.length) {
        const rows = await transaction.select({ id: labels.id }).from(labels).where(and(
          eq(labels.workspaceId, principal.workspaceId),
          inArray(labels.id, labelIds),
          isNull(labels.archivedAt),
        ));
        if (rows.length !== new Set(labelIds).size) throw new NotFoundError("One or more labels are unavailable.");
      }

      await transaction.delete(issueLabels).where(and(
        eq(issueLabels.workspaceId, principal.workspaceId),
        eq(issueLabels.issueId, issueId),
      ));
      if (labelIds.length) await transaction.insert(issueLabels).values(labelIds.map((labelId) => ({ workspaceId: principal.workspaceId, issueId, labelId })));
      return { labelIds };
    });
  }
}
