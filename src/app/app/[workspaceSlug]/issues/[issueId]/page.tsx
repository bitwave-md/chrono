import { IssueDetailView } from "@/modules/workspace-ui/components/issue-detail-view";

export default async function IssuePage({ params }: { params: Promise<{ workspaceSlug: string; issueId: string }> }) {
  const values = await params;
  return <IssueDetailView issueId={values.issueId} workspaceSlug={values.workspaceSlug} />;
}
