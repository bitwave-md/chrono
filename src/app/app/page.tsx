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
      <main className="grid min-h-svh place-items-center p-6 max-sm:p-3">
        <Card className="w-full max-w-lg p-10 shadow-xl max-sm:p-7">
          <CardHeader className="gap-5 p-0">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Access pending</p>
            <CardTitle asChild><h1 className="text-3xl tracking-tight">No active workspace membership</h1></CardTitle>
            <CardDescription className="text-base leading-7">
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
