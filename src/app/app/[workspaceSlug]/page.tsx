import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { PrincipalService } from "@/modules/authorization/application/principal-service";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";
import { WorkspaceExperience } from "@/modules/workspace-ui/components/workspace-shell";

const principalService = new PrincipalService();

interface WorkspacePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/app");
  }

  const { workspaceSlug } = await params;
  const principal = await principalService.requireWorkspace(
    session.user.id,
    workspaceSlug,
  );

  if (!principal) {
    notFound();
  }

  return (
    <WorkspaceExperience
      workspace={{
        id: principal.workspaceId,
        name: principal.workspaceName,
        slug: principal.workspaceSlug,
        role: principal.role,
        userEmail: principal.email,
      }}
    />
  );
}
