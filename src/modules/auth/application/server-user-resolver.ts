import { getServerSession } from "next-auth";

import { authOptions } from "@/modules/auth/infrastructure/auth-options";
import { UnauthorizedError } from "@/modules/shared/application/application-error";

export class ServerUserResolver {
  async requireUserId(): Promise<string> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new UnauthorizedError();
    return session.user.id;
  }
}
