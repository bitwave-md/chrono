"use client";

import { CircleDashed, Clock3, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PriorityBadge,
  StatusBadge,
} from "@/modules/workspace-ui/components/issue-badges";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface IssueListProps {
  issues: IssueRecord[];
  focusedIssueId: string | null;
  onFocus: (issueId: string) => void;
  onOpen: (issueId: string) => void;
}

export function IssueList(props: IssueListProps) {
  if (!props.issues.length) {
    return (
      <div className="grid min-h-[calc(100svh-150px)] place-content-center justify-items-center text-center">
        <CircleDashed className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-base font-semibold">No issues in this view</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Press C to create the first item without leaving the keyboard.</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden" role="list">
      <div className="grid min-h-9 grid-cols-[minmax(260px,1.7fr)_minmax(130px,.7fr)_minmax(120px,.55fr)_minmax(145px,.7fr)] items-center gap-3.5 border-b px-3.5 font-mono text-[0.62rem] uppercase tracking-[0.07em] text-muted-foreground max-lg:hidden" aria-hidden="true">
        <span>Issue</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Team</span>
      </div>
      {props.issues.map((issue) => (
        <Button
          className={cn(
            "relative grid h-auto min-h-12 w-full grid-cols-[minmax(260px,1.7fr)_minmax(130px,.7fr)_minmax(120px,.55fr)_minmax(145px,.7fr)] items-center gap-3.5 rounded-none border-b px-3.5 text-left font-normal text-foreground last:border-b-0 hover:bg-accent max-lg:grid-cols-[minmax(220px,1fr)_120px_36px] max-md:min-h-14 max-md:grid-cols-[minmax(0,1fr)_34px] max-md:gap-2 max-md:px-2.5",
            props.focusedIssueId === issue.id && "bg-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r before:bg-primary",
            issue.optimistic && "opacity-60",
          )}
          key={issue.id}
          role="listitem"
          variant="ghost"
          onClick={() => props.onOpen(issue.id)}
          onFocus={() => props.onFocus(issue.id)}
          onMouseEnter={() => props.onFocus(issue.id)}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground max-md:w-12">{issue.identifier}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{issue.title}</span>
            {issue.description ? (
              <span className="size-1.5 rounded-full bg-muted-foreground" title="Has description" />
            ) : null}
          </span>
          <span className="max-md:hidden"><StatusBadge name={issue.statusName} /></span>
          <span className="max-lg:[&_[data-slot=badge]>span]:hidden"><PriorityBadge priority={issue.priority} /></span>
          <span className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground max-lg:hidden">
            {issue.teamName ? (
              <>
                <Avatar className="size-6 rounded-md border">
                  <AvatarFallback>{issue.teamName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span>{issue.teamName}</span>
              </>
            ) : issue.assigneeName ? (
              <>
                <UserRound size={14} />
                <span>{issue.assigneeName}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </span>
          {issue.optimistic ? (
            <span className="absolute right-2.5 bottom-0.5 flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <Clock3 size={12} /> Saving
            </span>
          ) : null}
        </Button>
      ))}
    </Card>
  );
}
