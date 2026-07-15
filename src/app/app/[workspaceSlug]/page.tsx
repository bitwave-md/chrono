import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrincipalService } from "@/modules/authorization/application/principal-service";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";

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
    <main className="shell shell-centered">
      <section className="panel workspace-panel">
        <div>
          <p className="eyebrow">Phase 1 tracer bullet</p>
          <h1>{principal.workspaceName}</h1>
          <p className="muted">
            Authentication, database sessions, membership resolution, and
            tenant-scoped authorization are connected end to end.
          </p>
        </div>
        <dl className="facts">
          <div>
            <dt>Signed in as</dt>
            <dd>{principal.email}</dd>
          </div>
          <div>
            <dt>Workspace role</dt>
            <dd>{principal.role}</dd>
          </div>
          <div>
            <dt>Workspace slug</dt>
            <dd>{principal.workspaceSlug}</dd>
          </div>
        </dl>
        <Link className="button button-secondary" href="/api/auth/signout">
          Sign out
        </Link>
      </section>
    </main>
  );
}
