export interface IssueRouteIdentity {
  id: string;
  projectId: string | null;
}

export function issueDetailPath(
  workspaceSlug: string,
  issue: IssueRouteIdentity,
): string {
  const workspace = encodeURIComponent(workspaceSlug);
  const issueId = encodeURIComponent(issue.id);
  return issue.projectId
    ? `/app/${workspace}/projects/${encodeURIComponent(issue.projectId)}/issues/${issueId}`
    : `/app/${workspace}/issues/${issueId}`;
}
