import { issueActivityEvents } from "@/db/schema";
import type { DatabaseTransaction } from "@/db/client";

interface ActivityContext {
  workspaceId: string;
  issueId: string;
  actorMembershipId: string;
}

export class IssueActivityWriter {
  created(transaction: DatabaseTransaction, context: ActivityContext, identifier: string) {
    return this.#write(transaction, context, "issue_created", { identifier });
  }

  statusChanged(transaction: DatabaseTransaction, context: ActivityContext, from: string, to: string) {
    return this.#write(transaction, context, "status_changed", { from, to });
  }

  priorityChanged(transaction: DatabaseTransaction, context: ActivityContext, from: string, to: string) {
    return this.#write(transaction, context, "priority_changed", { from, to });
  }

  #write(transaction: DatabaseTransaction, context: ActivityContext, eventType: string, payload: Record<string, unknown>) {
    return transaction.insert(issueActivityEvents).values({
      workspaceId: context.workspaceId,
      issueId: context.issueId,
      actorMembershipId: context.actorMembershipId,
      eventType,
      payload,
    });
  }
}
