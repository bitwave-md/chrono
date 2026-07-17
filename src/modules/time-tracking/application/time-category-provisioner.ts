import type { DatabaseTransaction } from "@/db/client";
import { timeCategories } from "@/db/schema";
import { defaultTimeCategories } from "@/modules/time-tracking/domain/default-time-categories";

export class TimeCategoryProvisioner {
  async ensureDefaults(
    transaction: DatabaseTransaction,
    workspaceId: string,
  ): Promise<void> {
    await transaction
      .insert(timeCategories)
      .values(defaultTimeCategories.map((category) => ({
        workspaceId,
        ...category,
        defaultBillable: false,
      })))
      .onConflictDoNothing();
  }
}
