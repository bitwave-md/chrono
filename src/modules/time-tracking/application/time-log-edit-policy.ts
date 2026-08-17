import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError } from "@/modules/shared/application/application-error";

export class TimeLogEditPolicy {
  assertCanEdit(principal: Principal, workerUserId: string): void {
    if (principal.role === "guest") {
      throw new ForbiddenError("Guests cannot edit time entries.");
    }

    if (
      principal.role === "member" &&
      principal.userId !== workerUserId
    ) {
      throw new ForbiddenError("Members can only edit their own time entries.");
    }
  }
}
