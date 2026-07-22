"use client";

import { Building2, Hash, KeyRound, LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClientMutation } from "@/modules/workspace-ui/application/use-workspace-queries";
import { CreationDialogFrame } from "@/modules/workspace-ui/components/creation-dialog-frame";
import { CreationTextProperty } from "@/modules/workspace-ui/components/creation-text-property";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function CreateClientDialog({
  workspaceSlug,
  workspaceName,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceSlug: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ClientRecord) => void;
}) {
  const mutation = useCreateClientMutation(workspaceSlug);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [issuePrefix, setIssuePrefix] = useState("");
  const [prefixEdited, setPrefixEdited] = useState(false);
  const [description, setDescription] = useState("");
  const validKey = /^[A-Z][A-Z0-9]{1,11}$/.test(key);
  const validPrefix = /^[A-Z][A-Z0-9]{1,9}$/.test(issuePrefix);
  const canSubmit = name.trim().length >= 2 && validKey && validPrefix;

  const changeName = (value: string) => {
    setName(value);
    const suggestedCode = codeFromName(value);
    if (!keyEdited) setKey(suggestedCode);
    if (!prefixEdited) setIssuePrefix(suggestedCode.slice(0, 10));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      key,
      issuePrefix,
      description: description.trim() || null,
    }, {
      onSuccess: (client) => {
        toast.success("Client created");
        onCreated(client);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CreationDialogFrame
        context={(
          <span className="flex h-8 max-w-56 items-center gap-2 rounded-full border bg-secondary/45 px-3 text-sm text-muted-foreground">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{workspaceName}</span>
          </span>
        )}
        description="Create a customer with a default Issue workflow and namespace."
        open={open}
        title="New client"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit} onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}>
          <div className="min-h-0 flex-1 px-8 pt-8 max-md:px-5 max-md:pt-6">
            <Input autoFocus className="h-auto border-0 bg-transparent px-0 text-3xl font-semibold shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 max-md:text-2xl" maxLength={120} placeholder="Client name" value={name} onChange={(event) => changeName(event.target.value)} />
            <Textarea className="mt-5 min-h-40 resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0" maxLength={2_000} placeholder="Add description..." value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-6 pb-5 max-md:px-5 [&_[data-slot=button]]:rounded-full [&_[data-slot=button]]:border [&_[data-slot=button]]:border-border [&_[data-slot=button]]:bg-secondary/45 [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:hover:bg-secondary/75">
            <CreationTextProperty help="A stable internal code for this Client." icon={KeyRound} label="Client key" maxLength={12} placeholder="Client key" value={key} onChange={(value) => { setKeyEdited(true); setKey(normalizeCode(value, 12)); }} />
            <CreationTextProperty help="Used by default when generating Issue identifiers." icon={Hash} label="Issue prefix" maxLength={10} placeholder="Issue prefix" value={issuePrefix} onChange={(value) => { setPrefixEdited(true); setIssuePrefix(normalizeCode(value, 10)); }} />
          </div>
          {mutation.error ? <p className="px-6 pb-2 text-xs leading-5 text-destructive">{mutation.error.message}</p> : null}
          <div className="flex items-center justify-end border-t px-6 py-4 max-md:px-5">
            <Button className="rounded-full px-5" disabled={mutation.isPending || !canSubmit} type="submit">
              {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create client
            </Button>
          </div>
        </form>
      </CreationDialogFrame>
    </Dialog>
  );
}

function codeFromName(value: string): string {
  return normalizeCode(value.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""), 4);
}

function normalizeCode(value: string, maxLength: number): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, maxLength);
}
