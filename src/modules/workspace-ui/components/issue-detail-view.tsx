"use client";

import {
  CircleDot,
  Clock3,
  FolderKanban,
  GitBranch,
  Shapes,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAddIssueCommentMutation, useIssueCommentsQuery } from "@/modules/workspace-ui/application/use-issue-comment-queries";
import { useIssueMetadataQuery, useReplaceIssueLabelsMutation } from "@/modules/workspace-ui/application/use-issue-metadata-queries";
import { useIssueQuery, useUpdateIssueDetailMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useIssueTimeLogsQuery } from "@/modules/workspace-ui/application/use-timer-query";
import { useClientsQuery, useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { EntityHeader } from "@/modules/workspace-ui/components/entity-header";
import { IssueActivity } from "@/modules/workspace-ui/components/issue-activity";
import { IssuePriorityProperty, IssueStatusProperty } from "@/modules/workspace-ui/components/issue-status-priority-properties";
import { IssueTimeCharts } from "@/modules/workspace-ui/components/issue-time-charts";
import { LabelProperty } from "@/modules/workspace-ui/components/label-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";
import { favoriteFromIssue } from "@/modules/workspace-ui/domain/favorite-target";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function IssueDetailView({ workspaceSlug, issueId, embedded = false }: { workspaceSlug: string; issueId: string; embedded?: boolean }) {
  const issueQuery = useIssueQuery(workspaceSlug, issueId);
  const issue = issueQuery.data;
  if (issueQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading issue...</div>;
  if (!issue) return <div className="p-6 text-sm text-destructive">{issueQuery.error?.message ?? "Issue not found."}</div>;
  return <LoadedIssueDetail embedded={embedded} issue={issue} workspaceSlug={workspaceSlug} />;
}

function LoadedIssueDetail({ embedded, issue, workspaceSlug }: { embedded: boolean; issue: IssueRecord; workspaceSlug: string }) {
  const update = useUpdateIssueDetailMutation(workspaceSlug, issue.id);
  const membersQuery = useMembersQuery(workspaceSlug);
  const clientsQuery = useClientsQuery(workspaceSlug);
  const projectsQuery = useProjectsQuery(workspaceSlug, issue.clientId);
  const projects = projectsQuery.data ?? [];
  const project = projects.find((item) => item.id === issue.projectId);
  const client = clientsQuery.data?.find((item) => item.id === issue.clientId);
  const branchesQuery = useProjectBranchesQuery(workspaceSlug, issue.projectId);
  const statusesQuery = useWorkflowStatusesQuery(
    workspaceSlug,
    project?.workflowId ?? client?.workflowId ?? null,
  );
  const metadataQuery = useIssueMetadataQuery(workspaceSlug);
  const labelsMutation = useReplaceIssueLabelsMutation(workspaceSlug, issue.id);
  const commentsQuery = useIssueCommentsQuery(workspaceSlug, issue.id);
  const timeLogsQuery = useIssueTimeLogsQuery(workspaceSlug, issue.id);
  const addComment = useAddIssueCommentMutation(workspaceSlug, issue.id);
  const [comment, setComment] = useState("");
  const patch = (request: Record<string, unknown>, optimistic: Partial<IssueRecord>) => update.mutate({ issueId: issue.id, expectedVersion: issue.version, ...request, optimistic });

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    addComment.mutate(comment.trim(), { onSuccess: () => setComment("") });
  };

  return (
    <>
      <EntityHeader
        allowDelete={client?.canEdit ?? false}
        canonicalHref={issueDetailPath(workspaceSlug, issue.id, issue.projectId)}
        breadcrumbs={[
          {
            label: issue.clientName,
            href: `/app/${workspaceSlug}/clients/${issue.clientId}/overview`,
            icon: <ClientIcon className="size-6" client={{ name: issue.clientName, iconType: issue.clientIconType, iconKey: issue.clientIconKey, iconColor: issue.clientIconColor }} iconClassName={issue.clientIconType === "emoji" ? "text-xs" : "size-3.5"} />,
          },
          { label: "Issues", href: `/app/${workspaceSlug}/clients/${issue.clientId}/issues` },
        ]}
        favoriteTarget={favoriteFromIssue(issue)}
        icon={<span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><CircleDot className="size-3.5" /></span>}
        title={`${issue.identifier} ${issue.title}`}
        workspaceSlug={workspaceSlug}
        showSidebarTrigger={!embedded}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_260px] gap-16 px-8 py-12 max-lg:grid-cols-1 max-lg:gap-10 max-md:px-5 max-md:py-8">
          <main className="min-w-0">
            <Input
              className="h-auto border-0 px-0 text-[1.65rem] font-semibold leading-tight shadow-none focus-visible:ring-0"
              defaultValue={issue.title}
              maxLength={240}
              onBlur={(event) => {
                const title = event.target.value.trim();
                if (title.length >= 2 && title !== issue.title) patch({ title }, { title });
              }}
            />
            <Textarea
              className="mt-6 min-h-28 resize-y border-0 bg-transparent p-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0"
              defaultValue={issue.description ?? ""}
              maxLength={20_000}
              placeholder="Add description..."
              onBlur={(event) => {
                const description = event.target.value.trim() || null;
                if (description !== issue.description) patch({ description }, { description });
              }}
            />

            <IssueActivity
              comment={comment}
              comments={commentsQuery.data ?? []}
              error={addComment.error?.message}
              issueId={issue.id}
              issueTitle={issue.title}
              loading={commentsQuery.isLoading || timeLogsQuery.isLoading}
              logs={timeLogsQuery.data ?? []}
              pending={addComment.isPending}
              workspaceSlug={workspaceSlug}
              onCommentChange={setComment}
              onSubmit={submitComment}
            />
          </main>

          <aside className="min-w-0 self-start max-lg:border-t max-lg:pt-8 lg:sticky lg:top-6">
            <PropertySection title="Properties">
              <IssueStatusProperty statuses={statusesQuery.data ?? []} statusColor={issue.statusColor} statusId={issue.statusId} statusName={issue.statusName} disabled={!statusesQuery.data?.length} onChange={(status) => patch({ statusId: status.id }, { statusId: status.id, statusName: status.name, statusColor: status.color })} />
              <IssuePriorityProperty value={issue.priority} onChange={(priority) => patch({ priority }, { priority })} />
              <AssigneeProperty members={membersQuery.data ?? []} value={issue.assignees} onChange={(assignees) => patch({ assigneeMembershipIds: assignees.map((item) => item.membershipId) }, { assignees })} />
            </PropertySection>

            <PropertySection title="Labels">
              <LabelProperty options={metadataQuery.data?.labels ?? []} value={issue.labels} onChange={(labels) => labelsMutation.mutate({ labelIds: labels.map((item) => item.id), optimistic: labels })} />
            </PropertySection>

            <PropertySection title="Project">
              <OptionProperty allowEmpty icon={FolderKanban} label="Project" options={projects.map((item) => ({ value: item.id, label: item.name }))} placeholder="No project" value={issue.projectId} onChange={(projectId) => patch({ projectId }, { projectId, projectName: projects.find((item) => item.id === projectId)?.name ?? null, branchId: null, branchName: null })} />
              {issue.projectId ? <OptionProperty allowEmpty icon={GitBranch} label="Branch" options={(branchesQuery.data ?? []).map((item) => ({ value: item.id, label: item.name }))} placeholder="Main" value={issue.branchId} onChange={(branchId) => patch({ branchId }, { branchId, branchName: branchesQuery.data?.find((item) => item.id === branchId)?.name ?? null })} /> : null}
            </PropertySection>

            <PropertySection title="Details">
              <OptionProperty allowEmpty icon={Shapes} label="Issue type" options={(metadataQuery.data?.issueTypes ?? []).map((item) => ({ value: item.id, label: item.name, color: item.color }))} placeholder="No type" value={issue.issueTypeId} onChange={(issueTypeId) => {
                const type = metadataQuery.data?.issueTypes.find((item) => item.id === issueTypeId);
                patch({ issueTypeId }, { issueTypeId, issueTypeName: type?.name ?? null, issueTypeColor: type?.color ?? null });
              }} />
              <DateProperty label="Due date" value={issue.dueAt} onChange={(dueAt) => patch({ dueAt }, { dueAt })} />
              <EstimateProperty value={issue.estimateMinutes} onChange={(estimateMinutes) => patch({ estimateMinutes }, { estimateMinutes })} />
            </PropertySection>

            <IssueTimeCharts logs={timeLogsQuery.data ?? []} />

            {update.error || labelsMutation.error ? <p className="mt-4 text-xs text-destructive">{update.error?.message ?? labelsMutation.error?.message}</p> : null}
          </aside>
        </div>
      </div>
    </>
  );
}

function PropertySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <div className="mt-2 grid gap-0.5 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:max-w-none [&_[data-slot=button]]:justify-start">
        {children}
      </div>
    </section>
  );
}

function EstimateProperty({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const [minutes, setMinutes] = useState(value?.toString() ?? "");
  return (
    <Popover>
      <PopoverTrigger asChild><span><PropertyTrigger icon={Clock3} label="Estimate" value={value ? `${value} min` : "Add estimate"} /></span></PopoverTrigger>
      <PopoverContent align="start" className="grid w-56 gap-2 p-3">
        <span className="text-xs font-medium">Estimate in minutes</span>
        <Input min={0} type="number" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        <Button size="sm" onClick={() => onChange(minutes ? Number(minutes) : null)}>Apply estimate</Button>
      </PopoverContent>
    </Popover>
  );
}
