import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError } from "@/modules/shared/application/application-error";

export class InstanceOperatorPolicy {
  isOperator(principal: Principal): boolean {
    const initialWorkspace = process.env.AUTH_SETUP_WORKSPACE_SLUG || "bitwave";
    return principal.role === "owner" && principal.workspaceSlug === initialWorkspace;
  }

  assertOperator(principal: Principal): void {
    if (!this.isOperator(principal)) throw new ForbiddenError("Only the instance operator may access administration settings.");
  }
}
