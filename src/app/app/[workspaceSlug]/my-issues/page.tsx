import { IssueCollectionView } from "@/modules/workspace-ui/components/issue-collection-view";

export default async function MyIssuesPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return <IssueCollectionView description="Issues currently assigned to you." mine title="My Issues" workspaceSlug={workspaceSlug} />;
}
