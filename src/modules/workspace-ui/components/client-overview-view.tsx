"use client";

import { ExternalLink, FolderKanban, Link2, ListTodo, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientMembersQuery,
  useClientResourcesQuery,
  useCreateClientResourceMutation,
  useDeleteClientResourceMutation,
  useUpdateClientMutation,
} from "@/modules/workspace-ui/application/use-client-queries";
import { ClientIconPicker } from "@/modules/workspace-ui/components/client-icon-picker";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function ClientOverviewView({
  client,
  workspaceSlug,
  resourceCreatorOpen,
  onResourceCreatorOpenChange,
}: {
  client: ClientRecord;
  workspaceSlug: string;
  resourceCreatorOpen: boolean;
  onResourceCreatorOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateClientMutation(workspaceSlug, client.id);
  const resourcesQuery = useClientResourcesQuery(workspaceSlug, client.id);
  const membersQuery = useClientMembersQuery(workspaceSlug, client.id);
  const removeResource = useDeleteClientResourceMutation(workspaceSlug, client.id);
  const root = `/app/${workspaceSlug}/clients/${client.id}`;
  const patch = (request: Record<string, unknown>, optimistic: Partial<ClientRecord>) =>
    update.mutate({ request, optimistic });

  return (
    <>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_220px] gap-16 px-8 py-10 max-lg:grid-cols-1 max-lg:gap-12 max-md:px-5">
        <main className="min-w-0">
          <div className="flex items-center gap-4">
            <ClientIconPicker
              client={client}
              disabled={!client.canEdit || update.isPending}
              onChange={(appearance) => patch(appearance, appearance)}
            />
            <Input
              className="h-auto min-w-0 border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
              defaultValue={client.name}
              disabled={!client.canEdit}
              maxLength={120}
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name.length >= 2 && name !== client.name) patch({ name }, { name });
              }}
            />
          </div>
          <Textarea
            className="mt-4 min-h-9 resize-none border-0 bg-transparent px-0 text-base leading-6 shadow-none focus-visible:ring-0"
            defaultValue={client.description ?? ""}
            disabled={!client.canEdit}
            maxLength={2_000}
            placeholder="Add a description..."
            onBlur={(event) => {
              const description = event.target.value.trim() || null;
              if (description !== client.description) patch({ description }, { description });
            }}
          />

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Pinned resources</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add documents and links for everyone working with this Client.</p>
            <div className="mt-5 grid gap-2">
              {(resourcesQuery.data ?? []).map((resource) => (
                <div className="group/resource flex min-h-14 items-center gap-3 rounded-lg border px-3 hover:bg-accent/40" key={resource.id}>
                  <span className="grid size-8 place-items-center rounded-md bg-muted"><Link2 className="size-4 text-muted-foreground" /></span>
                  <a className="min-w-0 flex-1" href={resource.url} rel="noreferrer" target="_blank">
                    <span className="flex items-center gap-1.5 text-sm font-medium">{resource.title}<ExternalLink className="size-3 text-muted-foreground" /></span>
                    <span className="block truncate text-xs text-muted-foreground">{resource.description ?? hostname(resource.url)}</span>
                  </a>
                  {client.canEdit && !resource.id.startsWith("optimistic-") ? (
                    <Button aria-label="Remove resource" className="opacity-0 group-hover/resource:opacity-100 focus-visible:opacity-100" size="icon-sm" variant="ghost" onClick={() => removeResource.mutate(resource.id)}><Trash2 /></Button>
                  ) : null}
                </div>
              ))}
              {!resourcesQuery.isLoading && !resourcesQuery.data?.length ? <span className="text-sm text-muted-foreground">No pinned resources yet.</span> : null}
            </div>
          </section>
          {update.error ? <p className="mt-4 text-xs text-destructive">{update.error.message}</p> : null}
        </main>

        <aside className="pt-2">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(membersQuery.data ?? []).slice(0, 8).map((member) => (
                <Avatar className="size-7" key={member.membershipId}><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{initials(member.displayName ?? member.email)}</AvatarFallback></Avatar>
              ))}
              {!membersQuery.isLoading && !membersQuery.data?.length ? <span className="text-sm text-muted-foreground">No Client members.</span> : null}
            </div>
          </section>
          <section className="mt-9">
            <h2 className="text-sm font-medium text-muted-foreground">Go to</h2>
            <div className="mt-3 grid gap-1">
              <Button asChild className="justify-start" variant="ghost"><Link href={`${root}/issues`}><ListTodo />Issues</Link></Button>
              <Button asChild className="justify-start" variant="ghost"><Link href={`${root}/projects`}><FolderKanban />Projects</Link></Button>
            </div>
          </section>
        </aside>
      </div>
      <ClientResourceDialog
        clientId={client.id}
        open={resourceCreatorOpen}
        workspaceSlug={workspaceSlug}
        onOpenChange={onResourceCreatorOpenChange}
      />
    </>
  );
}

function ClientResourceDialog({
  workspaceSlug,
  clientId,
  open,
  onOpenChange,
}: {
  workspaceSlug: string;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateClientResourceMutation(workspaceSlug, clientId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ title: title.trim(), url: url.trim(), description: description.trim() || null, iconKey: null }, {
      onSuccess: () => {
        setTitle(""); setUrl(""); setDescription(""); onOpenChange(false);
      },
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add resource</DialogTitle><DialogDescription>Pin a document or link to this Client.</DialogDescription></DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <Input autoFocus placeholder="Resource title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input placeholder="https://..." type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
          <Textarea placeholder="Optional description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {create.error ? <p className="text-xs text-destructive">{create.error.message}</p> : null}
          <Button disabled={create.isPending || !title.trim() || !url.trim()} type="submit">{create.isPending ? <LoaderCircle className="animate-spin" /> : <Link2 />}Add resource</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initials(value: string) {
  return value.split(/\s+|@/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function hostname(value: string) {
  try { return new URL(value).hostname; } catch { return value; }
}
