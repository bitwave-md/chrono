import { getServerSession } from "next-auth";

import { PrincipalService } from "@/modules/authorization/application/principal-service";
import type { Principal } from "@/modules/authorization/domain/principal";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/modules/shared/application/application-error";

export class ServerPrincipalResolver {
  readonly #principalService = new PrincipalService();

  async requireWorkspace(workspaceSlug: string): Promise<Principal> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const principal = await this.#principalService.requireWorkspace(
      session.user.id,
      workspaceSlug,
    );

    if (!principal) {
      throw new ForbiddenError("The workspace is not accessible.");
    }

    return principal;
  }
}
