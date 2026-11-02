"use client";

import { Clock3, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeleteTimeLogMutation } from "@/modules/workspace-ui/application/use-client-time-report-query";
import { EditTimeEntryDialog } from "@/modules/workspace-ui/components/edit-time-entry-dialog";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import type { TaskTimeGroup } from "@/modules/workspace-ui/domain/client-time-report";
import type { TimeCategoryRecord, TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

const columns = "grid-cols-[110px_160px_180px_150px_minmax(220px,1fr)_90px_68px]";

export function ClientTimeEntryTable({
  tasks,
  canCreateTimeTypes,
  canDeleteEntries,
  canEditEntries,
  categories,
  workspaceSlug,
}: {
  tasks: TaskTimeGroup[];
  canCreateTimeTypes: boolean;
  canDeleteEntries: boolean;
  canEditEntries: boolean;
  categories: TimeCategoryRecord[];
  workspaceSlug: string;
}) {
  const [editingEntry, setEditingEntry] = useState<TimeLogRecord | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TimeLogRecord | null>(null);
  const entryCount = tasks.reduce((total, task) => total + task.entries.length, 0);
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-4 md:px-5"><div><h2 className="text-sm font-semibold">Time entries</h2><p className="mt-0.5 text-xs text-muted-foreground">{entryCount} finalized entries across {tasks.length} tasks</p></div></div>
      {!tasks.length ? (
        <div className="grid min-h-40 place-items-center px-5 text-center"><div><Clock3 className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No time entries</p><p className="mt-1 text-xs text-muted-foreground">Try another period or clear a filter.</p></div></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="md:min-w-[1020px]">
            <div className={`grid ${columns} items-center gap-3 border-b px-5 py-2 max-md:hidden text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground`}>
              <span>Date</span><span>Person</span><span>Project</span><span>Type</span><span>Note</span><span className="text-right">Duration</span><span aria-hidden="true" />
            </div>
            {tasks.map((task) => <TaskTimeRows canDeleteEntries={canDeleteEntries} canEditEntries={canEditEntries} key={task.issueId} task={task} workspaceSlug={workspaceSlug} onDelete={setDeletingEntry} onEdit={setEditingEntry} />)}
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
      {deletingEntry ? (
        <DeleteTimeEntryDialog
          entry={deletingEntry}
          key={deletingEntry.id}
          workspaceSlug={workspaceSlug}
          onClose={() => setDeletingEntry(null)}
        />
      ) : null}
    </section>
  );
}

function DeleteTimeEntryDialog({ entry, workspaceSlug, onClose }: { entry: TimeLogRecord; workspaceSlug: string; onClose: () => void }) {
  const deletion = useDeleteTimeLogMutation(workspaceSlug);
  const confirm = () => deletion.mutate({ timeLogId: entry.id, issueId: entry.issueId }, {
    onSuccess: () => {
      toast.success("Time entry deleted");
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !deletion.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this time entry?</DialogTitle>
          <DialogDescription>
            {formatLoggedDuration(entry.durationSeconds)} on {entry.identifier} by {entry.workerName ?? entry.workerEmail}, {new Date(entry.endedAt).toLocaleDateString()}. It is removed from reports and totals.
          </DialogDescription>
        </DialogHeader>
        {deletion.error ? <p className="text-sm text-destructive">{deletion.error.message}</p> : null}
        <DialogFooter>
          <Button disabled={deletion.isPending} type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={deletion.isPending} type="button" variant="destructive" onClick={confirm}>{deletion.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Delete entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskTimeRows({ canDeleteEntries, canEditEntries, task, workspaceSlug, onDelete, onEdit }: { canDeleteEntries: boolean; canEditEntries: boolean; task: TaskTimeGroup; workspaceSlug: string; onDelete: (entry: TimeLogRecord) => void; onEdit: (entry: TimeLogRecord) => void }) {
  return (
    <div className="border-b last:border-b-0">
      <div className="flex min-h-12 items-center gap-3 bg-muted/35 px-4 py-2 md:px-5">
        <Link className="min-w-0 flex-1 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={issueDetailPath(workspaceSlug, task.issueId, task.projectId)}>
          <span className="font-mono text-[0.65rem] text-muted-foreground">{task.identifier}</span><strong className="ml-2 text-xs font-medium">{task.title}</strong>
        </Link>
        <span className="text-[0.68rem] text-muted-foreground">{task.entries.length} {task.entries.length === 1 ? "entry" : "entries"}</span>
        <strong className="min-w-16 text-right font-mono text-xs font-semibold tabular-nums md:min-w-20">{formatLoggedDuration(task.totalSeconds)}</strong>
      </div>
      {task.entries.map((entry) => <TimeEntryRow canDelete={canDeleteEntries} canEdit={canEditEntries} entry={entry} key={entry.id} workspaceSlug={workspaceSlug} onDelete={onDelete} onEdit={onEdit} />)}
    </div>
  );
}

function TimeEntryRow({ canDelete, canEdit, entry, workspaceSlug, onDelete, onEdit }: { canDelete: boolean; canEdit: boolean; entry: TimeLogRecord; workspaceSlug: string; onDelete: (entry: TimeLogRecord) => void; onEdit: (entry: TimeLogRecord) => void }) {
  const worker = entry.workerName ?? entry.workerEmail;
  const projectLabel = entry.projectName ? `${entry.projectName}${entry.branchName ? ` / ${entry.branchName}` : ""}` : null;
  const projectHref = entry.projectId ? `/app/${workspaceSlug}/projects/${entry.projectId}/issues${entry.branchId ? `?branch=${entry.branchId}` : ""}` : null;
  const typeColor = entry.categoryColor ?? "#6B7280";
  const date = new Date(entry.endedAt).toLocaleDateString();
  const actions = (touch: boolean) => (
    <>
      {canEdit ? <Tooltip><TooltipTrigger asChild><Button aria-label={`Edit time entry for ${entry.identifier}`} className={touch ? "text-muted-foreground" : "opacity-0 group-hover/entry:opacity-100 focus-visible:opacity-100"} size={touch ? "icon-sm" : "icon-xs"} type="button" variant="ghost" onClick={() => onEdit(entry)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Edit time entry</TooltipContent></Tooltip> : null}
      {canDelete ? <Tooltip><TooltipTrigger asChild><Button aria-label={`Delete time entry for ${entry.identifier}`} className={touch ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground opacity-0 hover:text-destructive group-hover/entry:opacity-100 focus-visible:opacity-100"} size={touch ? "icon-sm" : "icon-xs"} type="button" variant="ghost" onClick={() => onDelete(entry)}><Trash2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Delete time entry</TooltipContent></Tooltip> : null}
    </>
  );
  return (
    <>
      <div className={`group/entry grid ${columns} min-h-12 items-center gap-3 border-t px-5 py-2 text-xs first:border-t-0 hover:bg-accent/20 max-md:hidden`}>
        <div><span className="block">{date}</span><span className="mt-0.5 block capitalize text-muted-foreground">{entry.source}</span></div>
        <div className="flex min-w-0 items-center gap-2"><Avatar className="size-6"><AvatarImage alt="" src={entry.workerAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{worker.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="truncate">{worker}</span></div>
        {projectHref ? <Link className="truncate hover:text-primary" href={projectHref}>{projectLabel}</Link> : <span className="text-muted-foreground">Client work</span>}
        <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: typeColor }} /><span className="truncate">{entry.categoryName ?? "Uncategorized"}</span>{entry.billable ? <Badge className="ml-auto" variant="outline">Billable</Badge> : null}</div>
        <span className="truncate text-muted-foreground">{entry.note || "No note"}</span>
        <strong className="text-right font-mono font-medium tabular-nums">{formatLoggedDuration(entry.durationSeconds)}</strong>
        <div className="flex items-center justify-end gap-0.5">{actions(false)}</div>
      </div>
      <div className="grid gap-2 border-t px-4 py-3 text-xs md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6 shrink-0"><AvatarImage alt="" src={entry.workerAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{worker.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><span className="block truncate font-medium">{worker}</span><span className="block truncate text-muted-foreground">{date} · <span className="capitalize">{entry.source}</span></span></div>
          <strong className="shrink-0 font-mono text-sm font-semibold tabular-nums">{formatLoggedDuration(entry.durationSeconds)}</strong>
        </div>
        {entry.note ? <p className="line-clamp-3 break-words text-muted-foreground">{entry.note}</p> : null}
        <div className="flex min-h-8 items-center gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="flex min-w-0 items-center gap-1.5"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: typeColor }} /><span className="truncate">{entry.categoryName ?? "Uncategorized"}</span></span>
            {entry.billable ? <Badge variant="outline">Billable</Badge> : null}
            {projectHref ? <Link className="min-w-0 max-w-full truncate text-muted-foreground hover:text-primary" href={projectHref}>{projectLabel}</Link> : null}
          </div>
          <div className="flex shrink-0 items-center">{actions(true)}</div>
        </div>
      </div>
    </>
  );
}
