import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card className="panel panel-compact">
          <CardHeader className="gap-5 p-0">
          <p className="eyebrow">Access pending</p>
          <CardTitle asChild><h1>No active workspace membership</h1></CardTitle>
          <CardDescription className="muted">
            Ask a workspace administrator for an invitation, then request a new
            sign-in link.
          </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  redirect(`/app/${principal.workspaceSlug}`);
}
