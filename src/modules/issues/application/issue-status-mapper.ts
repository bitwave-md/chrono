import { and, desc, eq, isNull } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import { workflowStatuses } from "@/db/schema";
import { IssueContextResolver } from "@/modules/issues/application/issue-context-resolver";
import { ConflictError } from "@/modules/shared/application/application-error";

export class IssueStatusMapper {
  readonly #contextResolver = new IssueContextResolver();

  async map(
    transaction: DatabaseTransaction,
    currentStatusId: string | null,
    targetWorkflowId: string,
  ): Promise<string> {
    const currentStatus = currentStatusId
      ? await this.#currentStatus(transaction, currentStatusId)
      : null;

    if (currentStatus?.workflowId === targetWorkflowId) {
      return currentStatus.id;
    }

    if (currentStatus) {
      const [equivalent] = await transaction
        .select({ id: workflowStatuses.id })
        .from(workflowStatuses)
        .where(
          and(
            eq(workflowStatuses.workflowId, targetWorkflowId),
            eq(workflowStatuses.category, currentStatus.category),
            isNull(workflowStatuses.archivedAt),
          ),
        )
        .orderBy(desc(workflowStatuses.isDefault), workflowStatuses.position)
        .limit(1);

      if (equivalent) {
        return equivalent.id;
      }
    }

    const defaultStatus = await this.#contextResolver.resolveStatus(
      transaction,
      targetWorkflowId,
      null,
    );

    if (!defaultStatus) {
      throw new ConflictError("The target workflow has no default status.");
    }

    return defaultStatus;
  }

  async #currentStatus(
    transaction: DatabaseTransaction,
    statusId: string,
  ) {
    const [status] = await transaction
      .select({
        id: workflowStatuses.id,
        workflowId: workflowStatuses.workflowId,
        category: workflowStatuses.category,
      })
      .from(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.id, statusId),
          isNull(workflowStatuses.archivedAt),
        ),
      )
      .limit(1);

    return status;
  }
}
