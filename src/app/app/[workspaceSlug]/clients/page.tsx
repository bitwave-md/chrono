import { ClientDirectoryView } from "@/modules/workspace-ui/components/directory-views";

export default async function ClientsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return <ClientDirectoryView workspaceSlug={workspaceSlug} />;
}
