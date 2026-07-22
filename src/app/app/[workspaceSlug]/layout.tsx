import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PrincipalService } from "@/modules/authorization/application/principal-service";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";
import { WorkspaceExperience } from "@/modules/workspace-ui/components/workspace-shell";
import { InstanceOperatorPolicy } from "@/modules/settings/application/instance-operator-policy";

const principalService = new PrincipalService();
const operatorPolicy = new InstanceOperatorPolicy();

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/app");

  const { workspaceSlug } = await params;
  const [principal, principals] = await Promise.all([
    principalService.requireWorkspace(session.user.id, workspaceSlug),
    principalService.listForUser(session.user.id),
  ]);
  if (!principal) notFound();

  return (
    <WorkspaceExperience
      workspace={{
        id: principal.workspaceId,
        name: principal.workspaceName,
        slug: principal.workspaceSlug,
        role: principal.role,
        userEmail: principal.email,
        isOperator: operatorPolicy.isOperator(principal),
      }}
      workspaces={principals.map((item) => ({
        id: item.workspaceId,
        name: item.workspaceName,
        slug: item.workspaceSlug,
        role: item.role,
        userEmail: item.email,
        isOperator: operatorPolicy.isOperator(item),
      }))}
    >
      {children}
    </WorkspaceExperience>
  );
}
