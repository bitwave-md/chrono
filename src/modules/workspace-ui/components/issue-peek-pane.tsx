"use client";

import {
  ChevronRight,
  CirclePlay,
  Clock3,
  LoaderCircle,
  Square,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useRef, useState } from "react";

import {
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/modules/workspace-ui/application/use-timer-query";
import { useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import {
  gsap,
  useGSAP,
} from "@/modules/workspace-ui/application/workspace-animation";
import { PriorityBadge, StatusBadge } from "@/modules/workspace-ui/components/issue-badges";
import type {
  ActiveTimerState,
  IssuePriority,
  IssueRecord,
  ProjectNode,
  TeamRecord,
  TimeCategoryRecord,
} from "@/modules/workspace-ui/domain/workspace-types";
import type { UpdateIssueVariables } from "@/modules/workspace-ui/application/use-issue-queries";

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

export function IssuePeekPane(props: IssuePeekPaneProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(props.issue.title);
  const [categoryId, setCategoryId] = useState(props.categories[0]?.id ?? "");
  const project = props.projects.find(
    (candidate) => candidate.id === props.issue?.projectId,
  );
  const statusesQuery = useWorkflowStatusesQuery(
    props.workspaceSlug,
    project?.effectiveWorkflowId ?? null,
  );
  const startTimer = useStartTimerMutation(props.workspaceSlug);
  const stopTimer = useStopTimerMutation(props.workspaceSlug);

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, x: 36 },
          { opacity: 1, x: 0, duration: 0.24, ease: "power3.out" },
        );
      }
    },
    { dependencies: [props.open, props.issue?.id], revertOnUpdate: true },
  );

  const issue = props.issue;
  const activeOnIssue = props.activeTimer?.timer?.issueId === issue.id;
  const anotherTimerActive = Boolean(
    props.activeTimer?.timer && !activeOnIssue,
  );

  const update = (
    request: Omit<UpdateIssueVariables, "issueId" | "expectedVersion">,
  ) => {
    props.onUpdate({
      issueId: issue.id,
      expectedVersion: issue.version,
      ...request,
    });
  };

  const submitTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = title.trim();

    if (normalized.length >= 2 && normalized !== issue.title) {
      update({ title: normalized, optimistic: { title: normalized } });
    }
  };

  return (
    <Dialog.Root modal={false} open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content className="issue-peek-pane" ref={contentRef}>
          <Dialog.Title className="sr-only">{issue.title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Issue details and timer controls
          </Dialog.Description>
          <header className="peek-header">
            <div className="peek-breadcrumbs">
              <span>{issue.identifier}</span>
              <ChevronRight size={13} />
              <span>{issue.projectName ?? "Client backlog"}</span>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close issue details">
              <X size={17} />
            </Dialog.Close>
          </header>

          <div className="peek-scroll">
            <form className="peek-title-form" onSubmit={submitTitle}>
              <textarea
                aria-label="Issue title"
                maxLength={240}
                rows={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  const normalized = title.trim();
                  if (normalized.length >= 2 && normalized !== issue.title) {
                    update({ title: normalized, optimistic: { title: normalized } });
                  }
                }}
              />
              {props.updatePending ? (
                <LoaderCircle className="spinner peek-saving" size={15} />
              ) : null}
            </form>

            <section className="peek-section peek-properties">
              <h3>Properties</h3>
              <label>
                <span>Status</span>
                <select
                  disabled={!issue.projectId || statusesQuery.isLoading}
                  value={issue.statusId ?? ""}
                  onChange={(event) => {
                    const status = statusesQuery.data?.find(
                      (candidate) => candidate.id === event.target.value,
                    );
                    if (status) {
                      update({
                        statusId: status.id,
                        optimistic: {
                          statusId: status.id,
                          statusName: status.name,
                        },
                      });
                    }
                  }}
                >
                  {!issue.projectId ? <option value="">No workflow</option> : null}
                  {statusesQuery.data?.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
                <StatusBadge name={issue.statusName} />
              </label>
              <label>
                <span>Priority</span>
                <select
                  value={issue.priority}
                  onChange={(event) => {
                    const priority = event.target.value as IssuePriority;
                    update({ priority, optimistic: { priority } });
                  }}
                >
                  <option value="none">No priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <PriorityBadge priority={issue.priority} />
              </label>
              <label>
                <span>Project</span>
                <select
                  value={issue.projectId ?? ""}
                  onChange={(event) => {
                    const projectId = event.target.value || null;
                    const nextProject = props.projects.find(
                      (candidate) => candidate.id === projectId,
                    );
                    update({
                      projectId,
                      optimistic: {
                        projectId,
                        projectName: nextProject?.name ?? null,
                        ...(projectId ? {} : { statusId: null, statusName: null }),
                      },
                    });
                  }}
                >
                  <option value="">Client backlog</option>
                  {props.projects.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Team</span>
                <select
                  value={issue.teamId ?? ""}
                  onChange={(event) => {
                    const teamId = event.target.value || null;
                    const team = props.teams.find(
                      (candidate) => candidate.id === teamId,
                    );
                    update({
                      teamId,
                      optimistic: { teamId, teamName: team?.name ?? null },
                    });
                  }}
                >
                  <option value="">No team</option>
                  {props.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="peek-section">
              <h3>Description</h3>
              <div className="issue-description">
                {issue.description || "No description has been added yet."}
              </div>
            </section>

            <section className="peek-section timer-section">
              <div>
                <h3>Time tracking</h3>
                <p>One authoritative timer follows you across tabs and devices.</p>
              </div>
              <select
                aria-label="Time category"
                disabled={Boolean(props.activeTimer?.timer)}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Uncategorized</option>
                {props.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {activeOnIssue ? (
                <button
                  className="timer-action timer-action-stop"
                  disabled={stopTimer.isPending}
                  type="button"
                  onClick={() => stopTimer.mutate()}
                >
                  {stopTimer.isPending ? (
                    <LoaderCircle className="spinner" size={16} />
                  ) : (
                    <Square fill="currentColor" size={13} />
                  )}
                  Stop timer
                </button>
              ) : (
                <button
                  className="timer-action"
                  disabled={anotherTimerActive || startTimer.isPending || issue.optimistic}
                  type="button"
                  onClick={() =>
                    startTimer.mutate({
                      issueId: issue.id,
                      categoryId: categoryId || null,
                      note: issue.title,
                    })
                  }
                >
                  {startTimer.isPending ? (
                    <LoaderCircle className="spinner" size={16} />
                  ) : (
                    <CirclePlay size={17} />
                  )}
                  {anotherTimerActive ? "Another timer is active" : "Start timer"}
                </button>
              )}
              {startTimer.error ? (
                <p className="form-error">{startTimer.error.message}</p>
              ) : null}
              {props.updateError ? (
                <p className="form-error">{props.updateError.message}</p>
              ) : null}
              <span className="timer-hint">
                <Clock3 size={13} /> Database writes happen only on start and stop.
              </span>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
