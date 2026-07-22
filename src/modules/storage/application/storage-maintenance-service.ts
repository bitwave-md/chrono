import { and, eq, isNull, lt } from "drizzle-orm";

import { db } from "@/db/client";
import { storedObjects } from "@/db/schema";
import { ObjectStorageRegistry } from "@/modules/storage/infrastructure/object-storage-registry";

const abandonmentAgeMs = 24 * 60 * 60 * 1_000;

export class StorageMaintenanceService {
  async cleanupAbandoned(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - abandonmentAgeMs);
    const abandoned = await db
      .update(storedObjects)
      .set({ state: "deleted", deletedAt: now })
      .where(and(
        eq(storedObjects.state, "pending"),
        isNull(storedObjects.deletedAt),
        lt(storedObjects.createdAt, cutoff),
      ))
      .returning({ objectKey: storedObjects.objectKey });

    const storage = ObjectStorageRegistry.configuration() ? ObjectStorageRegistry.get() : null;
    if (storage) {
      await Promise.allSettled(abandoned.map((item) => storage.delete(item.objectKey)));
    }
    return abandoned.length;
  }
}
