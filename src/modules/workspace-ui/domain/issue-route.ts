export function issueDetailPath(
  workspaceSlug: string,
  issueIdValue: string,
  projectId: string | null,
): string {
  const workspace = encodeURIComponent(workspaceSlug);
  const issueId = encodeURIComponent(issueIdValue);
  return projectId
    ? `/app/${workspace}/projects/${encodeURIComponent(projectId)}/issues/${issueId}`
    : `/app/${workspace}/issues/${issueId}`;
}
