"use client";

import { Clock3, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditTimeEntryDialog } from "@/modules/workspace-ui/components/edit-time-entry-dialog";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import type { TaskTimeGroup } from "@/modules/workspace-ui/domain/client-time-report";
import type { TimeCategoryRecord, TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

const columns = "grid-cols-[110px_160px_180px_150px_minmax(220px,1fr)_90px_36px]";

export function ClientTimeEntryTable({
  tasks,
  canCreateTimeTypes,
  canEditEntries,
  categories,
  workspaceSlug,
}: {
  tasks: TaskTimeGroup[];
  canCreateTimeTypes: boolean;
  canEditEntries: boolean;
  categories: TimeCategoryRecord[];
  workspaceSlug: string;
}) {
  const [editingEntry, setEditingEntry] = useState<TimeLogRecord | null>(null);
  const entryCount = tasks.reduce((total, task) => total + task.entries.length, 0);
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-semibold">Time entries</h2><p className="mt-0.5 text-xs text-muted-foreground">{entryCount} finalized entries across {tasks.length} tasks</p></div></div>
      {!tasks.length ? (
        <div className="grid min-h-40 place-items-center px-5 text-center"><div><Clock3 className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No time entries</p><p className="mt-1 text-xs text-muted-foreground">Try another period or clear a filter.</p></div></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1020px]">
            <div className={`grid ${columns} items-center gap-3 border-b px-5 py-2 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground`}>
              <span>Date</span><span>Person</span><span>Project</span><span>Type</span><span>Note</span><span className="text-right">Duration</span><span aria-hidden="true" />
            </div>
            {tasks.map((task) => <TaskTimeRows canEditEntries={canEditEntries} key={task.issueId} task={task} workspaceSlug={workspaceSlug} onEdit={setEditingEntry} />)}
          </div>
        </div>
      )}
      {editingEntry ? (
        <EditTimeEntryDialog
          canCreateTypes={canCreateTimeTypes}
          categories={categories}
          entry={editingEntry}
          key={`${editingEntry.id}:${editingEntry.version}`}
          open
          workspaceSlug={workspaceSlug}
          onOpenChange={(open) => { if (!open) setEditingEntry(null); }}
        />
      ) : null}
    </section>
  );
}

function TaskTimeRows({ canEditEntries, task, workspaceSlug, onEdit }: { canEditEntries: boolean; task: TaskTimeGroup; workspaceSlug: string; onEdit: (entry: TimeLogRecord) => void }) {
  return (
    <div className="border-b last:border-b-0">
      <div className="flex min-h-12 items-center gap-3 bg-muted/35 px-5 py-2">
        <Link className="min-w-0 flex-1 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={issueDetailPath(workspaceSlug, task.issueId, task.projectId)}>
          <span className="font-mono text-[0.65rem] text-muted-foreground">{task.identifier}</span><strong className="ml-2 text-xs font-medium">{task.title}</strong>
        </Link>
        <span className="text-[0.68rem] text-muted-foreground">{task.entries.length} {task.entries.length === 1 ? "entry" : "entries"}</span>
        <strong className="min-w-20 text-right font-mono text-xs font-semibold tabular-nums">{formatLoggedDuration(task.totalSeconds)}</strong>
      </div>
      {task.entries.map((entry) => <TimeEntryRow canEdit={canEditEntries} entry={entry} key={entry.id} workspaceSlug={workspaceSlug} onEdit={onEdit} />)}
    </div>
  );
}

function TimeEntryRow({ canEdit, entry, workspaceSlug, onEdit }: { canEdit: boolean; entry: TimeLogRecord; workspaceSlug: string; onEdit: (entry: TimeLogRecord) => void }) {
  const worker = entry.workerName ?? entry.workerEmail;
  return (
    <div className={`group/entry grid ${columns} min-h-12 items-center gap-3 border-t px-5 py-2 text-xs first:border-t-0 hover:bg-accent/20`}>
      <div><span className="block">{new Date(entry.endedAt).toLocaleDateString()}</span><span className="mt-0.5 block capitalize text-muted-foreground">{entry.source}</span></div>
      <div className="flex min-w-0 items-center gap-2"><Avatar className="size-6"><AvatarImage alt="" src={entry.workerAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{worker.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="truncate">{worker}</span></div>
      {entry.projectId ? <Link className="truncate hover:text-primary" href={`/app/${workspaceSlug}/projects/${entry.projectId}/issues${entry.branchId ? `?branch=${entry.branchId}` : ""}`}>{entry.projectName}{entry.branchName ? ` / ${entry.branchName}` : ""}</Link> : <span className="text-muted-foreground">Client work</span>}
      <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: entry.categoryColor ?? "#6B7280" }} /><span className="truncate">{entry.categoryName ?? "Uncategorized"}</span>{entry.billable ? <Badge className="ml-auto" variant="outline">Billable</Badge> : null}</div>
      <span className="truncate text-muted-foreground">{entry.note || "No note"}</span>
      <strong className="text-right font-mono font-medium tabular-nums">{formatLoggedDuration(entry.durationSeconds)}</strong>
      {canEdit ? <Tooltip><TooltipTrigger asChild><Button aria-label={`Edit time entry for ${entry.identifier}`} className="opacity-0 group-hover/entry:opacity-100 focus-visible:opacity-100 max-md:opacity-100" size="icon-xs" type="button" variant="ghost" onClick={() => onEdit(entry)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Edit time entry</TooltipContent></Tooltip> : <span aria-hidden="true" />}
    </div>
  );
}
