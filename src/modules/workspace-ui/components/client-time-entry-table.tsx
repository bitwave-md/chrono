"use client";

import { Clock3 } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import { formatLoggedDuration } from "@/modules/workspace-ui/domain/issue-time-summary";
import type { TimeLogRecord } from "@/modules/workspace-ui/domain/workspace-types";

const columns = "grid-cols-[110px_160px_minmax(250px,1fr)_180px_140px_90px]";

export function ClientTimeEntryTable({
  entries,
  workspaceSlug,
}: {
  entries: TimeLogRecord[];
  workspaceSlug: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-semibold">Time entries</h2><p className="mt-0.5 text-xs text-muted-foreground">{entries.length} finalized entries</p></div></div>
      {!entries.length ? (
        <div className="grid min-h-40 place-items-center px-5 text-center"><div><Clock3 className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No time entries</p><p className="mt-1 text-xs text-muted-foreground">Try another period or clear a filter.</p></div></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className={`grid ${columns} items-center gap-3 border-b px-5 py-2 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground`}>
              <span>Date</span><span>Person</span><span>Issue</span><span>Project</span><span>Type</span><span className="text-right">Duration</span>
            </div>
            {entries.map((entry) => <TimeEntryRow entry={entry} key={entry.id} workspaceSlug={workspaceSlug} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function TimeEntryRow({ entry, workspaceSlug }: { entry: TimeLogRecord; workspaceSlug: string }) {
  const worker = entry.workerName ?? entry.workerEmail;
  return (
    <div className={`grid ${columns} min-h-14 items-center gap-3 border-b px-5 py-2 text-xs last:border-b-0 hover:bg-accent/20`}>
      <div><span className="block">{new Date(entry.endedAt).toLocaleDateString()}</span><span className="mt-0.5 block capitalize text-muted-foreground">{entry.source}</span></div>
      <div className="flex min-w-0 items-center gap-2"><Avatar className="size-6"><AvatarImage alt="" src={entry.workerAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{worker.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="truncate">{worker}</span></div>
      <Link className="min-w-0 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={issueDetailPath(workspaceSlug, entry.issueId, entry.projectId)}>
        <span className="font-mono text-[0.65rem] text-muted-foreground">{entry.identifier}</span><strong className="ml-2 font-medium">{entry.issueTitle}</strong>{entry.note ? <span className="mt-0.5 block truncate text-muted-foreground">{entry.note}</span> : null}
      </Link>
      {entry.projectId ? <Link className="truncate hover:text-primary" href={`/app/${workspaceSlug}/projects/${entry.projectId}/issues${entry.branchId ? `?branch=${entry.branchId}` : ""}`}>{entry.projectName}{entry.branchName ? ` / ${entry.branchName}` : ""}</Link> : <span className="text-muted-foreground">Client work</span>}
      <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: entry.categoryColor ?? "#6B7280" }} /><span className="truncate">{entry.categoryName ?? "Uncategorized"}</span>{entry.billable ? <Badge className="ml-auto" variant="outline">Billable</Badge> : null}</div>
      <strong className="text-right font-mono font-medium tabular-nums">{formatLoggedDuration(entry.durationSeconds)}</strong>
    </div>
  );
}
