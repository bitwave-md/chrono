"use client";

import { ChevronRight, CircleDashed, Clock3 } from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useReplaceIssueListLabelsMutation, useIssueMetadataQuery } from "@/modules/workspace-ui/application/use-issue-metadata-queries";
import { useUpdateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useMembersQuery, useProjectsQuery, useWorkflowStatusMapsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import {
  IssueAssigneesTrigger,
  IssueLabelsTrigger,
  IssuePriorityTrigger,
  IssueStatusTrigger,
  WorkflowStatusIcon,
} from "@/modules/workspace-ui/components/issue-row-properties";
import { buildIssueGroups, type IssueGroupRecord } from "@/modules/workspace-ui/domain/issue-list-groups";
import type { IssueRecord, WorkflowStatusRecord } from "@/modules/workspace-ui/domain/workspace-types";
import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

interface IssueListProps {
  workspaceSlug: string;
  clientId: string | null;
  filters: IssueQueryFilters;
  issues: IssueRecord[];
  statuses?: WorkflowStatusRecord[];
  focusedIssueId: string | null;
  onFocus: (issueId: string) => void;
  onOpen: (issueId: string) => void;
}

export function IssueList(props: IssueListProps) {
  const membersQuery = useMembersQuery(props.workspaceSlug);
  const projectsQuery = useProjectsQuery(props.workspaceSlug, props.clientId);
  const metadataQuery = useIssueMetadataQuery(props.workspaceSlug);
  const updateIssue = useUpdateIssueMutation(
    props.workspaceSlug,
    props.clientId,
    props.filters,
  );
  const replaceLabels = useReplaceIssueListLabelsMutation(
    props.workspaceSlug,
    props.clientId,
    props.filters,
  );
  const projects = projectsQuery.data ?? [];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const workflowStatuses = useWorkflowStatusMapsQuery(
    props.workspaceSlug,
    props.issues.flatMap((issue) => {
      const workflowId = issue.projectId ? projectById.get(issue.projectId)?.workflowId : null;
      return workflowId ? [workflowId] : [];
    }),
  );
  const groups = useMemo(
    () => buildIssueGroups(props.issues, props.statuses),
    [props.issues, props.statuses],
  );

  if (!props.issues.length) {
    return (
      <div className="grid min-h-[calc(100svh-190px)] place-content-center justify-items-center text-center">
        <CircleDashed className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-sm font-medium">No issues in this view</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Create an Issue to start tracking work here.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4" role="list">
      {groups.map((group) => (
        <IssueGroup
          group={group}
          key={group.key}
          renderIssue={(issue) => {
            const project = issue.projectId ? projectById.get(issue.projectId) : null;
            const disabled = Boolean(issue.optimistic);
            return (
              <IssueRow
                disabled={disabled}
                focused={props.focusedIssueId === issue.id}
                issue={issue}
                key={issue.id}
                labelOptions={metadataQuery.data?.labels ?? []}
                members={membersQuery.data ?? []}
                statuses={project ? workflowStatuses.get(project.workflowId) ?? [] : []}
                onAssigneesChange={(assignees) => updateIssue.mutate({
                  issueId: issue.id,
                  expectedVersion: issue.version,
                  assigneeMembershipIds: assignees.map((item) => item.membershipId),
                  optimistic: { assignees },
                })}
                onFocus={() => props.onFocus(issue.id)}
                onLabelsChange={(labels) => replaceLabels.mutate({
                  issueId: issue.id,
                  labelIds: labels.map((label) => label.id),
                  optimistic: labels,
                })}
                onOpen={() => props.onOpen(issue.id)}
                onPriorityChange={(priority) => updateIssue.mutate({
                  issueId: issue.id,
                  expectedVersion: issue.version,
                  priority,
                  optimistic: { priority },
                })}
                onStatusChange={(status) => updateIssue.mutate({
                  issueId: issue.id,
                  expectedVersion: issue.version,
                  statusId: status.id,
                  optimistic: {
                    statusId: status.id,
                    statusName: status.name,
                    statusColor: status.color,
                  },
                })}
              />
            );
          }}
        />
      ))}
    </div>
  );
}

function IssueGroup({
  group,
  renderIssue,
}: {
  group: IssueGroupRecord;
  renderIssue: (issue: IssueRecord) => React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="mx-2 mt-2 flex h-10 w-[calc(100%-1rem)] items-center gap-2 rounded-md bg-muted/50 px-4 text-left text-xs font-medium hover:bg-muted/80" type="button">
          <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
          <WorkflowStatusIcon category={group.category} color={group.color} />
          <span>{group.name}</span>
          <span className="text-muted-foreground">{group.issues.length}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {group.issues.map(renderIssue)}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface IssueRowProps {
  statuses: WorkflowStatusRecord[];
  issue: IssueRecord;
  labelOptions: IssueRecord["labels"];
  members: Parameters<typeof IssueAssigneesTrigger>[0]["members"];
  focused: boolean;
  disabled: boolean;
  onFocus: () => void;
  onOpen: () => void;
  onPriorityChange: Parameters<typeof IssuePriorityTrigger>[0]["onChange"];
  onStatusChange: Parameters<typeof IssueStatusTrigger>[0]["onChange"];
  onLabelsChange: Parameters<typeof IssueLabelsTrigger>[0]["onChange"];
  onAssigneesChange: Parameters<typeof IssueAssigneesTrigger>[0]["onChange"];
}

function IssueRow(props: IssueRowProps) {
  const openWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onOpen();
    }
  };

  return (
    <div
      className={cn(
        "group/issue relative grid min-h-12 cursor-pointer grid-cols-[28px_76px_28px_minmax(160px,1fr)_minmax(0,auto)_32px] items-center gap-1 px-10 text-sm hover:bg-accent/45 focus-visible:bg-accent/60 focus-visible:outline-none max-md:grid-cols-[28px_64px_28px_minmax(0,1fr)_32px] max-md:px-3",
        props.focused && "bg-accent/70",
        props.issue.optimistic && "opacity-60",
      )}
      role="link"
      tabIndex={0}
      onClick={props.onOpen}
      onFocus={props.onFocus}
      onKeyDown={openWithKeyboard}
      onMouseEnter={props.onFocus}
    >
      <IssuePriorityTrigger disabled={props.disabled} value={props.issue.priority} onChange={props.onPriorityChange} />
      <span className="truncate font-mono text-xs text-muted-foreground">{props.issue.identifier}</span>
      <IssueStatusTrigger
        disabled={props.disabled}
        issue={props.issue}
        statuses={props.statuses}
        onChange={props.onStatusChange}
      />
      <span className="min-w-0 truncate font-medium">{props.issue.title}</span>
      <span className="min-w-0 justify-self-end max-md:hidden">
        <IssueLabelsTrigger
          disabled={props.disabled}
          options={props.labelOptions}
          value={props.issue.labels}
          onChange={props.onLabelsChange}
        />
      </span>
      <IssueAssigneesTrigger
        disabled={props.disabled}
        members={props.members}
        value={props.issue.assignees}
        onChange={props.onAssigneesChange}
      />
      {props.issue.optimistic ? (
        <span className="absolute right-12 bottom-0.5 flex items-center gap-1 text-[0.6rem] text-muted-foreground">
          <Clock3 className="size-3" /> Saving
        </span>
      ) : null}
    </div>
  );
}
