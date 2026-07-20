"use client";

import { FolderKanban, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProjectMutation } from "@/modules/workspace-ui/application/use-workspace-queries";
import type { ClientRecord, ProjectPriority, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

type ProjectVisibility = ProjectRecord["visibility"];

export function CreateProjectDialog({
  clients,
  initialClientId,
  open,
  workspaceSlug,
  onCreated,
  onOpenChange,
}: {
  clients: ClientRecord[];
  initialClientId: string | null;
  open: boolean;
  workspaceSlug: string;
  onCreated: (projectId: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateProjectMutation(workspaceSlug);
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [namespacePrefix, setNamespacePrefix] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("internal");
  const [priority, setPriority] = useState<ProjectPriority>("none");
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
        onCreated(project.id);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-400"><FolderKanban className="size-5" /></div>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Create a Client-owned Project with its own workflow and optional Issue prefix.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {!initialClientId ? (
            <Field label="Client">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Project name">
            <Input autoFocus maxLength={160} placeholder="e.g. Online Credit CRM" value={name} onChange={(event) => changeName(event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field hint="Used in the Project URL." label="Slug">
              <Input maxLength={63} placeholder="online-credit-crm" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(normalizeSlugInput(event.target.value)); }} />
            </Field>
            <Field hint="Optional Issue namespace override." label="Issue prefix">
              <Input maxLength={10} placeholder="Uses Client prefix" value={namespacePrefix} onChange={(event) => setNamespacePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visibility">
              <Select value={visibility} onValueChange={(value) => setVisibility(value as ProjectVisibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="internal">Internal</SelectItem><SelectItem value="client_shared">Client shared</SelectItem><SelectItem value="restricted">Restricted</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onValueChange={(value) => setPriority(value as ProjectPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No priority</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea maxLength={2_000} placeholder="Optional Project context and goals" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          {mutation.error ? <p className="text-xs text-destructive">{mutation.error.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={mutation.isPending || !canSubmit} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <FolderKanban />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, hint, label }: { children: React.ReactNode; hint?: string; label: string }) {
  return <label className="grid gap-1.5 text-xs font-medium">{label}{children}{hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}</label>;
}

function slugFromName(value: string): string {
  return normalizeSlugInput(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""));
}

function normalizeSlugInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}
