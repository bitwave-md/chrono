"use client";

import { FolderKanban, LoaderCircle, Plus, Signal, X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { useCreateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import { useWorkflowStatusesQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { gsap, useGSAP } from "@/modules/workspace-ui/application/workspace-animation";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type { IssuePriority, MemberRecord, ProjectNode } from "@/modules/workspace-ui/domain/workspace-types";
import type { IssueQueryFilters } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

interface CreateIssueDialogProps {
  open: boolean;
  workspaceSlug: string;
  clientId: string | null;
  selectedProjectId: string | null;
  projects: ProjectNode[];
  members: MemberRecord[];
  filters: IssueQueryFilters;
  onOpenChange: (open: boolean) => void;
}

const priorityOptions = [
  { value: "none", label: "No priority", color: "#6b7280" },
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "medium", label: "Medium", color: "#eab308" },
  { value: "low", label: "Low", color: "#60a5fa" },
];

export function CreateIssueDialog(props: CreateIssueDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(props.selectedProjectId);
  const [assignees, setAssignees] = useState<MemberRecord[]>([]);
  const [priority, setPriority] = useState<IssuePriority>("none");
  const project = props.projects.find((candidate) => candidate.id === projectId);
  const statusesQuery = useWorkflowStatusesQuery(props.workspaceSlug, project?.effectiveWorkflowId ?? null);
  const mutation = useCreateIssueMutation(props.workspaceSlug, props.clientId, props.filters);

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(contentRef.current, { opacity: 0, y: 18, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" });
      }
    },
    { dependencies: [props.open], revertOnUpdate: true },
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!props.clientId || title.trim().length < 2) return;
    const defaultStatus = statusesQuery.data?.find((status) => status.isDefault);

    mutation.mutate({
      clientId: props.clientId,
      projectId,
      assigneeMembershipIds: assignees.map((member) => member.membershipId),
      assignees,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      visibility: "internal",
      projectName: project?.name ?? null,
      statusId: projectId ? defaultStatus?.id ?? null : null,
      statusName: projectId ? defaultStatus?.name ?? "Backlog" : null,
    }, { onSuccess: () => props.onOpenChange(false) });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="top-[15svh] translate-y-0 gap-0 overflow-hidden p-0 shadow-2xl will-change-transform sm:max-w-xl max-md:top-[7svh]" ref={contentRef} showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between border-b p-4">
          <div>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>Capture work and assign responsibility.</DialogDescription>
          </div>
          <DialogClose asChild><Button aria-label="Close" size="icon-sm" variant="ghost"><X /></Button></DialogClose>
        </DialogHeader>

        <form className="grid gap-3 p-4" onSubmit={submit} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}>
          <Input autoFocus className="border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0" maxLength={240} placeholder="Issue title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea maxLength={20_000} placeholder="Add a concise description..." rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="flex flex-wrap items-center gap-1 border-y py-2">
            <OptionProperty allowEmpty icon={FolderKanban} label="Project" options={props.projects.map((item) => ({ value: item.id, label: item.name }))} placeholder="Client backlog" value={projectId} onChange={setProjectId} />
            <OptionProperty icon={Signal} label="Priority" options={priorityOptions} placeholder="No priority" value={priority} onChange={(value) => setPriority((value ?? "none") as IssuePriority)} />
            <AssigneeProperty members={props.members} value={assignees} onChange={setAssignees} />
          </div>
          {mutation.error ? <p className="text-xs leading-5 text-destructive">{mutation.error.message}</p> : null}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground"><Kbd>⌘ Enter</Kbd> to create</span>
            <Button disabled={mutation.isPending || title.trim().length < 2} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
