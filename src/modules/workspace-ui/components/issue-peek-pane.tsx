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
        className="issue-peek-pane sm:max-w-none"
        ref={contentRef}
        showCloseButton={false}
        showOverlay={false}
      >
        <SheetTitle className="sr-only">{issue.title}</SheetTitle>
        <SheetDescription className="sr-only">Issue details and timer controls</SheetDescription>
        <header className="peek-header">
          <div className="peek-breadcrumbs">
            <span>{issue.identifier}</span><ChevronRight size={13} /><span>{issue.projectName ?? "Client backlog"}</span>
          </div>
          <SheetClose asChild>
            <Button aria-label="Close issue details" size="icon-sm" variant="ghost"><X /></Button>
          </SheetClose>
        </header>

        <ScrollArea className="peek-scroll">
          <div className="peek-scroll-content">
            <form className="peek-title-form" onSubmit={submitTitle}>
              <Textarea
                aria-label="Issue title"
                maxLength={240}
                rows={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  const normalized = title.trim();
                  if (normalized.length >= 2 && normalized !== issue.title) update({ title: normalized, optimistic: { title: normalized } });
                }}
              />
              {props.updatePending ? <LoaderCircle className="spinner peek-saving" /> : null}
            </form>

            <section className="peek-section peek-properties">
              <h3>Properties</h3>
              <label>
                <span>Status</span>
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
              <label>
                <span>Priority</span>
                <WorkspaceSelect label="Priority" options={priorityOptions} value={issue.priority} onValueChange={(value) => {
                  const priority = (value ?? "none") as IssuePriority;
                  update({ priority, optimistic: { priority } });
                }} />
              </label>
              <label>
                <span>Project</span>
                <WorkspaceSelect label="Project" emptyLabel="Client backlog" options={props.projects.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={issue.projectId} onValueChange={(projectId) => {
                  const nextProject = props.projects.find((candidate) => candidate.id === projectId);
                  update({ projectId, optimistic: { projectId, projectName: nextProject?.name ?? null, ...(projectId ? {} : { statusId: null, statusName: null }) } });
                }} />
              </label>
              <label>
                <span>Team</span>
                <WorkspaceSelect label="Team" emptyLabel="No team" options={props.teams.map((team) => ({ value: team.id, label: team.name }))} value={issue.teamId} onValueChange={(teamId) => {
                  const team = props.teams.find((candidate) => candidate.id === teamId);
                  update({ teamId, optimistic: { teamId, teamName: team?.name ?? null } });
                }} />
              </label>
            </section>

            <section className="peek-section">
              <h3>Description</h3>
              <Card className="issue-description">{issue.description || "No description has been added yet."}</Card>
            </section>

            <section className="peek-section timer-section">
              <div><h3>Time tracking</h3><p>One authoritative timer follows you across tabs and devices.</p></div>
              <WorkspaceSelect disabled={Boolean(props.activeTimer?.timer)} emptyLabel="Uncategorized" label="Time category" options={props.categories.map((category) => ({ value: category.id, label: category.name }))} value={categoryId} onValueChange={setCategoryId} />
              {activeOnIssue ? (
                <Button disabled={stopTimer.isPending} variant="destructive" onClick={() => stopTimer.mutate()}>
                  {stopTimer.isPending ? <LoaderCircle className="spinner" /> : <Square fill="currentColor" />}
                  Stop timer
                </Button>
              ) : (
                <Button disabled={anotherTimerActive || startTimer.isPending || issue.optimistic} variant="secondary" onClick={() => startTimer.mutate({ issueId: issue.id, categoryId, note: issue.title })}>
                  {startTimer.isPending ? <LoaderCircle className="spinner" /> : <CirclePlay />}
                  {anotherTimerActive ? "Another timer is active" : "Start timer"}
                </Button>
              )}
              {startTimer.error ? <p className="form-error">{startTimer.error.message}</p> : null}
              {props.updateError ? <p className="form-error">{props.updateError.message}</p> : null}
              <span className="timer-hint"><Clock3 size={13} /> Database writes happen only on start and stop.</span>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
