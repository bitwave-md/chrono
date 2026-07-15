"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { type FormEvent, useRef, useState } from "react";

import { useCreateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import {
  gsap,
  useGSAP,
} from "@/modules/workspace-ui/application/workspace-animation";
import type {
  IssuePriority,
  ProjectNode,
  TeamRecord,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";
import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

interface CreateIssueDialogProps {
  open: boolean;
  workspaceSlug: string;
  clientId: string | null;
  selectedProjectId: string | null;
  selectedTeamId: string | null;
  projects: ProjectNode[];
  teams: TeamRecord[];
  statuses: WorkflowStatusRecord[];
  filters: IssueQueryFilters;
  onOpenChange: (open: boolean) => void;
}

export function CreateIssueDialog(props: CreateIssueDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(props.selectedProjectId ?? "");
  const [teamId, setTeamId] = useState(props.selectedTeamId ?? "");
  const [priority, setPriority] = useState<IssuePriority>("none");
  const mutation = useCreateIssueMutation(
    props.workspaceSlug,
    props.clientId,
    props.filters,
  );

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 18, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
    },
    { dependencies: [props.open], revertOnUpdate: true },
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!props.clientId || title.trim().length < 2) {
      return;
    }

    const project = props.projects.find((candidate) => candidate.id === projectId);
    const team = props.teams.find((candidate) => candidate.id === teamId);
    const defaultStatus = props.statuses.find((status) => status.isDefault);
    mutation.mutate(
      {
        clientId: props.clientId,
        projectId: projectId || null,
        teamId: teamId || null,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        visibility: "internal",
        projectName: project?.name ?? null,
        teamName: team?.name ?? null,
        statusId: projectId ? defaultStatus?.id ?? null : null,
        statusName: projectId ? defaultStatus?.name ?? "Backlog" : null,
      },
      { onSuccess: () => props.onOpenChange(false) },
    );
  };

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="create-issue-dialog" ref={contentRef}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>New issue</Dialog.Title>
              <Dialog.Description>
                Capture work now; refine assignment and timing later.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={17} />
            </Dialog.Close>
          </div>

          <form
            className="issue-create-form"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.requestSubmit();
              }
            }}
            onSubmit={submit}
          >
            <input
              autoFocus
              className="issue-title-input"
              maxLength={240}
              placeholder="Issue title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <textarea
              maxLength={20_000}
              placeholder="Add a concise description…"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="issue-form-grid">
              <label>
                <span>Project</span>
                <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  <option value="">Client backlog</option>
                  {props.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Team</span>
                <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                  <option value="">No team</option>
                  {props.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IssuePriority)}
                >
                  <option value="none">No priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            {mutation.error ? (
              <p className="form-error">{mutation.error.message}</p>
            ) : null}
            <div className="dialog-footer">
              <span>
                <kbd>⌘ Enter</kbd> to create
              </span>
              <button
                className="primary-action"
                disabled={mutation.isPending || title.trim().length < 2}
                type="submit"
              >
                {mutation.isPending ? (
                  <LoaderCircle className="spinner" size={15} />
                ) : (
                  <Plus size={15} />
                )}
                Create issue
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
