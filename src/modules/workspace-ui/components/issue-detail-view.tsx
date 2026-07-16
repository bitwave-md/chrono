"use client";

import { CirclePlay, Clock3, FolderKanban, GitBranch, LoaderCircle, MessageSquare, Shapes, Square } from "lucide-react";
import { type FormEvent, useState } from "react";

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
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";

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
      <RouteHeader breadcrumbs={[
        { label: issue.clientName, href: `/app/${workspaceSlug}/clients/${issue.clientId}/issues` },
        issue.projectId
          ? { label: issue.projectName ?? "Project", href: `/app/${workspaceSlug}/projects/${issue.projectId}/issues` }
          : { label: "Client backlog", href: `/app/${workspaceSlug}/clients/${issue.clientId}/issues` },
      ]} title={issue.identifier} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] max-lg:grid-cols-1">
        <main className="min-w-0 border-r px-6 py-7 max-lg:border-r-0 max-md:px-4">
          <Input className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" defaultValue={issue.title} maxLength={240} onBlur={(event) => {
            const title = event.target.value.trim();
            if (title.length >= 2 && title !== issue.title) patch({ title }, { title });
          }} />
          <Textarea className="mt-5 min-h-40 resize-y border-0 bg-transparent p-0 leading-7 shadow-none focus-visible:ring-0" defaultValue={issue.description ?? ""} maxLength={20_000} placeholder="Add description..." onBlur={(event) => {
            const description = event.target.value.trim() || null;
            if (description !== issue.description) patch({ description }, { description });
          }} />

          <section className="mt-10 border-t pt-6">
            <h2 className="text-sm font-medium">Activity</h2>
            <div className="mt-5 grid gap-5">
              {(commentsQuery.data ?? []).map((item) => (
                <article className="flex gap-3" key={item.id}>
                  <Avatar className="size-7"><AvatarFallback className="text-[0.6rem]">{(item.authorName ?? item.authorEmail).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><strong className="text-sm">{item.authorName ?? item.authorEmail}</strong><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{item.body}</p></div>
                </article>
              ))}
              {!commentsQuery.isLoading && !commentsQuery.data?.length ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
            </div>
            <form className="mt-6 grid gap-2" onSubmit={submitComment}><Textarea placeholder="Leave a comment..." rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /><Button className="justify-self-end" disabled={!comment.trim() || addComment.isPending} size="sm" type="submit"><MessageSquare />Comment</Button></form>
          </section>
        </main>

        <aside className="px-4 py-5 max-lg:border-t">
          <h2 className="px-2 text-xs font-medium text-muted-foreground">Properties</h2>
          <div className="mt-2 grid justify-items-start gap-0.5">
            <IssueStatusProperty statuses={statusesQuery.data ?? []} statusColor={issue.statusColor} statusId={issue.statusId} statusName={issue.statusName} disabled={!issue.projectId} onChange={(status) => patch({ statusId: status.id }, { statusId: status.id, statusName: status.name, statusColor: status.color })} />
            <IssuePriorityProperty value={issue.priority} onChange={(priority) => patch({ priority }, { priority })} />
            <AssigneeProperty members={membersQuery.data ?? []} value={issue.assignees} onChange={(assignees) => patch({ assigneeMembershipIds: assignees.map((item) => item.membershipId) }, { assignees })} />
            <OptionProperty allowEmpty icon={FolderKanban} label="Project" options={projects.map((item) => ({ value: item.id, label: item.name }))} placeholder="Client backlog" value={issue.projectId} onChange={(projectId) => patch({ projectId }, { projectId, projectName: projects.find((item) => item.id === projectId)?.name ?? null, branchId: null, branchName: null, ...(projectId ? {} : { statusId: null, statusName: null, statusColor: null }) })} />
            {issue.projectId ? <OptionProperty allowEmpty icon={GitBranch} label="Branch" options={(branchesQuery.data ?? []).map((item) => ({ value: item.id, label: item.name }))} placeholder="Main" value={issue.branchId} onChange={(branchId) => patch({ branchId }, { branchId, branchName: branchesQuery.data?.find((item) => item.id === branchId)?.name ?? null })} /> : null}
            <OptionProperty allowEmpty icon={Shapes} label="Issue type" options={(metadataQuery.data?.issueTypes ?? []).map((item) => ({ value: item.id, label: item.name, color: item.color }))} placeholder="No type" value={issue.issueTypeId} onChange={(issueTypeId) => {
              const type = metadataQuery.data?.issueTypes.find((item) => item.id === issueTypeId);
              patch({ issueTypeId }, { issueTypeId, issueTypeName: type?.name ?? null, issueTypeColor: type?.color ?? null });
            }} />
            <LabelProperty options={metadataQuery.data?.labels ?? []} value={issue.labels} onChange={(labels) => labelsMutation.mutate({ labelIds: labels.map((item) => item.id), optimistic: labels })} />
            <DateProperty label="Due date" value={issue.dueAt} onChange={(dueAt) => patch({ dueAt }, { dueAt })} />
            <EstimateProperty value={issue.estimateMinutes} onChange={(estimateMinutes) => patch({ estimateMinutes }, { estimateMinutes })} />
          </div>

          <section className="mt-6 border-t pt-4"><h2 className="px-2 text-xs font-medium text-muted-foreground">Time tracking</h2><div className="mt-2 grid gap-2 px-2">
            {activeOnIssue ? <Button disabled={stopTimer.isPending} size="sm" variant="destructive" onClick={() => stopTimer.mutate()}>{stopTimer.isPending ? <LoaderCircle className="animate-spin" /> : <Square fill="currentColor" />}Stop timer</Button> : <Button disabled={anotherTimerActive || startTimer.isPending} size="sm" variant="secondary" onClick={() => startTimer.mutate({ issueId: issue.id, categoryId: null, note: issue.title })}>{startTimer.isPending ? <LoaderCircle className="animate-spin" /> : <CirclePlay />}{anotherTimerActive ? "Another timer is active" : "Start timer"}</Button>}
            <div className="flex gap-2"><Input aria-label="Manual minutes" className="h-8" min={1} type="number" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} /><Button disabled={manualTime.isPending || Number(manualMinutes) < 1} size="sm" variant="outline" onClick={() => manualTime.mutate({ issueId: issue.id, durationSeconds: Number(manualMinutes) * 60, note: issue.title })}>Log</Button></div>
            {manualTime.isSuccess ? <span className="text-xs text-emerald-500">Time logged.</span> : null}
          </div></section>
          {update.error || labelsMutation.error ? <p className="mt-4 px-2 text-xs text-destructive">{update.error?.message ?? labelsMutation.error?.message}</p> : null}
        </aside>
      </div>
    </>
  );
}

function EstimateProperty({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const [minutes, setMinutes] = useState(value?.toString() ?? "");
  return <Popover><PopoverTrigger asChild><span><PropertyTrigger icon={Clock3} label="Estimate" value={value ? `${value} min` : "Add estimate"} /></span></PopoverTrigger><PopoverContent align="start" className="grid w-56 gap-2 p-3"><span className="text-xs font-medium">Estimate in minutes</span><Input min={0} type="number" value={minutes} onChange={(event) => setMinutes(event.target.value)} /><Button size="sm" onClick={() => onChange(minutes ? Number(minutes) : null)}>Apply estimate</Button></PopoverContent></Popover>;
}
