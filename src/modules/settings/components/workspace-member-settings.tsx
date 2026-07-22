"use client";

import { LoaderCircle, MailPlus, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInviteMemberMutation, useRefreshInvitationMutation, useRevokeInvitationMutation, useSettingsMembersQuery, useUpdateMemberMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsSection } from "@/modules/settings/components/settings-primitives";
import type { WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

const roles: WorkspaceIdentity["role"][] = ["owner", "admin", "member", "guest"];

export function WorkspaceMemberSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const query = useSettingsMembersQuery(workspaceSlug);
  const invite = useInviteMemberMutation(workspaceSlug);
  const update = useUpdateMemberMutation(workspaceSlug);
  const refresh = useRefreshInvitationMutation(workspaceSlug);
  const revoke = useRevokeInvitationMutation(workspaceSlug);
  const [role, setRole] = useState<WorkspaceIdentity["role"]>("member");
  if (query.isLoading) return <SettingsPageFrame description="Invite people and manage their access." title="Members"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Invite people and manage their access." title="Members"><SettingsError message={query.error?.message ?? "Member settings unavailable."} /></SettingsPageFrame>;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const email = new FormData(form).get("email"); if (typeof email !== "string") return;
    invite.mutate({ email, role }, { onSuccess: () => { form.reset(); toast.success("Invitation created"); }, onError: (error) => toast.error(error.message) });
  };
  return (
    <SettingsPageFrame description="Invite collaborators, assign roles, and suspend access without losing historical work." title="Members">
      <SettingsSection title="Invite someone" description="Invited people receive access after signing in with this email address.">
        <form className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto]" onSubmit={submit}>
          <Input name="email" placeholder="name@company.com" required type="email" />
          <Select value={role} onValueChange={(value) => setRole(value as WorkspaceIdentity["role"])}><SelectTrigger className="capitalize"><SelectValue /></SelectTrigger><SelectContent>{roles.filter((value) => workspace.role === "owner" || (value !== "owner" && value !== "admin")).map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          <Button disabled={invite.isPending} size="sm" type="submit">{invite.isPending ? <LoaderCircle className="animate-spin" /> : <MailPlus />}Invite</Button>
        </form>
      </SettingsSection>
      <SettingsSection title={`Members · ${query.data.members.length}`}>
        {query.data.members.map((member) => {
          const protectedTarget = workspace.role === "admin" && (member.role === "owner" || member.role === "admin");
          return <div className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-b-0" key={member.membershipId}>
            <Avatar className="size-8"><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.6rem]">{initials(member.displayName ?? member.email)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{member.displayName ?? member.email}</strong><span className="block truncate text-xs text-muted-foreground">{member.email} · {member.status}</span></div>
            <Select disabled={protectedTarget || member.status === "removed"} value={member.role} onValueChange={(next) => update.mutate({ membershipId: member.membershipId, role: next as WorkspaceIdentity["role"] }, { onSuccess: () => toast.success("Member role updated"), onError: (error) => toast.error(error.message) })}><SelectTrigger className="w-28 capitalize" size="sm"><SelectValue /></SelectTrigger><SelectContent>{roles.filter((value) => workspace.role === "owner" || (value !== "owner" && value !== "admin")).map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            <Button disabled={protectedTarget || update.isPending} size="sm" variant={member.status === "active" ? "ghost" : "outline"} onClick={() => update.mutate({ membershipId: member.membershipId, status: member.status === "active" ? "suspended" : "active" }, { onSuccess: () => toast.success(member.status === "active" ? "Member suspended" : "Member restored"), onError: (error) => toast.error(error.message) })}>{member.status === "active" ? "Suspend" : "Restore"}</Button>
            {member.status !== "removed" ? <Button aria-label={`Remove ${member.displayName ?? member.email}`} disabled={protectedTarget || update.isPending} size="icon-sm" variant="ghost" onClick={() => update.mutate({ membershipId: member.membershipId, status: "removed" }, { onSuccess: () => toast.success("Member removed"), onError: (error) => toast.error(error.message) })}><Trash2 /></Button> : null}
          </div>;
        })}
      </SettingsSection>
      {query.data.invitations.length ? <SettingsSection title="Pending invitations">
        {query.data.invitations.map((invitation) => <div className="flex min-h-14 items-center gap-3 border-b px-4 py-3 last:border-b-0" key={invitation.id}><ShieldCheck className="size-4 text-muted-foreground" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{invitation.email}</strong><span className="text-xs capitalize text-muted-foreground">{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span></div><Button aria-label="Refresh invitation" disabled={refresh.isPending} size="icon-sm" variant="ghost" onClick={() => refresh.mutate(invitation.id, { onSuccess: () => toast.success("Invitation refreshed"), onError: (error) => toast.error(error.message) })}><RotateCw /></Button><Button aria-label="Revoke invitation" disabled={revoke.isPending} size="icon-sm" variant="ghost" onClick={() => revoke.mutate(invitation.id, { onSuccess: () => toast.success("Invitation revoked"), onError: (error) => toast.error(error.message) })}><Trash2 /></Button></div>)}
      </SettingsSection> : null}
    </SettingsPageFrame>
  );
}

function initials(value: string) { return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
