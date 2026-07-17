import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError } from "@/modules/shared/application/application-error";

export class WorkspacePolicy {
  assertCanManageClients(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError("Only workspace owners and admins manage clients.");
    }
  }

  assertCanManageProjects(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError("Only workspace owners and admins manage Projects.");
    }
  }

  assertCanContribute(principal: Principal): void {
    if (principal.role === "guest") {
      throw new ForbiddenError("Guest contribution requires client access.");
    }
  }

  assertCanManageTimeCategories(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError(
        "Only workspace owners and admins manage time categories.",
      );
    }
  }

  assertCanViewTimeReports(principal: Principal): void {
    if (principal.role !== "owner" && principal.role !== "admin") {
      throw new ForbiddenError(
        "Only workspace owners and admins view workspace time reports.",
      );
    }
  }
}
