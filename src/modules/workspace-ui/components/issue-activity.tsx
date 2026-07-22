"use client";

import { ArrowUp, CirclePlay, Clock3, LoaderCircle, Paperclip, Square } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatElapsed, useElapsedSeconds } from "@/modules/workspace-ui/application/use-elapsed-seconds";
import { useActiveTimerQuery, useManualTimeMutation, useStartTimerMutation, useStopTimerMutation } from "@/modules/workspace-ui/application/use-timer-query";
import { useTimeCategoriesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ManualTimeDatePicker } from "@/modules/workspace-ui/components/manual-time-date-picker";
import { TimeEntryTypePicker } from "@/modules/workspace-ui/components/time-entry-type-picker";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import { manualTimeStartedAt } from "@/modules/workspace-ui/domain/manual-time-entry-date";
import type { IssueActivityEventRecord, IssueCommentRecord, TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function IssueActivity({
  comment,
  comments,
  error,
  events,
  issueId,
  issueTitle,
  loading,
  logs,
  pending,
  workspaceSlug,
  onCommentChange,
  onSubmit,
}: {
  comment: string;
  comments: IssueCommentRecord[];
  error?: string;
  events: IssueActivityEventRecord[];
  issueId: string;
  issueTitle: string;
  loading: boolean;
  logs: TimeLogRecord[];
  pending: boolean;
  workspaceSlug: string;
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const activity = [
    ...comments.map((item) => ({ kind: "comment" as const, date: item.createdAt, item })),
    ...logs.map((item) => ({ kind: "time" as const, date: item.endedAt, item })),
    ...events.map((item) => ({ kind: "event" as const, date: item.createdAt, item })),
  ].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <section className="mt-12 border-t pt-7">
      <h2 className="text-base font-semibold">Activity</h2>
      <div className="mt-6 grid gap-5">
        {activity.map((entry) => entry.kind === "comment"
          ? <CommentActivityItem comment={entry.item} key={`comment-${entry.item.id}`} />
          : entry.kind === "time" ? <TimeActivityItem key={`time-${entry.item.id}`} log={entry.item} />
            : <EventActivityItem event={entry.item} key={`event-${entry.item.id}`} />)}
        {!loading && !activity.length ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
      </div>
      <form className="relative mt-6" onSubmit={onSubmit}>
        <Textarea className="min-h-28 resize-none bg-card/55 p-4 pb-12 leading-6" placeholder="Leave a comment..." value={comment} onChange={(event) => onCommentChange(event.target.value)} />
        <Button aria-label="Post comment" className="absolute right-3 bottom-3 rounded-full" disabled={!comment.trim() || pending} size="icon-sm" type="submit">
          {pending ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <IssueTimeComposer issueId={issueId} issueTitle={issueTitle} workspaceSlug={workspaceSlug} />
    </section>
  );
}

function EventActivityItem({ event }: { event: IssueActivityEventRecord }) {
  const name = event.actorName ?? event.actorEmail;
  const filename = typeof event.payload.filename === "string" ? event.payload.filename : "a file";
  return (
    <article className="flex gap-3">
      <Avatar className="mt-0.5 size-6"><AvatarImage alt="" src={event.actorAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5 text-sm"><strong className="font-medium">{name}</strong><span className="text-muted-foreground">attached</span><span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5"><Paperclip className="size-3" /><span className="truncate">{filename}</span></span></div><span className="mt-1 block text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span></div>
    </article>
  );
}

function CommentActivityItem({ comment }: { comment: IssueCommentRecord }) {
  const name = comment.authorName ?? comment.authorEmail;
  return (
    <article className="flex gap-3">
      <Avatar className="mt-0.5 size-6"><AvatarImage alt="" src={comment.authorAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><strong className="text-sm font-medium">{name}</strong><span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span></div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{comment.body}</p>
      </div>
    </article>
  );
}

function TimeActivityItem({ log }: { log: TimeLogRecord }) {
  const name = log.workerName ?? log.workerEmail;
  return (
    <article className="flex gap-3">
      <Avatar className="mt-0.5 size-6"><AvatarImage alt="" src={log.workerAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm"><strong className="font-medium">{name}</strong><span className="text-muted-foreground">logged</span><strong className="font-medium">{formatLoggedDuration(log.durationSeconds)}</strong><span className="text-muted-foreground">as</span><span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-xs"><span className="size-2 rounded-full" style={{ backgroundColor: log.categoryColor ?? "#6B7280" }} />{log.categoryName ?? "Uncategorized"}</span></div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3" />{log.source === "timer" ? "Timer" : "Manual entry"} · {log.source === "manual" ? new Date(log.endedAt).toLocaleDateString() : new Date(log.endedAt).toLocaleString()}</div>
        {log.note ? <p className="mt-1 text-sm text-foreground/80">{log.note}</p> : null}
      </div>
    </article>
  );
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
