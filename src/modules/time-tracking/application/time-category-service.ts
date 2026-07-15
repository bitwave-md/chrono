import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import { timeCategories } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import {
  ConflictError,
  ValidationError,
} from "@/modules/shared/application/application-error";
import { TimeCategoryKey } from "@/modules/time-tracking/domain/time-category-key";

export interface CreateTimeCategoryInput {
  name: string;
  key: string;
  color: string | null;
  defaultBillable: boolean;
}

export class TimeCategoryService {
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal) {
    return db
      .select({
        id: timeCategories.id,
        name: timeCategories.name,
        key: timeCategories.key,
        color: timeCategories.color,
        defaultBillable: timeCategories.defaultBillable,
        position: timeCategories.position,
      })
      .from(timeCategories)
      .where(
        and(
          eq(timeCategories.workspaceId, principal.workspaceId),
          isNull(timeCategories.archivedAt),
        ),
      )
      .orderBy(asc(timeCategories.position), asc(timeCategories.name));
  }

  async create(principal: Principal, input: CreateTimeCategoryInput) {
    this.#policy.assertCanManageTimeCategories(principal);

    const name = input.name.trim();
    const key = this.#normalizeKey(input.key);
    const color = this.#normalizeColor(input.color);

    if (name.length < 2 || name.length > 120) {
      throw new ValidationError(
        "Time category names must contain 2-120 characters.",
      );
    }

    try {
      const [category] = await db
        .insert(timeCategories)
        .values({
          workspaceId: principal.workspaceId,
          name,
          key,
          color,
          defaultBillable: input.defaultBillable,
        })
        .returning();

      return category;
    } catch (error) {
      if (
        isUniqueViolation(error, "time_categories_workspace_key_unique")
      ) {
        throw new ConflictError("The time category key is already in use.");
      }

      throw error;
    }
  }

  #normalizeKey(input: string): string {
    try {
      return new TimeCategoryKey(input).value;
    } catch (error) {
      throw new ValidationError((error as Error).message);
    }
  }

  #normalizeColor(input: string | null): string | null {
    if (!input) {
      return null;
    }

    const normalized = input.trim().toUpperCase();

    if (!/^#[0-9A-F]{6}$/.test(normalized)) {
      throw new ValidationError(
        "Time category colors must use six-digit hexadecimal notation.",
      );
    }

    return normalized;
  }
}
