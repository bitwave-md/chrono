import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError } from "@/modules/shared/application/application-error";

export class WorkspacePolicy {
  assertCanManageClients(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError("Only workspace owners and admins manage clients.");
    }
  }

  assertCanContribute(principal: Principal): void {
    if (principal.role === "guest") {
      throw new ForbiddenError("Guest contribution requires client access.");
    }
  }

  assertCanManageTeams(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError("Only workspace owners and admins manage teams.");
    }
  }
}
