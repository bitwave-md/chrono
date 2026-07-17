"use client";

import { Box, ChevronRight, CircleDashed, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReplaceIssueListLabelsMutation, useIssueMetadataQuery } from "@/modules/workspace-ui/application/use-issue-metadata-queries";
import { useUpdateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useClientsQuery, useMembersQuery, useProjectsQuery, useWorkflowStatusMapsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import {
  IssueAssigneesTrigger,
  IssueLabelsTrigger,
  IssuePriorityTrigger,
  IssueStatusTrigger,
} from "@/modules/workspace-ui/components/issue-row-properties";
import { WorkflowStatusIcon } from "@/modules/workspace-ui/components/issue-property-picker-content";
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
  onCreateInGroup?: (group: IssueGroupRecord) => void;
  onCreateEmpty?: () => void;
}

export function IssueList(props: IssueListProps) {
  const membersQuery = useMembersQuery(props.workspaceSlug);
  const clientsQuery = useClientsQuery(props.workspaceSlug);
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
  const clientById = new Map((clientsQuery.data ?? []).map((client) => [client.id, client]));
  const workflowStatuses = useWorkflowStatusMapsQuery(
    props.workspaceSlug,
    props.issues.flatMap((issue) => {
      const workflowId = issue.projectId
        ? projectById.get(issue.projectId)?.workflowId
        : clientById.get(issue.clientId)?.workflowId;
      return workflowId ? [workflowId] : [];
    }),
  );
  const statusById = new Map(
    [...workflowStatuses.values()]
      .flat()
      .map((status) => [status.id, status] as const),
  );
  const groups = buildIssueGroups(props.issues, props.statuses, statusById);

  if (!props.issues.length) {
    return (
      <div className="grid min-h-[calc(100svh-190px)] place-content-center justify-items-center text-center">
        <CircleDashed className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-sm font-medium">No issues in this view</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Create an Issue to start tracking work here.
        </p>
        {props.onCreateEmpty ? (
          <Button className="mt-4 rounded-full" size="sm" onClick={props.onCreateEmpty}>
            <Plus />New issue
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pb-4" role="list">
      {groups.map((group) => (
        <IssueGroup
          group={group}
          key={group.key}
          onCreate={props.onCreateInGroup}
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
                project={project}
                showProject={Boolean(props.clientId && !props.filters.projectId)}
                statuses={workflowStatuses.get(
                  project?.workflowId ?? clientById.get(issue.clientId)?.workflowId ?? "",
                ) ?? []}
                workspaceSlug={props.workspaceSlug}
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
  onCreate,
}: {
  group: IssueGroupRecord;
  renderIssue: (issue: IssueRecord) => React.ReactNode;
  onCreate?: (group: IssueGroupRecord) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="group/issue-header mx-2 mt-2 flex h-10 w-[calc(100%-1rem)] items-center rounded-md bg-muted/40 transition-colors hover:bg-muted/70"
        style={issueGroupHeaderStyle(group.color)}
      >
        <CollapsibleTrigger asChild>
          <button
            className="flex h-full min-w-0 flex-1 items-center gap-2 px-4 text-left text-xs font-medium"
            type="button"
          >
            <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
            <WorkflowStatusIcon category={group.category} color={group.color} />
            <span>{group.name}</span>
            <span className="text-muted-foreground">{group.issues.length}</span>
          </button>
        </CollapsibleTrigger>
        {onCreate ? (
          <Button
            aria-label={`New issue in ${group.name}`}
            className="mr-2 size-7 rounded-full opacity-60 hover:opacity-100"
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={() => onCreate(group)}
          >
            <Plus />
          </Button>
        ) : null}
      </div>
      <CollapsibleContent className="px-2">
        {group.issues.map(renderIssue)}
      </CollapsibleContent>
    </Collapsible>
  );
}

function issueGroupHeaderStyle(color: string | null): React.CSSProperties | undefined {
  const rgb = parseHexColor(color);
  if (!rgb) return undefined;
  const [red, green, blue] = rgb;
  return {
    backgroundImage: `linear-gradient(90deg, rgba(${red}, ${green}, ${blue}, 0.11), rgba(${red}, ${green}, ${blue}, 0.035) 46%, transparent 100%)`,
  };
}

function parseHexColor(color: string | null) {
  const match = color?.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!match) return null;
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ] as const;
}

interface IssueRowProps {
  statuses: WorkflowStatusRecord[];
  issue: IssueRecord;
  labelOptions: IssueRecord["labels"];
  members: Parameters<typeof IssueAssigneesTrigger>[0]["members"];
  focused: boolean;
  disabled: boolean;
  project: { id: string; name: string } | null | undefined;
  showProject: boolean;
  workspaceSlug: string;
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
        "group/issue relative grid min-h-12 cursor-pointer grid-cols-[28px_max-content_28px_minmax(160px,1fr)_minmax(0,auto)_32px] items-center px-10 text-sm hover:bg-accent/15 focus-visible:outline-none max-md:grid-cols-[28px_max-content_28px_minmax(0,1fr)_32px] max-md:px-3",
      )}
      role="link"
      tabIndex={0}
      onClick={props.onOpen}
      onFocus={props.onFocus}
      onKeyDown={openWithKeyboard}
      onMouseEnter={props.onFocus}
    >
      <IssuePriorityTrigger disabled={props.disabled} value={props.issue.priority} onChange={props.onPriorityChange} />
      <span className="truncate pr-0.5 font-mono text-xs text-muted-foreground">{props.issue.identifier}</span>
      <IssueStatusTrigger
        disabled={props.disabled}
        issue={props.issue}
        statuses={props.statuses}
        onChange={props.onStatusChange}
      />
      <span className="min-w-0 truncate font-medium">{props.issue.title}</span>
      <span className="flex min-w-0 items-center justify-self-end gap-1 max-md:hidden">
        <IssueLabelsTrigger
          disabled={props.disabled}
          options={props.labelOptions}
          value={props.issue.labels}
          onChange={props.onLabelsChange}
        />
        {props.showProject && props.project ? (
          <Link
            className="flex h-7 max-w-64 items-center gap-1.5 rounded-full border border-border/70 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            href={`/app/${props.workspaceSlug}/projects/${props.project.id}/issues${props.issue.branchId ? `?branch=${encodeURIComponent(props.issue.branchId)}` : ""}`}
            title={`Open ${props.project.name}${props.issue.branchName ? ` / ${props.issue.branchName}` : ""} Issues`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Box className="size-3.5 shrink-0" />
            <span className="truncate">{props.project.name}</span>
            {props.issue.branchName ? (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="truncate">{props.issue.branchName}</span>
              </>
            ) : null}
          </Link>
        ) : null}
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
