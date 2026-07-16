import { IssueCollectionView } from "@/modules/workspace-ui/components/issue-collection-view";

export default async function InboxPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return <IssueCollectionView description="Recent work across your accessible Clients." title="Inbox" workspaceSlug={workspaceSlug} />;
}
