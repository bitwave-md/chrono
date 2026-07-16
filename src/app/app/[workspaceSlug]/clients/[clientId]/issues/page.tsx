import { ClientRouteView } from "@/modules/workspace-ui/components/client-route-view";

export default async function ClientIssuesPage({ params }: { params: Promise<{ workspaceSlug: string; clientId: string }> }) {
  const values = await params;
  return <ClientRouteView clientId={values.clientId} view="issues" workspaceSlug={values.workspaceSlug} />;
}
