"use client";

import { ChevronRight, CirclePlay, Clock3, LoaderCircle, Square, X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateIssueVariables } from "@/modules/workspace-ui/application/use-issue-queries";
import { useStartTimerMutation, useStopTimerMutation } from "@/modules/workspace-ui/application/use-timer-query";
import { useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { gsap, useGSAP } from "@/modules/workspace-ui/application/workspace-animation";
import { WorkspaceSelect } from "@/modules/workspace-ui/components/workspace-select";
import type { ActiveTimerState, IssuePriority, IssueRecord, ProjectNode, TeamRecord, TimeCategoryRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface IssuePeekPaneProps {
  open: boolean;
  workspaceSlug: string;
  issue: IssueRecord;
  projects: ProjectNode[];
  teams: TeamRecord[];
  categories: TimeCategoryRecord[];
  activeTimer: ActiveTimerState | undefined;
  updatePending: boolean;
  updateError: Error | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (variables: UpdateIssueVariables) => void;
}

const priorityOptions: { value: IssuePriority; label: string }[] = [
  { value: "none", label: "No priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function IssuePeekPane(props: IssuePeekPaneProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(props.issue.title);
  const [categoryId, setCategoryId] = useState<string | null>(props.categories[0]?.id ?? null);
  const project = props.projects.find((candidate) => candidate.id === props.issue.projectId);
  const statusesQuery = useWorkflowStatusesQuery(props.workspaceSlug, project?.effectiveWorkflowId ?? null);
  const startTimer = useStartTimerMutation(props.workspaceSlug);
  const stopTimer = useStopTimerMutation(props.workspaceSlug);

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(contentRef.current, { opacity: 0, x: 36 }, { opacity: 1, x: 0, duration: 0.24, ease: "power3.out" });
      }
    },
    { dependencies: [props.open, props.issue.id], revertOnUpdate: true },
  );

  const issue = props.issue;
  const activeOnIssue = props.activeTimer?.timer?.issueId === issue.id;
  const anotherTimerActive = Boolean(props.activeTimer?.timer && !activeOnIssue);
  const update = (request: Omit<UpdateIssueVariables, "issueId" | "expectedVersion">) =>
    props.onUpdate({ issueId: issue.id, expectedVersion: issue.version, ...request });

  const submitTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = title.trim();
    if (normalized.length >= 2 && normalized !== issue.title) {
      update({ title: normalized, optimistic: { title: normalized } });
    }
  };

  return (
    <Sheet modal={false} open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        className="inset-y-2 right-2 h-auto w-[min(540px,calc(100vw-20px))] gap-0 rounded-xl border shadow-2xl will-change-transform sm:max-w-none max-md:inset-0 max-md:h-full max-md:w-full max-md:rounded-none max-md:border-0"
        ref={contentRef}
        showCloseButton={false}
        showOverlay={false}
      >
        <SheetTitle className="sr-only">{issue.title}</SheetTitle>
        <SheetDescription className="sr-only">Issue details and timer controls</SheetDescription>
        <header className="flex min-h-12 items-center justify-between border-b px-4">
          <div className="flex items-center gap-1.5 font-mono text-[0.68rem] text-muted-foreground">
            <span>{issue.identifier}</span><ChevronRight size={13} /><span>{issue.projectName ?? "Client backlog"}</span>
          </div>
          <SheetClose asChild>
            <Button aria-label="Close issue details" size="icon-sm" variant="ghost"><X /></Button>
          </SheetClose>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-5 py-5 max-md:px-4">
            <form className="relative" onSubmit={submitTitle}>
              <Textarea
                aria-label="Issue title"
                className="min-h-20 resize-none border-0 bg-transparent p-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
                maxLength={240}
                rows={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  const normalized = title.trim();
                  if (normalized.length >= 2 && normalized !== issue.title) update({ title: normalized, optimistic: { title: normalized } });
                }}
              />
              {props.updatePending ? <LoaderCircle className="absolute top-1 right-0 animate-spin" /> : null}
            </form>

            <section className="mt-6 grid grid-cols-2 gap-3 border-t pt-4 max-md:grid-cols-1">
              <h3 className="col-span-full text-xs font-medium uppercase tracking-wide text-muted-foreground">Properties</h3>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Status</span>
                <WorkspaceSelect
                  disabled={!issue.projectId || statusesQuery.isLoading}
                  emptyLabel={!issue.projectId ? "No workflow" : undefined}
                  label="Status"
                  options={(statusesQuery.data ?? []).map((status) => ({ value: status.id, label: status.name }))}
                  value={issue.statusId}
                  onValueChange={(statusId) => {
                    const status = statusesQuery.data?.find((candidate) => candidate.id === statusId);
                    if (status) update({ statusId: status.id, optimistic: { statusId: status.id, statusName: status.name } });
                  }}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Priority</span>
                <WorkspaceSelect label="Priority" options={priorityOptions} value={issue.priority} onValueChange={(value) => {
                  const priority = (value ?? "none") as IssuePriority;
                  update({ priority, optimistic: { priority } });
                }} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Project</span>
                <WorkspaceSelect label="Project" emptyLabel="Client backlog" options={props.projects.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={issue.projectId} onValueChange={(projectId) => {
                  const nextProject = props.projects.find((candidate) => candidate.id === projectId);
                  update({ projectId, optimistic: { projectId, projectName: nextProject?.name ?? null, ...(projectId ? {} : { statusId: null, statusName: null }) } });
                }} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Team</span>
                <WorkspaceSelect label="Team" emptyLabel="No team" options={props.teams.map((team) => ({ value: team.id, label: team.name }))} value={issue.teamId} onValueChange={(teamId) => {
                  const team = props.teams.find((candidate) => candidate.id === teamId);
                  update({ teamId, optimistic: { teamId, teamName: team?.name ?? null } });
                }} />
              </label>
            </section>

            <section className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h3>
              <Card className="min-h-20 p-3 text-sm leading-6 text-muted-foreground">{issue.description || "No description has been added yet."}</Card>
            </section>

            <section className="mt-6 grid gap-3 border-t pt-4">
              <div className="flex items-start justify-between gap-4"><h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time tracking</h3><p className="text-xs text-muted-foreground">One authoritative timer follows you across tabs and devices.</p></div>
              <WorkspaceSelect disabled={Boolean(props.activeTimer?.timer)} emptyLabel="Uncategorized" label="Time category" options={props.categories.map((category) => ({ value: category.id, label: category.name }))} value={categoryId} onValueChange={setCategoryId} />
              {activeOnIssue ? (
                <Button disabled={stopTimer.isPending} variant="destructive" onClick={() => stopTimer.mutate()}>
                  {stopTimer.isPending ? <LoaderCircle className="animate-spin" /> : <Square fill="currentColor" />}
                  Stop timer
                </Button>
              ) : (
                <Button disabled={anotherTimerActive || startTimer.isPending || issue.optimistic} variant="secondary" onClick={() => startTimer.mutate({ issueId: issue.id, categoryId, note: issue.title })}>
                  {startTimer.isPending ? <LoaderCircle className="animate-spin" /> : <CirclePlay />}
                  {anotherTimerActive ? "Another timer is active" : "Start timer"}
                </Button>
              )}
              {startTimer.error ? <p className="text-xs leading-5 text-destructive">{startTimer.error.message}</p> : null}
              {props.updateError ? <p className="text-xs leading-5 text-destructive">{props.updateError.message}</p> : null}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={13} /> Database writes happen only on start and stop.</span>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
