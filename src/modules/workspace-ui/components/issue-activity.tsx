"use client";

import { CircleCheck, CircleDot, CirclePlay, Clock3, FileText, LoaderCircle, Paperclip, Signal, Square } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddIssueCommentMutation } from "@/modules/workspace-ui/application/use-issue-comment-queries";
import { formatElapsed, useElapsedSeconds } from "@/modules/workspace-ui/application/use-elapsed-seconds";
import { useActiveTimerQuery, useManualTimeMutation, useStartTimerMutation, useStopTimerMutation } from "@/modules/workspace-ui/application/use-timer-query";
import { useTimeCategoriesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ManualTimeDatePicker } from "@/modules/workspace-ui/components/manual-time-date-picker";
import { IssueCommentComposer, type IssueCommentInput } from "@/modules/workspace-ui/components/issue-comment-composer";
import { TimeEntryTypePicker } from "@/modules/workspace-ui/components/time-entry-type-picker";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import { manualTimeStartedAt } from "@/modules/workspace-ui/domain/manual-time-entry-date";
import type { AttachmentRecord, IssueActivityEventRecord, IssueCommentRecord, TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function IssueActivity({
  comments,
  events,
  issueId,
  issueTitle,
  loading,
  logs,
  workspaceSlug,
}: {
  comments: IssueCommentRecord[];
  events: IssueActivityEventRecord[];
  issueId: string;
  issueTitle: string;
  loading: boolean;
  logs: TimeLogRecord[];
  workspaceSlug: string;
}) {
  const addComment = useAddIssueCommentMutation(workspaceSlug, issueId);
  const replies = comments.filter((comment) => comment.parentCommentId);
  const activity = [
    ...comments.filter((comment) => !comment.parentCommentId).map((item) => ({ kind: "comment" as const, date: item.createdAt, item })),
    ...logs.map((item) => ({ kind: "time" as const, date: item.endedAt, item })),
    ...events.map((item) => ({ kind: "event" as const, date: item.createdAt, item })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const submitComment = (input: IssueCommentInput) => addComment.mutateAsync(input);

  return (
    <section className="mt-12 border-t pt-7">
      <h2 className="text-base font-semibold">Activity</h2>
      <div className="mt-5 grid gap-2">
        {activity.map((entry) => entry.kind === "comment"
          ? <CommentActivityItem comment={entry.item} issueId={issueId} key={`comment-${entry.item.id}`} replies={replies.filter((reply) => reply.parentCommentId === entry.item.id)} workspaceSlug={workspaceSlug} onSubmit={submitComment} />
          : entry.kind === "time" ? <TimeActivityItem key={`time-${entry.item.id}`} log={entry.item} />
            : <EventActivityItem event={entry.item} key={`event-${entry.item.id}`} />)}
        {!loading && !activity.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
      </div>
      <div className="mt-5"><IssueCommentComposer issueId={issueId} placeholder="Leave a comment..." workspaceSlug={workspaceSlug} onSubmit={submitComment} /></div>
      {addComment.error ? <p className="mt-2 text-xs text-destructive">{addComment.error.message}</p> : null}
      <IssueTimeComposer issueId={issueId} issueTitle={issueTitle} workspaceSlug={workspaceSlug} />
    </section>
  );
}

function EventActivityItem({ event }: { event: IssueActivityEventRecord }) {
  const name = event.actorName ?? event.actorEmail;
  const presentation = eventPresentation(event);
  const Icon = presentation.icon;
  return (
    <article className="flex min-h-8 items-center gap-2.5 px-2 text-xs text-muted-foreground">
      <span className="grid size-5 shrink-0 place-items-center"><Icon className="size-4" /></span>
      <p className="min-w-0 flex-1"><span className="font-medium text-foreground/75">{name}</span> {presentation.text} <span className="whitespace-nowrap">· {relativeTime(event.createdAt)}</span></p>
    </article>
  );
}

function CommentActivityItem({ comment, issueId, replies, workspaceSlug, onSubmit }: { comment: IssueCommentRecord; issueId: string; replies: IssueCommentRecord[]; workspaceSlug: string; onSubmit: (input: IssueCommentInput) => Promise<unknown> }) {
  const name = comment.authorName ?? comment.authorEmail;
  return (
    <article className="my-2 overflow-hidden rounded-lg border bg-card/45">
      <div className="p-4">
        <CommentAuthor comment={comment} />
        {comment.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{comment.body}</p> : null}
        <CommentAttachments attachments={comment.attachments} workspaceSlug={workspaceSlug} />
      </div>
      {replies.length ? <div className="grid gap-4 border-t bg-muted/10 px-4 py-3">{replies.map((reply) => <div key={reply.id}><CommentAuthor comment={reply} />{reply.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{reply.body}</p> : null}<CommentAttachments attachments={reply.attachments} workspaceSlug={workspaceSlug} /></div>)}</div> : null}
      <IssueCommentComposer issueId={issueId} parentCommentId={comment.id} placeholder={`Reply to ${name}...`} workspaceSlug={workspaceSlug} onSubmit={onSubmit} />
    </article>
  );
}

function CommentAuthor({ comment }: { comment: IssueCommentRecord }) {
  const name = comment.authorName ?? comment.authorEmail;
  return <div className="flex items-center gap-2"><Avatar className="size-6"><AvatarImage alt="" src={comment.authorAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><strong className="text-sm font-medium">{name}</strong><span className="text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</span></div>;
}

function CommentAttachments({ attachments, workspaceSlug }: { attachments: AttachmentRecord[]; workspaceSlug: string }) {
  if (!attachments.length) return null;
  return <div className="mt-3 grid gap-2">{attachments.map((attachment) => {
    const href = `/api/workspaces/${workspaceSlug}/attachments/${attachment.id}/content`;
    return attachment.contentType.startsWith("image/")
      ? <a className="block overflow-hidden rounded-md border bg-muted/20" href={href} key={attachment.id} target="_blank" rel="noreferrer"><Image alt={attachment.filename} className="h-auto max-h-[34rem] w-full object-contain" height={720} src={href} unoptimized width={1280} /></a>
      : <a className="flex items-center gap-3 rounded-md border bg-background/45 px-3 py-2.5 hover:bg-muted/35" href={href} key={attachment.id} download><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><FileText className="size-4" /></span><span className="min-w-0"><strong className="block truncate text-sm font-medium">{attachment.filename}</strong><span className="text-xs text-muted-foreground">{formatBytes(attachment.sizeBytes)}</span></span></a>;
  })}</div>;
}

function TimeActivityItem({ log }: { log: TimeLogRecord }) {
  const name = log.workerName ?? log.workerEmail;
  return (
    <article className="flex min-h-8 items-center gap-2.5 px-2 text-xs text-muted-foreground">
      <span className="grid size-5 shrink-0 place-items-center"><Clock3 className="size-4" /></span>
      <p className="min-w-0 flex-1"><span className="font-medium text-foreground/75">{name}</span> logged <strong className="font-medium text-foreground/80">{formatLoggedDuration(log.durationSeconds)}</strong> as <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: log.categoryColor ?? "#6B7280" }} />{log.categoryName ?? "Uncategorized"}</span>{log.note ? ` · ${log.note}` : ""} <span className="whitespace-nowrap">· {relativeTime(log.endedAt)}</span></p>
    </article>
  );
}

function eventPresentation(event: IssueActivityEventRecord) {
  const from = typeof event.payload.from === "string" ? event.payload.from : "Unknown";
  const to = typeof event.payload.to === "string" ? event.payload.to : "Unknown";
  if (event.eventType === "issue_created") return { icon: CircleDot, text: "created the issue" };
  if (event.eventType === "status_changed") return { icon: CircleCheck, text: `moved from ${from} to ${to}` };
  if (event.eventType === "priority_changed") return { icon: Signal, text: `changed priority from ${capitalize(from)} to ${capitalize(to)}` };
  if (event.eventType === "attachment_uploaded") return { icon: Paperclip, text: `attached ${String(event.payload.filename ?? "a file")}` };
  return { icon: CircleDot, text: "updated the issue" };
}

function relativeTime(value: string): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function IssueTimeComposer({ issueId, issueTitle, workspaceSlug }: { issueId: string; issueTitle: string; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const categoriesQuery = useTimeCategoriesQuery(workspaceSlug);
  const timerQuery = useActiveTimerQuery(workspaceSlug);
  const startTimer = useStartTimerMutation(workspaceSlug);
  const stopTimer = useStopTimerMutation(workspaceSlug);
  const manualTime = useManualTimeMutation(workspaceSlug);
  const categories = categoriesQuery.data ?? [];
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [note, setNote] = useState("");
  const preferred = categories.find((item) => item.key === "developing") ?? categories[0];
  const categoryId = selectedCategoryId ?? preferred?.id ?? null;
  const activeOnIssue = timerQuery.data?.timer?.issueId === issueId;
  const anotherTimerActive = Boolean(timerQuery.data?.timer && !activeOnIssue);
  const elapsed = useElapsedSeconds(timerQuery.data?.timer?.startedAt ?? null, timerQuery.data?.serverNow ?? null);
  const hoursValue = Number(hours);
  const minutesValue = Number(minutes);
  const durationSeconds = (hoursValue * 60 + minutesValue) * 60;
  const validDuration = Number.isFinite(durationSeconds) && hoursValue >= 0 && hoursValue <= 24 && minutesValue >= 0 && minutesValue <= 59 && durationSeconds >= 60;
  const canCreate = workspace.role === "owner" || workspace.role === "admin";

  const submitManual = () => {
    if (!categoryId || !validDuration) return;
    manualTime.mutate({
      issueId,
      categoryId,
      durationSeconds,
      note: note.trim() || null,
      startedAt: manualTimeStartedAt(entryDate, durationSeconds),
    }, {
      onSuccess: () => {
        setNote("");
        toast.success("Time entry added to activity");
      },
    });
  };

  return (
    <div className="mt-3 rounded-xl border bg-card/35 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-muted/70 p-0.5">
          <Button className="h-7 rounded-full px-2.5" size="sm" variant={mode === "timer" ? "secondary" : "ghost"} onClick={() => setMode("timer")}><CirclePlay />Timer</Button>
          <Button className="h-7 rounded-full px-2.5" size="sm" variant={mode === "manual" ? "secondary" : "ghost"} onClick={() => setMode("manual")}><Clock3 />Log time</Button>
        </div>
        <TimeEntryTypePicker canCreate={canCreate} categories={categories} disabled={activeOnIssue} value={activeOnIssue ? timerQuery.data?.timer?.categoryId ?? null : categoryId} workspaceSlug={workspaceSlug} onChange={setSelectedCategoryId} />
      </div>
      <Input className="mt-3 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" maxLength={2_000} placeholder={`What did you work on? (${issueTitle})`} value={note} onChange={(event) => setNote(event.target.value)} />
      {mode === "timer" ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
          <div><strong className="font-mono text-lg tabular-nums">{activeOnIssue ? formatElapsed(elapsed) : "00:00:00"}</strong>{anotherTimerActive ? <p className="text-xs text-muted-foreground">Another timer is active.</p> : null}</div>
          {activeOnIssue ? (
            <Button disabled={stopTimer.isPending} size="sm" variant="destructive" onClick={() => stopTimer.mutate(undefined, { onSuccess: () => toast.success("Timer added to activity") })}>{stopTimer.isPending ? <LoaderCircle className="animate-spin" /> : <Square fill="currentColor" />}Stop</Button>
          ) : (
            <Button disabled={!categoryId || anotherTimerActive || startTimer.isPending} size="sm" onClick={() => startTimer.mutate({ issueId, categoryId, note: note.trim() || null })}>{startTimer.isPending ? <LoaderCircle className="animate-spin" /> : <CirclePlay fill="currentColor" />}Start timer</Button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t pt-3">
          <div className="flex flex-wrap items-end gap-2"><ManualTimeDatePicker value={entryDate} onChange={setEntryDate} /><DurationInput label="Hours" max={24} value={hours} onChange={setHours} /><DurationInput label="Minutes" max={59} value={minutes} onChange={setMinutes} /></div>
          <Button disabled={!categoryId || !validDuration || manualTime.isPending} size="sm" onClick={submitManual}>{manualTime.isPending ? <LoaderCircle className="animate-spin" /> : <Clock3 />}Add entry</Button>
        </div>
      )}
      {startTimer.error || stopTimer.error || manualTime.error ? <p className="mt-2 text-xs text-destructive">{startTimer.error?.message ?? stopTimer.error?.message ?? manualTime.error?.message}</p> : null}
    </div>
  );
}

function DurationInput({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-[0.65rem] text-muted-foreground">{label}<Input className="h-8 w-20" max={max} min={0} type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
