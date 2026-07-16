import { IssueDetailView } from "@/modules/workspace-ui/components/issue-detail-view";

export default async function ProjectIssuePage({ params }: { params: Promise<{ workspaceSlug: string; projectId: string; issueId: string }> }) {
  const values = await params;
  return <IssueDetailView issueId={values.issueId} workspaceSlug={values.workspaceSlug} />;
}
