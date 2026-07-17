"use client";

import {
  ArrowUp,
  CirclePlay,
  Clock3,
  FolderKanban,
  GitBranch,
  LoaderCircle,
  MoreHorizontal,
  Shapes,
  Square,
  Star,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAddIssueCommentMutation, useIssueCommentsQuery } from "@/modules/workspace-ui/application/use-issue-comment-queries";
import { useIssueMetadataQuery, useReplaceIssueLabelsMutation } from "@/modules/workspace-ui/application/use-issue-metadata-queries";
import { useIssueQuery, useUpdateIssueDetailMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useActiveTimerQuery, useManualTimeMutation, useStartTimerMutation, useStopTimerMutation } from "@/modules/workspace-ui/application/use-timer-query";
import { useMembersQuery, useProjectsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { IssuePriorityProperty, IssueStatusProperty } from "@/modules/workspace-ui/components/issue-status-priority-properties";
import { LabelProperty } from "@/modules/workspace-ui/components/label-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";
import { RouteHeader } from "@/modules/workspace-ui/components/route-header";
import type { IssueCommentRecord, IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function IssueDetailView({ workspaceSlug, issueId }: { workspaceSlug: string; issueId: string }) {
  const issueQuery = useIssueQuery(workspaceSlug, issueId);
  const issue = issueQuery.data;
  if (issueQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading issue...</div>;
  if (!issue) return <div className="p-6 text-sm text-destructive">{issueQuery.error?.message ?? "Issue not found."}</div>;
  return <LoadedIssueDetail issue={issue} workspaceSlug={workspaceSlug} />;
}

function LoadedIssueDetail({ issue, workspaceSlug }: { issue: IssueRecord; workspaceSlug: string }) {
  const update = useUpdateIssueDetailMutation(workspaceSlug, issue.id);
  const membersQuery = useMembersQuery(workspaceSlug);
  const projectsQuery = useProjectsQuery(workspaceSlug, issue.clientId);
  const projects = projectsQuery.data ?? [];
  const project = projects.find((item) => item.id === issue.projectId);
  const branchesQuery = useProjectBranchesQuery(workspaceSlug, issue.projectId);
  const statusesQuery = useWorkflowStatusesQuery(workspaceSlug, project?.workflowId ?? null);
  const metadataQuery = useIssueMetadataQuery(workspaceSlug);
  const labelsMutation = useReplaceIssueLabelsMutation(workspaceSlug, issue.id);
  const commentsQuery = useIssueCommentsQuery(workspaceSlug, issue.id);
  const addComment = useAddIssueCommentMutation(workspaceSlug, issue.id);
  const timerQuery = useActiveTimerQuery(workspaceSlug);
  const startTimer = useStartTimerMutation(workspaceSlug);
  const stopTimer = useStopTimerMutation(workspaceSlug);
  const manualTime = useManualTimeMutation(workspaceSlug);
  const [comment, setComment] = useState("");
  const [manualMinutes, setManualMinutes] = useState("30");
  const patch = (request: Record<string, unknown>, optimistic: Partial<IssueRecord>) => update.mutate({ issueId: issue.id, expectedVersion: issue.version, ...request, optimistic });
  const activeOnIssue = timerQuery.data?.timer?.issueId === issue.id;
  const anotherTimerActive = Boolean(timerQuery.data?.timer && !activeOnIssue);

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;
    addComment.mutate(comment.trim(), { onSuccess: () => setComment("") });
  };

  return (
    <>
      <RouteHeader
        actions={(
          <>
            <Button aria-label="Favorite Issue" size="icon-sm" variant="ghost"><Star /></Button>
            <Button aria-label="Issue actions" size="icon-sm" variant="ghost"><MoreHorizontal /></Button>
          </>
        )}
        breadcrumbs={[
          { label: issue.clientName, href: `/app/${workspaceSlug}/clients/${issue.clientId}/overview` },
          { label: "Issues", href: `/app/${workspaceSlug}/clients/${issue.clientId}/issues` },
        ]}
        showSearch={false}
        title={`${issue.identifier} ${issue.title}`}
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
              loading={commentsQuery.isLoading}
              pending={addComment.isPending}
              onCommentChange={setComment}
              onSubmit={submitComment}
            />
          </main>

          <aside className="min-w-0 self-start max-lg:border-t max-lg:pt-8 lg:sticky lg:top-6">
            <PropertySection title="Properties">
              <IssueStatusProperty statuses={statusesQuery.data ?? []} statusColor={issue.statusColor} statusId={issue.statusId} statusName={issue.statusName} disabled={!issue.projectId} onChange={(status) => patch({ statusId: status.id }, { statusId: status.id, statusName: status.name, statusColor: status.color })} />
              <IssuePriorityProperty value={issue.priority} onChange={(priority) => patch({ priority }, { priority })} />
              <AssigneeProperty members={membersQuery.data ?? []} value={issue.assignees} onChange={(assignees) => patch({ assigneeMembershipIds: assignees.map((item) => item.membershipId) }, { assignees })} />
            </PropertySection>

            <PropertySection title="Labels">
              <LabelProperty options={metadataQuery.data?.labels ?? []} value={issue.labels} onChange={(labels) => labelsMutation.mutate({ labelIds: labels.map((item) => item.id), optimistic: labels })} />
            </PropertySection>

            <PropertySection title="Project">
              <OptionProperty allowEmpty icon={FolderKanban} label="Project" options={projects.map((item) => ({ value: item.id, label: item.name }))} placeholder="Client backlog" value={issue.projectId} onChange={(projectId) => patch({ projectId }, { projectId, projectName: projects.find((item) => item.id === projectId)?.name ?? null, branchId: null, branchName: null, ...(projectId ? {} : { statusId: null, statusName: null, statusColor: null }) })} />
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

            <section className="mt-8 border-t pt-5">
              <h2 className="text-xs font-medium text-muted-foreground">Time tracking</h2>
              <div className="mt-3 grid gap-2">
                {activeOnIssue ? (
                  <Button className="justify-start" disabled={stopTimer.isPending} size="sm" variant="destructive" onClick={() => stopTimer.mutate()}>
                    {stopTimer.isPending ? <LoaderCircle className="animate-spin" /> : <Square fill="currentColor" />}Stop timer
                  </Button>
                ) : (
                  <Button className="justify-start" disabled={anotherTimerActive || startTimer.isPending} size="sm" variant="secondary" onClick={() => startTimer.mutate({ issueId: issue.id, categoryId: null, note: issue.title })}>
                    {startTimer.isPending ? <LoaderCircle className="animate-spin" /> : <CirclePlay />}{anotherTimerActive ? "Another timer is active" : "Start timer"}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Input aria-label="Manual minutes" className="h-8" min={1} type="number" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} />
                  <Button disabled={manualTime.isPending || Number(manualMinutes) < 1} size="sm" variant="outline" onClick={() => manualTime.mutate({ issueId: issue.id, durationSeconds: Number(manualMinutes) * 60, note: issue.title })}>Log</Button>
                </div>
                {manualTime.isSuccess ? <span className="text-xs text-emerald-500">Time logged.</span> : null}
              </div>
            </section>

            {update.error || labelsMutation.error ? <p className="mt-4 text-xs text-destructive">{update.error?.message ?? labelsMutation.error?.message}</p> : null}
          </aside>
        </div>
      </div>
    </>
  );
}

function IssueActivity({
  comments,
  comment,
  loading,
  pending,
  error,
  onCommentChange,
  onSubmit,
}: {
  comments: IssueCommentRecord[];
  comment: string;
  loading: boolean;
  pending: boolean;
  error?: string;
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className="mt-12 border-t pt-7">
      <h2 className="text-base font-semibold">Activity</h2>
      <div className="mt-6 grid gap-5">
        {comments.map((item) => (
          <article className="flex gap-3" key={item.id}>
            <Avatar className="mt-0.5 size-6"><AvatarFallback className="text-[0.55rem]">{(item.authorName ?? item.authorEmail).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <strong className="text-sm font-medium">{item.authorName ?? item.authorEmail}</strong>
                <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{item.body}</p>
            </div>
          </article>
        ))}
        {!loading && !comments.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
      </div>
      <form className="relative mt-6" onSubmit={onSubmit}>
        <Textarea className="min-h-28 resize-none bg-card/55 p-4 pb-12 leading-6" placeholder="Leave a comment..." value={comment} onChange={(event) => onCommentChange(event.target.value)} />
        <Button aria-label="Post comment" className="absolute right-3 bottom-3 rounded-full" disabled={!comment.trim() || pending} size="icon-sm" type="submit">
          {pending ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
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
