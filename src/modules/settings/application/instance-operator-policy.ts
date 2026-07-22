import type { Principal } from "@/modules/authorization/domain/principal";
import { EmailAddress } from "@/modules/auth/domain/email-address";
import { ForbiddenError } from "@/modules/shared/application/application-error";

export class InstanceOperatorPolicy {
  isOperator(principal: Principal): boolean {
    const configured = process.env.AUTH_BOOTSTRAP_EMAIL;
    return Boolean(configured && new EmailAddress(configured).value === new EmailAddress(principal.email).value);
  }

  assertOperator(principal: Principal): void {
    if (!this.isOperator(principal)) throw new ForbiddenError("Only the instance operator may access administration settings.");
  }
}
