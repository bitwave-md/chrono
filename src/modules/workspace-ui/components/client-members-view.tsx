"use client";

import { Check, LoaderCircle, Trash2, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useAddClientMemberMutation,
  useClientMembersQuery,
  useRemoveClientMemberMutation,
  useUpdateClientMemberMutation,
} from "@/modules/workspace-ui/application/use-client-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type { ClientMemberRecord, ClientRecord, MemberRecord } from "@/modules/workspace-ui/domain/workspace-types";

const permissionOptions = [
  { value: "view", label: "View", color: "#94a3b8" },
  { value: "comment", label: "Comment", color: "#60a5fa" },
  { value: "contribute", label: "Contribute", color: "#22c55e" },
];

export function ClientMembersView({
  client,
  workspaceSlug,
  memberCreatorOpen,
  onMemberCreatorOpenChange,
}: {
  client: ClientRecord;
  workspaceSlug: string;
  memberCreatorOpen: boolean;
  onMemberCreatorOpenChange: (open: boolean) => void;
}) {
  const membersQuery = useClientMembersQuery(workspaceSlug, client.id);
  const update = useUpdateClientMemberMutation(workspaceSlug, client.id);
  const remove = useRemoveClientMemberMutation(workspaceSlug, client.id);
  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-8 py-8 max-md:px-5">
        <div className="mb-6"><h1 className="text-xl font-semibold">Members</h1><p className="mt-1 text-sm text-muted-foreground">People explicitly connected to {client.name}.</p></div>
        <div className="divide-y border-y">
          {(membersQuery.data ?? []).map((member) => (
            <div className="flex min-h-16 items-center gap-3 px-3" key={member.membershipId}>
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{member.displayName ?? member.email}</strong><span className="block truncate text-xs capitalize text-muted-foreground">{member.role} · {member.email}</span></div>
              {client.canManage ? (
                <>
                  <OptionProperty
                    icon={UserPlus}
                    label="Permission"
                    options={permissionOptions}
                    placeholder="View"
                    value={member.permission}
                    onChange={(permission) => permission && update.mutate({ membershipId: member.membershipId, permission: permission as ClientMemberRecord["permission"] })}
                  />
                  <Button aria-label="Remove Client member" disabled={remove.isPending} size="icon-sm" variant="ghost" onClick={() => remove.mutate(member.membershipId)}><Trash2 /></Button>
                </>
              ) : <span className="text-xs capitalize text-muted-foreground">{member.permission}</span>}
            </div>
          ))}
          {!membersQuery.isLoading && !membersQuery.data?.length ? <div className="p-8 text-center text-sm text-muted-foreground">No members have been added to this Client.</div> : null}
        </div>
      </div>
      <ClientMemberDialog
        clientId={client.id}
        current={membersQuery.data ?? []}
        open={memberCreatorOpen}
        workspaceSlug={workspaceSlug}
        onOpenChange={onMemberCreatorOpenChange}
      />
    </>
  );
}

function ClientMemberDialog({
  workspaceSlug,
  clientId,
  current,
  open,
  onOpenChange,
}: {
  workspaceSlug: string;
  clientId: string;
  current: ClientMemberRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const membersQuery = useMembersQuery(workspaceSlug);
  const add = useAddClientMemberMutation(workspaceSlug, clientId);
  const selected = new Set(current.map((member) => member.membershipId));
  const available = (membersQuery.data ?? []).filter((member) => !selected.has(member.membershipId));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-0"><DialogTitle>Add member</DialogTitle><DialogDescription>Connect a Workspace user to this Client.</DialogDescription></DialogHeader>
        <Command>
          <CommandInput placeholder="Search Workspace members..." />
          <CommandList className="max-h-80">
            <CommandEmpty>No available member found.</CommandEmpty>
            <CommandGroup>
              {available.map((member) => (
                <CommandItem
                  disabled={add.isPending}
                  key={member.membershipId}
                  value={`${member.displayName ?? ""} ${member.email}`}
                  onSelect={() => add.mutate({ member, permission: "contribute" }, { onSuccess: () => onOpenChange(false) })}
                >
                  <MemberAvatar member={member} />
                  <span className="min-w-0 flex-1 truncate">{member.displayName ?? member.email}</span>
                  {add.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4 opacity-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function MemberAvatar({ member }: { member: MemberRecord }) {
  const label = member.displayName ?? member.email;
  return <Avatar className="size-8"><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.6rem]">{label.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>;
}
