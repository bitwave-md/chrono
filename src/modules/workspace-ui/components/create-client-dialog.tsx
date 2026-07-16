"use client";

import { Building2, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClientMutation } from "@/modules/workspace-ui/application/use-workspace-queries";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function CreateClientDialog({
  workspaceSlug,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: ClientRecord) => void;
}) {
  const mutation = useCreateClientMutation(workspaceSlug);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [issuePrefix, setIssuePrefix] = useState("");
  const [description, setDescription] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      name: name.trim(),
      key: key.trim(),
      issuePrefix: issuePrefix.trim(),
      description: description.trim() || null,
    }, {
      onSuccess: (client) => {
        onCreated(client);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>Add a customer and its default Issue namespace.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <Input autoFocus maxLength={120} placeholder="Client name" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input maxLength={12} placeholder="Key, e.g. DAC" value={key} onChange={(event) => setKey(event.target.value.toUpperCase())} />
            <Input maxLength={10} placeholder="Issue prefix" value={issuePrefix} onChange={(event) => setIssuePrefix(event.target.value.toUpperCase())} />
          </div>
          <Textarea maxLength={2_000} placeholder="Optional description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          {mutation.error ? <p className="text-xs text-destructive">{mutation.error.message}</p> : null}
          <Button disabled={mutation.isPending || name.trim().length < 2 || !key.trim() || !issuePrefix.trim()} type="submit">
            {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Building2 />}
            Create Client
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
