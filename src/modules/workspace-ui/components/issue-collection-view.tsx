"use client";

import { Columns3, List, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useIssuesQuery, useUpdateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useClientsQuery, useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { IssueBoard } from "@/modules/workspace-ui/components/issue-board";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { IssueList } from "@/modules/workspace-ui/components/issue-list";
import { RouteHeader, type BreadcrumbItem } from "@/modules/workspace-ui/components/route-header";
import type { IssueGroupRecord } from "@/modules/workspace-ui/domain/issue-list-groups";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import { useWorkspaceOverlay, useWorkspaceView } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface IssueCollectionViewProps {
  workspaceSlug: string;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  clientId?: string | null;
  projectId?: string | null;
  mine?: boolean;
  embedded?: boolean;
}

export function IssueCollectionView(props: IssueCollectionViewProps) {
  const router = useRouter();
  const viewMode = useWorkspaceView((state) => state.viewMode);
  const focusedIssueId = useWorkspaceView((state) => state.focusedIssueId);
  const setViewMode = useWorkspaceView((state) => state.setViewMode);
  const focusIssue = useWorkspaceView((state) => state.focusIssue);
  const openCreateIssue = useWorkspaceOverlay((state) => state.openCreateIssue);
  const [createStatusId, setCreateStatusId] = useState<string | null>(null);
  const filters = useMemo(() => ({
    ...(props.projectId ? { projectId: props.projectId } : {}),
    ...(props.mine ? { mine: true } : {}),
  }), [props.mine, props.projectId]);
  const issuesQuery = useIssuesQuery(props.workspaceSlug, props.clientId ?? null, filters);
  const issues = issuesQuery.data ?? [];
  const projectsQuery = useProjectsQuery(props.workspaceSlug, props.clientId ?? null);
  const clientsQuery = useClientsQuery(props.workspaceSlug);
  const membersQuery = useMembersQuery(props.workspaceSlug);
  const projects = projectsQuery.data ?? [];
  const project = projects.find((candidate) => candidate.id === props.projectId);
  const client = clientsQuery.data?.find((candidate) => candidate.id === props.clientId);
  const statusesQuery = useWorkflowStatusesQuery(props.workspaceSlug, project?.workflowId ?? null);
  const clientStatusesQuery = useWorkflowStatusesQuery(
    props.workspaceSlug,
    client?.workflowId ?? null,
  );
  const updateIssue = useUpdateIssueMutation(props.workspaceSlug, props.clientId ?? null, filters);
  const clientAggregate = Boolean(
    client && !props.projectId && clientStatusesQuery.data?.length,
  );

  const createInGroup = (group: IssueGroupRecord) => {
    const statuses = clientStatusesQuery.data ?? [];
    const status = statuses.find((candidate) => candidate.category === group.category)
      ?? statuses.find((candidate) => candidate.name === group.name)
      ?? statuses.find((candidate) => candidate.isDefault);
    if (status) setCreateStatusId(status.id);
  };

  const openIssue = (issueId: string) => {
    const issue = issues.find((candidate) => candidate.id === issueId);
    router.push(issueDetailPath(props.workspaceSlug, issueId, issue?.projectId ?? null));
  };
  const viewActions = (
    <>
      <Button aria-label="List view" size="icon-sm" variant={viewMode === "list" ? "secondary" : "ghost"} onClick={() => setViewMode("list")}><List /></Button>
      {props.projectId ? <Button aria-label="Board view" size="icon-sm" variant={viewMode === "board" ? "secondary" : "ghost"} onClick={() => setViewMode("board")}><Columns3 /></Button> : null}
    </>
  );

  return (
    <>
      {!props.embedded ? (
        <RouteHeader
          actions={<>{viewActions}<Button size="sm" onClick={openCreateIssue}><Plus />New issue</Button></>}
          breadcrumbs={props.breadcrumbs}
          description={props.description}
          title={props.title}
        />
      ) : null}
      <section className={props.embedded ? "min-h-0 flex-1 pb-3" : "min-h-0 flex-1 py-3"} aria-live="polite">
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
          <IssueList
            clientId={props.clientId ?? null}
            filters={filters}
            focusedIssueId={focusedIssueId}
            issues={issues}
            showClient={Boolean(props.mine)}
            statuses={statusesQuery.data ?? []}
            workspaceSlug={props.workspaceSlug}
            onCreateEmpty={clientAggregate ? () => {
              const defaultStatus = clientStatusesQuery.data?.find((status) => status.isDefault);
              if (defaultStatus) setCreateStatusId(defaultStatus.id);
            } : undefined}
            onCreateInGroup={clientAggregate ? createInGroup : undefined}
            onFocus={focusIssue}
            onOpen={openIssue}
          />
        )}
      </section>
      {client && createStatusId ? (
        <CreateIssueDialog
          branches={[]}
          clientId={client.id}
          filters={filters}
          initialStatusId={createStatusId}
          members={membersQuery.data ?? []}
          open
          projects={projects}
          selectedBranchId={null}
          selectedProjectId={null}
          workspaceSlug={props.workspaceSlug}
          onOpenChange={(open) => {
            if (!open) setCreateStatusId(null);
          }}
        />
      ) : null}
    </>
  );
}
