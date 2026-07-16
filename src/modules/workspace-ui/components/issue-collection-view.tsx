"use client";

import { Columns3, List, Plus } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useIssuesQuery, useUpdateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { IssueBoard } from "@/modules/workspace-ui/components/issue-board";
import { IssueList } from "@/modules/workspace-ui/components/issue-list";
import { RouteHeader } from "@/modules/workspace-ui/components/route-header";
import { flattenProjects } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceOverlay, useWorkspaceView } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface IssueCollectionViewProps {
  workspaceSlug: string;
  title: string;
  description: string;
  breadcrumbs?: string[];
  clientId?: string | null;
  projectId?: string | null;
  mine?: boolean;
}

export function IssueCollectionView(props: IssueCollectionViewProps) {
  const router = useRouter();
  const viewMode = useWorkspaceView((state) => state.viewMode);
  const focusedIssueId = useWorkspaceView((state) => state.focusedIssueId);
  const setViewMode = useWorkspaceView((state) => state.setViewMode);
  const focusIssue = useWorkspaceView((state) => state.focusIssue);
  const openCreateIssue = useWorkspaceOverlay((state) => state.openCreateIssue);
  const filters = useMemo(() => ({
    ...(props.projectId ? { projectId: props.projectId } : {}),
    ...(props.mine ? { mine: true } : {}),
  }), [props.mine, props.projectId]);
  const issuesQuery = useIssuesQuery(props.workspaceSlug, props.clientId ?? null, filters);
  const issues = issuesQuery.data ?? [];
  const projectsQuery = useProjectsQuery(props.workspaceSlug, props.clientId ?? null);
  const projects = useMemo(() => flattenProjects(projectsQuery.data ?? []), [projectsQuery.data]);
  const project = projects.find((candidate) => candidate.id === props.projectId);
  const statusesQuery = useWorkflowStatusesQuery(props.workspaceSlug, project?.effectiveWorkflowId ?? null);
  const updateIssue = useUpdateIssueMutation(props.workspaceSlug, props.clientId ?? null, filters);

  const openIssue = (issueId: string) => {
    const issue = issues.find((candidate) => candidate.id === issueId);
    const path = issue?.projectId
      ? `/app/${props.workspaceSlug}/projects/${issue.projectId}/issues/${issueId}`
      : `/app/${props.workspaceSlug}/issues/${issueId}`;
    router.push(path);
  };

  return (
    <>
      <RouteHeader
        actions={(
          <>
            <Button aria-label="List view" size="icon-sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}><List /></Button>
            {props.projectId ? <Button aria-label="Board view" size="icon-sm" variant={viewMode === "board" ? "secondary" : "ghost"} onClick={() => setViewMode("board")}><Columns3 /></Button> : null}
            <Button size="sm" onClick={openCreateIssue}><Plus />New issue</Button>
          </>
        )}
        breadcrumbs={props.breadcrumbs}
        description={props.description}
        title={props.title}
      />
      <section className="min-h-0 flex-1 py-3" aria-live="polite">
        {issuesQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading issues...</div>
        ) : issuesQuery.error ? (
          <div className="p-6 text-sm text-destructive">{issuesQuery.error.message}</div>
        ) : viewMode === "board" && props.projectId ? (
          <div className="px-4">
            <IssueBoard
              issues={issues}
              selectedProjectId={props.projectId}
              statuses={statusesQuery.data ?? []}
              onOpen={openIssue}
              onMove={(issue, status) => updateIssue.mutate({
                issueId: issue.id,
                expectedVersion: issue.version,
                statusId: status.id,
                optimistic: { statusId: status.id, statusName: status.name, statusColor: status.color },
              })}
            />
          </div>
        ) : (
          <IssueList focusedIssueId={focusedIssueId} issues={issues} onFocus={focusIssue} onOpen={openIssue} />
        )}
      </section>
    </>
  );
}
