"use client";

import { FolderKanban, GitBranch, LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useClientsQuery, useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { CreationDialogFrame } from "@/modules/workspace-ui/components/creation-dialog-frame";
import { showIssueCreatedToast } from "@/modules/workspace-ui/components/issue-created-toast";
import { IssuePriorityProperty, IssueStatusProperty } from "@/modules/workspace-ui/components/issue-status-priority-properties";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type { IssuePriority, MemberRecord, ProjectBranchRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { issueDetailPath } from "@/modules/workspace-ui/domain/issue-route";
import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface CreateIssueDialogProps {
  open: boolean;
  workspaceSlug: string;
  clientId: string | null;
  selectedProjectId: string | null;
  projects: ProjectRecord[];
  branches: ProjectBranchRecord[];
  selectedBranchId: string | null;
  members: MemberRecord[];
  filters: IssueQueryFilters;
  initialStatusId?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CreateIssueDialog(props: CreateIssueDialogProps) {
  const workspace = useWorkspaceIdentity();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(props.selectedProjectId);
  const [branchId, setBranchId] = useState<string | null>(props.selectedBranchId);
  const [assignees, setAssignees] = useState<MemberRecord[]>([]);
  const [priority, setPriority] = useState<IssuePriority>("none");
  const [statusId, setStatusId] = useState<string | null | undefined>(undefined);
  const [createMore, setCreateMore] = useState(false);
  const project = props.projects.find((candidate) => candidate.id === projectId);
  const clientsQuery = useClientsQuery(props.workspaceSlug);
  const client = clientsQuery.data?.find((candidate) => candidate.id === props.clientId);
  const branchOptions = projectId === props.selectedProjectId ? props.branches : [];
  const branch = branchOptions.find((candidate) => candidate.id === branchId);
  const statusesQuery = useWorkflowStatusesQuery(
    props.workspaceSlug,
    project?.workflowId ?? client?.workflowId ?? null,
  );
  const mutation = useCreateIssueMutation(props.workspaceSlug, props.clientId, props.filters);
  const statuses = statusesQuery.data ?? [];
  const defaultStatus = statuses.find((status) => status.isDefault);
  const selectedStatusId = statusId === undefined
    ? props.initialStatusId ?? defaultStatus?.id ?? null
    : statusId;
  const selectedStatus = statuses.find((status) => status.id === selectedStatusId);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!props.clientId || title.trim().length < 2) return;

    mutation.mutate({
      clientId: props.clientId,
      projectId,
      branchId: projectId ? branchId : null,
      assigneeMembershipIds: assignees.map((member) => member.membershipId),
      assignees,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      visibility: workspace.role === "guest" ? "client_shared" : "internal",
      projectName: project?.name ?? null,
      branchName: branch?.name ?? null,
      statusId: selectedStatusId,
      statusName: selectedStatus?.name ?? defaultStatus?.name ?? "Backlog",
      statusColor: selectedStatus?.color ?? defaultStatus?.color ?? null,
    }, {
      onSuccess: (created, variables) => {
        const status = statuses.find((candidate) => candidate.id === variables.statusId)
          ?? defaultStatus;
        showIssueCreatedToast({
          identifier: created.identifier,
          title: variables.title,
          href: issueDetailPath(props.workspaceSlug, created.issue.id, variables.projectId),
          status: {
            category: status?.category ?? "backlog",
            color: variables.statusColor,
          },
        });
        if (createMore) {
          setTitle("");
          setDescription("");
        } else {
          props.onOpenChange(false);
        }
      },
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <CreationDialogFrame
        context={(
          <span className="flex h-8 max-w-56 items-center gap-2 rounded-full border bg-secondary/45 px-3 text-sm text-muted-foreground">
            <FolderKanban className="size-4 shrink-0" />
            <span className="truncate">{project?.name ?? client?.name ?? "No project"}</span>
          </span>
        )}
        description="Create an Issue with Project, status, priority, and assignees."
        open={props.open}
        title="New issue"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}>
          <div className="min-h-0 flex-1 px-8 pt-8 max-md:px-5 max-md:pt-6">
            <Input autoFocus className="h-auto border-0 bg-transparent px-0 text-3xl font-semibold shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 max-md:text-2xl" maxLength={240} placeholder="Issue title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea className="mt-5 min-h-40 resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0" maxLength={20_000} placeholder="Add description..." value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-6 pb-5 max-md:px-5 [&_[data-slot=button]]:rounded-full [&_[data-slot=button]]:border [&_[data-slot=button]]:border-border [&_[data-slot=button]]:bg-secondary/45 [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:hover:bg-secondary/75">
            {workspace.role !== "guest" ? <>
              <IssueStatusProperty statuses={statuses} statusColor={selectedStatus?.color ?? defaultStatus?.color ?? null} statusId={selectedStatusId} statusName={selectedStatus?.name ?? defaultStatus?.name ?? "Backlog"} disabled={!statuses.length} onChange={(status) => setStatusId(status.id)} />
              <IssuePriorityProperty value={priority} onChange={setPriority} />
              <AssigneeProperty members={props.members} value={assignees} onChange={setAssignees} />
            </> : null}
            <OptionProperty allowEmpty icon={FolderKanban} label="Project" options={props.projects.map((item) => ({ value: item.id, label: item.name }))} placeholder="No project" value={projectId} onChange={(value) => { setProjectId(value); setBranchId(null); setStatusId(undefined); }} />
            {projectId ? <OptionProperty allowEmpty icon={GitBranch} label="Branch" options={branchOptions.map((item) => ({ value: item.id, label: item.name }))} placeholder="Main" value={branchId} onChange={setBranchId} /> : null}
          </div>
          {mutation.error ? <p className="px-6 pb-2 text-xs leading-5 text-destructive">{mutation.error.message}</p> : null}
          <div className="flex items-center justify-end gap-4 border-t px-6 py-4 max-md:px-5">
            <button aria-checked={createMore} className="flex items-center gap-2 text-sm text-muted-foreground" role="switch" type="button" onClick={() => setCreateMore((value) => !value)}>
              <span className={cn("flex h-5 w-9 items-center rounded-full bg-muted p-0.5 transition-colors", createMore && "bg-primary")}>
                <span className={cn("size-4 rounded-full bg-foreground shadow-sm transition-transform", createMore && "translate-x-4 bg-primary-foreground")} />
              </span>
              Create more
            </button>
            <Button className="rounded-full px-5" disabled={mutation.isPending || title.trim().length < 2} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create issue
            </Button>
          </div>
        </form>
      </CreationDialogFrame>
    </Dialog>
  );
}
