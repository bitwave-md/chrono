import { ClientRouteView } from "@/modules/workspace-ui/components/client-route-view";

export default async function ClientTimePage({ params }: { params: Promise<{ workspaceSlug: string; clientId: string }> }) {
  const values = await params;
  return <ClientRouteView clientId={values.clientId} view="time" workspaceSlug={values.workspaceSlug} />;
}
