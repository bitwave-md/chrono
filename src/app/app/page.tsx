import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PrincipalService } from "@/modules/authorization/application/principal-service";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";

const principalService = new PrincipalService();

export default async function WorkspaceEntryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/app");
  }

  const [principal] = await principalService.listForUser(session.user.id);

  if (!principal) {
    return (
      <main className="shell shell-centered">
        <section className="panel panel-compact">
          <p className="eyebrow">Access pending</p>
          <h1>No active workspace membership</h1>
          <p className="muted">
            Ask a workspace administrator for an invitation, then request a new
            sign-in link.
          </p>
        </section>
      </main>
    );
  }

  redirect(`/app/${principal.workspaceSlug}`);
}
