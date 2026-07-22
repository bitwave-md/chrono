import { InboxView } from "@/modules/workspace-ui/components/inbox-view";

export default async function InboxPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return <InboxView workspaceSlug={workspaceSlug} />;
}
