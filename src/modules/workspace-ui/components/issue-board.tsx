"use client";

import { CircleDashed, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PriorityBadge } from "@/modules/workspace-ui/components/issue-badges";
import type {
  IssueRecord,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

interface IssueBoardProps {
  issues: IssueRecord[];
  statuses: WorkflowStatusRecord[];
  selectedProjectId: string | null;
  onMove: (issue: IssueRecord, status: WorkflowStatusRecord) => void;
  onOpen: (issueId: string) => void;
}

export function IssueBoard(props: IssueBoardProps) {
  if (!props.selectedProjectId) {
    return (
      <div className="grid min-h-[calc(100svh-150px)] place-content-center justify-items-center text-center">
        <CircleDashed className="mb-4 size-12 text-muted-foreground" />
        <h2 className="text-base font-semibold">Select a Project or Sprint</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Board movement is scoped to one effective Project workflow.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="grid min-w-max auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 pb-2.5">
      {props.statuses.map((status) => {
        const columnIssues = props.issues.filter(
          (issue) => issue.statusId === status.id,
        );

        return (
          <Card
            className="min-h-[calc(100svh-110px)] overflow-hidden bg-card/70"
            key={status.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const issue = props.issues.find(
                (candidate) =>
                  candidate.id === event.dataTransfer.getData("text/issue-id"),
              );

              if (issue && issue.statusId !== status.id) {
                props.onMove(issue, status);
              }
            }}
          >
            <CardHeader className="grid min-h-11 grid-cols-[10px_1fr_auto] items-center gap-2 border-b px-3 py-0">
              <span className="size-2 rounded-full bg-primary" />
              <strong className="text-xs">{status.name}</strong>
              <span className="font-mono text-xs text-muted-foreground">{columnIssues.length}</span>
            </CardHeader>
            <CardContent className="grid gap-2 p-2">
              {columnIssues.map((issue) => (
                <Button
                  className="grid h-auto gap-2.5 whitespace-normal p-3 text-left"
                  draggable={!issue.optimistic}
                  key={issue.id}
                  variant="outline"
                  onClick={() => props.onOpen(issue.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/issue-id", issue.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <span className="flex min-w-0 items-center justify-between font-mono text-xs text-muted-foreground">
                    <span>{issue.identifier}</span>
                    <GripVertical size={14} />
                  </span>
                  <strong className="text-sm leading-5">{issue.title}</strong>
                  <span className="flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground [&_[data-slot=badge]>span]:hidden">
                    <PriorityBadge priority={issue.priority} />
                    <span>{issue.assignees.length ? `${issue.assignees.length} assigned` : "Unassigned"}</span>
                  </span>
                </Button>
              ))}
              {!columnIssues.length ? (
                <div className="grid min-h-14 place-items-center rounded-md border border-dashed text-xs text-muted-foreground">Drop issues here</div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
