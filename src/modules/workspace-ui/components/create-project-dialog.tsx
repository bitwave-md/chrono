"use client";

import { Eye, Hash, Link2, LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProjectMutation } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { CreationDialogFrame } from "@/modules/workspace-ui/components/creation-dialog-frame";
import { CreationTextProperty } from "@/modules/workspace-ui/components/creation-text-property";
import { IssuePriorityProperty } from "@/modules/workspace-ui/components/issue-status-priority-properties";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type { ClientRecord, ProjectPriority, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

type ProjectVisibility = ProjectRecord["visibility"];

const visibilityOptions = [
  { value: "internal", label: "Internal", color: "#94a3b8" },
  { value: "client_shared", label: "Client shared", color: "#22c55e" },
  { value: "restricted", label: "Restricted", color: "#f59e0b" },
];

export function CreateProjectDialog(props: {
  clients: ClientRecord[];
  initialClientId: string | null;
  open: boolean;
  workspaceSlug: string;
  onCreated: (projectId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateProjectMutation(props.workspaceSlug);
  const [clientId, setClientId] = useState(props.initialClientId ?? props.clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [namespacePrefix, setNamespacePrefix] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("internal");
  const [priority, setPriority] = useState<ProjectPriority>("none");
  const client = props.clients.find((candidate) => candidate.id === clientId);
  const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2;
  const validPrefix = !namespacePrefix || /^[A-Z][A-Z0-9]{1,9}$/.test(namespacePrefix);
  const canSubmit = Boolean(clientId && name.trim().length >= 2 && validSlug && validPrefix);

  const changeName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugFromName(value));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      clientId,
      visibility,
      priority,
      leadMembershipId: null,
      name: name.trim(),
      slug,
      description: description.trim() || null,
      namespacePrefix: namespacePrefix || null,
    }, {
      onSuccess: ({ project }) => {
        toast.success("Project created");
        props.onCreated(project.id);
        props.onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <CreationDialogFrame
        context={<ClientContext clients={props.clients} client={client} fixed={Boolean(props.initialClientId)} value={clientId} onChange={setClientId} />}
        description="Create a Client-owned Project with workflow, priority, visibility, and Issue namespace settings."
        open={props.open}
        title="New project"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}>
          <div className="min-h-0 flex-1 px-8 pt-8 max-md:px-5 max-md:pt-6">
            <Input autoFocus className="h-auto border-0 bg-transparent px-0 text-3xl font-semibold shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 max-md:text-2xl" maxLength={160} placeholder="Project title" value={name} onChange={(event) => changeName(event.target.value)} />
            <Textarea className="mt-5 min-h-40 resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0" maxLength={2_000} placeholder="Add description..." value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-6 pb-5 max-md:px-5 [&_[data-slot=button]]:rounded-full [&_[data-slot=button]]:border [&_[data-slot=button]]:border-border [&_[data-slot=button]]:bg-secondary/45 [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:hover:bg-secondary/75">
            <IssuePriorityProperty value={priority} onChange={setPriority} />
            <OptionProperty icon={Eye} label="Visibility" options={visibilityOptions} placeholder="Internal" value={visibility} onChange={(value) => value && setVisibility(value as ProjectVisibility)} />
            <CreationTextProperty help="Used in Project URLs." icon={Link2} label="Project slug" maxLength={63} placeholder="Project slug" value={slug} onChange={(value) => { setSlugEdited(true); setSlug(normalizeSlugInput(value)); }} />
            <CreationTextProperty help="Leave empty to inherit the Client Issue prefix." icon={Hash} label="Issue prefix" maxLength={10} placeholder="Client prefix" value={namespacePrefix} onChange={(value) => setNamespacePrefix(normalizePrefixInput(value))} />
          </div>
          {mutation.error ? <p className="px-6 pb-2 text-xs leading-5 text-destructive">{mutation.error.message}</p> : null}
          <div className="flex items-center justify-end border-t px-6 py-4 max-md:px-5">
            <Button className="rounded-full px-5" disabled={mutation.isPending || !canSubmit} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create project
            </Button>
          </div>
        </form>
      </CreationDialogFrame>
    </Dialog>
  );
}

function ClientContext({ clients, client, fixed, value, onChange }: { clients: ClientRecord[]; client: ClientRecord | undefined; fixed: boolean; value: string; onChange: (value: string) => void }) {
  const icon = client ? <ClientIcon className="size-4 rounded" client={client} iconClassName={client.iconType === "emoji" ? "text-[0.55rem]" : "size-2.5"} /> : null;
  if (fixed) return <span className="flex h-8 max-w-56 items-center gap-2 rounded-full border bg-secondary/45 px-3 text-sm text-muted-foreground">{icon}<span className="truncate">{client?.name ?? "Client"}</span></span>;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto max-w-56 rounded-full bg-secondary/45 px-3 shadow-none">{icon}<SelectValue placeholder="Select Client" /></SelectTrigger>
      <SelectContent>{clients.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function slugFromName(value: string): string {
  return normalizeSlugInput(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""));
}

function normalizeSlugInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

function normalizePrefixInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}
