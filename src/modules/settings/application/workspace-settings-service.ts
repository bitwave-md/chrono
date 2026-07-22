import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { storedObjects, workspaceAssets, workspaceNotificationPreferences, workspaces } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import { ClientIcon } from "@/modules/clients/domain/client-icon";
import { ValidationError } from "@/modules/shared/application/application-error";
import { ObjectStorageRegistry } from "@/modules/storage/infrastructure/object-storage-registry";
import { InstanceOperatorPolicy } from "@/modules/settings/application/instance-operator-policy";
import { BackupStatusReader } from "@/modules/settings/application/backup-status-reader";

export class WorkspaceSettingsService {
  readonly #workspacePolicy = new WorkspacePolicy();
  readonly #operatorPolicy = new InstanceOperatorPolicy();
  readonly #backups = new BackupStatusReader();

  async general(principal: Principal) {
    await db.insert(workspaceAssets).values({ workspaceId: principal.workspaceId }).onConflictDoNothing();
    const [record] = await db.select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      iconType: workspaceAssets.iconType,
      iconKey: workspaceAssets.iconKey,
      iconColor: workspaceAssets.iconColor,
      imageObjectId: workspaceAssets.imageObjectId,
    }).from(workspaces).innerJoin(workspaceAssets, eq(workspaceAssets.workspaceId, workspaces.id)).where(eq(workspaces.id, principal.workspaceId)).limit(1);
    return { ...record!, canManage: principal.role === "owner" || principal.role === "admin", isOperator: this.#operatorPolicy.isOperator(principal), imageUrl: record?.imageObjectId ? `/api/workspaces/${principal.workspaceSlug}/icon/content` : null };
  }

  async updateGeneral(principal: Principal, input: { name?: string; iconType?: "icon" | "emoji"; iconKey?: string; iconColor?: string }) {
    this.#workspacePolicy.assertCanManageClients(principal);
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2 || name.length > 120) throw new ValidationError("Workspace names must contain 2-120 characters.");
      await db.update(workspaces).set({ name, updatedAt: new Date() }).where(eq(workspaces.id, principal.workspaceId));
    }
    if (input.iconType && input.iconKey && input.iconColor) {
      const icon = new ClientIcon(input.iconType, input.iconKey, input.iconColor);
      await db.insert(workspaceAssets).values({ workspaceId: principal.workspaceId, iconType: icon.type, iconKey: icon.key, iconColor: icon.color }).onConflictDoUpdate({ target: workspaceAssets.workspaceId, set: { iconType: icon.type, iconKey: icon.key, iconColor: icon.color, updatedAt: new Date() } });
    }
    return this.general(principal);
  }

  async notifications(principal: Principal) {
    await db.insert(workspaceNotificationPreferences).values({ workspaceId: principal.workspaceId, membershipId: principal.membershipId }).onConflictDoNothing();
    const [record] = await db.select().from(workspaceNotificationPreferences).where(and(eq(workspaceNotificationPreferences.workspaceId, principal.workspaceId), eq(workspaceNotificationPreferences.membershipId, principal.membershipId))).limit(1);
    return record!;
  }

  async updateNotifications(principal: Principal, input: { assignments?: boolean; statusChanges?: boolean; comments?: boolean }) {
    await this.notifications(principal);
    const [record] = await db.update(workspaceNotificationPreferences).set({ ...input, updatedAt: new Date() }).where(and(eq(workspaceNotificationPreferences.workspaceId, principal.workspaceId), eq(workspaceNotificationPreferences.membershipId, principal.membershipId))).returning();
    return record!;
  }

  async storage(principal: Principal) {
    this.#operatorPolicy.assertOperator(principal);
    const configuration = ObjectStorageRegistry.configuration();
    const [{ bytes, objects }] = await db.select({
      bytes: sql<number>`coalesce(sum(${storedObjects.sizeBytes}) filter (where ${storedObjects.state} = 'ready'), 0)::int`,
      objects: sql<number>`count(*) filter (where ${storedObjects.state} = 'ready')::int`,
    }).from(storedObjects).where(eq(storedObjects.workspaceId, principal.workspaceId));
    let healthy = false;
    if (configuration) healthy = await ObjectStorageRegistry.get().healthcheck().then(() => true).catch(() => false);
    return { enabled: Boolean(configuration), healthy, mode: configuration?.endpoint.includes("storage:9000") ? "bundled" : "external", endpoint: configuration ? new URL(configuration.endpoint).host : null, bucket: configuration?.bucket ?? null, usedBytes: bytes ?? 0, objectCount: objects ?? 0, quotaBytes: configuration?.workspaceQuotaBytes ?? 0, backup: await this.#backups.read() };
  }
}
