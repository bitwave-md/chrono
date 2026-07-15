import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { isUniqueViolation } from "@/db/postgres-error";
import { teams } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { WorkspacePolicy } from "@/modules/authorization/domain/workspace-policy";
import {
  ConflictError,
  ValidationError,
} from "@/modules/shared/application/application-error";
import { TeamKey } from "@/modules/teams/domain/team-key";

export interface CreateTeamInput {
  name: string;
  key: string;
  description: string | null;
}

export class TeamService {
  readonly #policy = new WorkspacePolicy();

  async list(principal: Principal) {
    return db
      .select({
        id: teams.id,
        name: teams.name,
        key: teams.key,
        description: teams.description,
      })
      .from(teams)
      .where(
        and(
          eq(teams.workspaceId, principal.workspaceId),
          isNull(teams.archivedAt),
        ),
      )
      .orderBy(asc(teams.name));
  }

  async create(principal: Principal, input: CreateTeamInput) {
    this.#policy.assertCanManageTeams(principal);

    const name = input.name.trim();
    const key = new TeamKey(input.key).value;

    if (name.length < 2 || name.length > 120) {
      throw new ValidationError("Team names must contain 2-120 characters.");
    }

    try {
      const [team] = await db
        .insert(teams)
        .values({
          workspaceId: principal.workspaceId,
          name,
          key,
          description: input.description,
        })
        .returning({
          id: teams.id,
          name: teams.name,
          key: teams.key,
          description: teams.description,
        });

      return team;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("The team key is already in use.");
      }

      throw error;
    }
  }
}
