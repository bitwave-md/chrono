import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { userPreferences, users } from "@/db/schema";
import { NotFoundError, ValidationError } from "@/modules/shared/application/application-error";

export type UserTheme = "dark" | "light" | "system";
export type InterfaceDensity = "compact" | "comfortable";
export type IssueViewPreference = "list" | "board";

export class AccountSettingsService {
  async profile(userId: string) {
    const [profile] = await db.select({ id: users.id, name: users.name, email: users.email, image: users.image }).from(users).where(eq(users.id, userId)).limit(1);
    if (!profile) throw new NotFoundError("User profile not found.");
    return profile;
  }

  async updateProfile(userId: string, nameValue: string) {
    const name = nameValue.trim();
    if (name.length < 2 || name.length > 120) throw new ValidationError("Names must contain 2-120 characters.");
    const [profile] = await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id, name: users.name, email: users.email, image: users.image });
    if (!profile) throw new NotFoundError("User profile not found.");
    return profile;
  }

  async preferences(userId: string) {
    await db.insert(userPreferences).values({ userId }).onConflictDoNothing();
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return preferences!;
  }

  async updatePreferences(userId: string, input: {
    theme?: UserTheme;
    density?: InterfaceDensity;
    issueView?: IssueViewPreference;
    sidebarCollapsed?: boolean;
  }) {
    await db.insert(userPreferences).values({ userId }).onConflictDoNothing();
    const [preferences] = await db.update(userPreferences).set({ ...input, updatedAt: new Date() }).where(eq(userPreferences.userId, userId)).returning();
    return preferences!;
  }
}
