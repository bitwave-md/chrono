import { ClientRouteView } from "@/modules/workspace-ui/components/client-route-view";

export default async function ClientOverviewPage({ params }: { params: Promise<{ workspaceSlug: string; clientId: string }> }) {
  const values = await params;
  return <ClientRouteView clientId={values.clientId} view="overview" workspaceSlug={values.workspaceSlug} />;
}
