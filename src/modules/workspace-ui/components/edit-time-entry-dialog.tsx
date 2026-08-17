"use client";

import { Clock3, LoaderCircle, Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateTimeLogMutation } from "@/modules/workspace-ui/application/use-client-time-report-query";
import { CreationDialogFrame } from "@/modules/workspace-ui/components/creation-dialog-frame";
import { TimeEntryTypePicker } from "@/modules/workspace-ui/components/time-entry-type-picker";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import type { TimeCategoryRecord, TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

const maximumDurationSeconds = 31 * 24 * 60 * 60;

export function EditTimeEntryDialog({
  canCreateTypes,
  categories,
  entry,
  open,
  workspaceSlug,
  onOpenChange,
}: {
  canCreateTypes: boolean;
  categories: TimeCategoryRecord[];
  entry: TimeLogRecord;
  open: boolean;
  workspaceSlug: string;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useUpdateTimeLogMutation(workspaceSlug);
  const initialDuration = splitDuration(entry.durationSeconds);
  const [hours, setHours] = useState(String(initialDuration.hours));
  const [minutes, setMinutes] = useState(String(initialDuration.minutes));
  const [seconds, setSeconds] = useState(String(initialDuration.seconds));
  const [categoryId, setCategoryId] = useState(entry.categoryId);
  const [note, setNote] = useState(entry.note ?? "");
  const durationSeconds = parseDuration(hours, minutes, seconds);
  const canSubmit = durationSeconds !== null && note.length <= 2_000;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (durationSeconds === null) return;
    mutation.mutate({
      timeLogId: entry.id,
      issueId: entry.issueId,
      expectedVersion: entry.version,
      categoryId,
      durationSeconds,
      note: note.trim() || null,
    }, {
      onSuccess: () => {
        toast.success("Time entry updated");
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CreationDialogFrame
        context={<span className="flex h-8 max-w-64 items-center gap-2 rounded-full border bg-secondary/45 px-3 text-sm text-muted-foreground"><Clock3 className="size-3.5" /><span className="truncate font-mono text-xs">{entry.identifier}</span></span>}
        description={`Edit the duration, time entry type, and note for ${entry.identifier}.`}
        open={open}
        title="Edit time entry"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-8 max-md:px-5 max-md:pt-6">
            <div className="rounded-2xl border bg-muted/20 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Duration</span>
                  <strong className="mt-1 block text-xl font-semibold tabular-nums">{durationSeconds === null ? "Invalid duration" : formatLoggedDuration(durationSeconds)}</strong>
                </div>
                <div className="flex items-end gap-2">
                  <DurationPart label="Hours" max={744} value={hours} onChange={setHours} />
                  <DurationPart label="Minutes" max={59} value={minutes} onChange={setMinutes} />
                  <DurationPart label="Seconds" max={59} value={seconds} onChange={setSeconds} />
                </div>
              </div>
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Completion time remains {new Date(entry.endedAt).toLocaleString()}.</p>
            </div>
            <Textarea
              autoFocus
              className="mt-6 min-h-40 resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0"
              maxLength={2_000}
              placeholder="Add a note about the work..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-6 pb-5 max-md:px-5">
            <TimeEntryTypePicker canCreate={canCreateTypes} categories={categories} disabled={mutation.isPending} value={categoryId} workspaceSlug={workspaceSlug} onChange={setCategoryId} />
          </div>
          {mutation.error ? <p className="px-6 pb-2 text-xs leading-5 text-destructive">{mutation.error.message}</p> : null}
          <div className="flex items-center justify-between gap-3 border-t px-6 py-4 max-md:px-5">
            <span className="truncate text-xs text-muted-foreground">{entry.issueTitle}</span>
            <Button className="rounded-full px-5" disabled={!canSubmit || mutation.isPending} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save changes
            </Button>
          </div>
        </form>
      </CreationDialogFrame>
    </Dialog>
  );
}

function DurationPart({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[0.65rem] font-medium text-muted-foreground">
      {label}
      <Input className="h-10 w-20 bg-background text-center font-mono text-sm tabular-nums" inputMode="numeric" max={max} min={0} step={1} type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function splitDuration(durationSeconds: number) {
  return {
    hours: Math.floor(durationSeconds / 3_600),
    minutes: Math.floor((durationSeconds % 3_600) / 60),
    seconds: durationSeconds % 60,
  };
}

function parseDuration(hours: string, minutes: string, seconds: string): number | null {
  const parts = [hours, minutes, seconds].map(Number);
  if (parts.some((value) => !Number.isInteger(value) || value < 0)) return null;
  if (parts[1] > 59 || parts[2] > 59) return null;
  const duration = parts[0] * 3_600 + parts[1] * 60 + parts[2];
  return duration >= 1 && duration <= maximumDurationSeconds ? duration : null;
}
