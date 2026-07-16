import { ClientRouteView } from "@/modules/workspace-ui/components/client-route-view";

export default async function ClientProjectsPage({ params }: { params: Promise<{ workspaceSlug: string; clientId: string }> }) {
  const values = await params;
  return <ClientRouteView clientId={values.clientId} view="projects" workspaceSlug={values.workspaceSlug} />;
}
