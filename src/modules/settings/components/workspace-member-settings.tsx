"use client";

import { Copy, ExternalLink, KeyRound, LoaderCircle, MailPlus, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePasswordResetMutation, useInviteMemberMutation, useRefreshInvitationMutation, useRevokeInvitationMutation, useSettingsMembersQuery, useUpdateMemberMutation } from "@/modules/settings/application/use-settings-queries";
import { useClientsQuery, useProjectsQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
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
  const resetPassword = useCreatePasswordResetMutation(workspaceSlug);
  const [bearerUrl, setBearerUrl] = useState<{ title: string; url: string } | null>(null);
  const [role, setRole] = useState<WorkspaceIdentity["role"]>("member");
  const [clientFilter, setClientFilter] = useState("");
  const [guestClients, setGuestClients] = useState<Array<{ clientId: string; excludedProjectIds: string[] }>>([]);
  const clientsQuery = useClientsQuery(workspaceSlug);
  const projectsQuery = useProjectsQuery(workspaceSlug, null);
  const visibleClients = useMemo(() => (clientsQuery.data ?? []).filter((client) => client.name.toLowerCase().includes(clientFilter.toLowerCase())), [clientFilter, clientsQuery.data]);
  if (query.isLoading) return <SettingsPageFrame description="Invite people and manage their access." title="Members"><SettingsLoading /></SettingsPageFrame>;
  if (query.error || !query.data) return <SettingsPageFrame description="Invite people and manage their access." title="Members"><SettingsError message={query.error?.message ?? "Member settings unavailable."} /></SettingsPageFrame>;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const email = new FormData(form).get("email"); if (typeof email !== "string") return;
    invite.mutate({ email, role, guestAccess: role === "guest" ? { clients: guestClients } : undefined }, { onSuccess: (result) => { form.reset(); setGuestClients([]); setBearerUrl({ title: "Registration link", url: result.registrationUrl }); toast.success("Invitation created"); }, onError: (error) => toast.error(error.message) });
  };
  const toggleClient = (clientId: string) => setGuestClients((current) => current.some((item) => item.clientId === clientId) ? current.filter((item) => item.clientId !== clientId) : [...current, { clientId, excludedProjectIds: [] }]);
  const toggleProject = (clientId: string, projectId: string) => setGuestClients((current) => current.map((item) => item.clientId !== clientId ? item : { ...item, excludedProjectIds: item.excludedProjectIds.includes(projectId) ? item.excludedProjectIds.filter((id) => id !== projectId) : [...item.excludedProjectIds, projectId] }));
  return (
    <SettingsPageFrame description="Invite collaborators, assign roles, and suspend access without losing historical work." title="Members">
      <SettingsSection title="Invite someone" description="Invited people receive access after signing in with this email address.">
        <form className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto]" onSubmit={submit}>
          <Input name="email" placeholder="name@company.com" required type="email" />
          <Select value={role} onValueChange={(value) => setRole(value as WorkspaceIdentity["role"])}><SelectTrigger className="capitalize"><SelectValue /></SelectTrigger><SelectContent>{roles.filter((value) => workspace.role === "owner" || (value !== "owner" && value !== "admin")).map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
          <Button disabled={invite.isPending || (role === "guest" && !guestClients.length)} size="sm" type="submit">{invite.isPending ? <LoaderCircle className="animate-spin" /> : <MailPlus />}Invite</Button>
          {role === "guest" ? <div className="grid gap-3 border-t pt-4 sm:col-span-3">
            <div><strong className="text-sm font-medium">Client access</strong><p className="mt-1 text-xs text-muted-foreground">Guests can create Issues, comments, replies, Project updates, and attachments. New Projects require explicit access later.</p></div>
            <Input placeholder="Search Clients..." value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} />
            <div className="grid max-h-72 gap-2 overflow-y-auto">
              {visibleClients.map((client) => {
                const access = guestClients.find((item) => item.clientId === client.id);
                const clientProjects = (projectsQuery.data ?? []).filter((project) => project.clientId === client.id);
                return <div className="rounded-lg border p-3" key={client.id}>
                  <label className="flex items-center gap-2 text-sm font-medium"><input checked={Boolean(access)} type="checkbox" onChange={() => toggleClient(client.id)} /><span>{client.name}</span><span className="ml-auto text-xs text-muted-foreground">{access ? `${clientProjects.length - access.excludedProjectIds.length}/${clientProjects.length} Projects` : "No access"}</span></label>
                  {access ? <div className="mt-2 grid gap-1 border-t pt-2">{clientProjects.map((project) => <label className="flex items-center gap-2 pl-5 text-xs text-muted-foreground" key={project.id}><input checked={!access.excludedProjectIds.includes(project.id)} type="checkbox" onChange={() => toggleProject(client.id, project.id)} /><span>{project.name}</span></label>)}</div> : null}
                </div>;
              })}
            </div>
          </div> : null}
        </form>
      </SettingsSection>
      {bearerUrl ? <SettingsSection title={bearerUrl.title} description="Shown once. Transfer this bearer credential through a trusted channel."><div className="flex items-center gap-2 p-4"><Input className="font-mono text-xs" readOnly value={bearerUrl.url} /><Button aria-label="Copy link" size="icon-sm" variant="outline" onClick={() => { navigator.clipboard.writeText(bearerUrl.url); toast.success("Link copied"); }}><Copy /></Button><Button asChild aria-label="Open link" size="icon-sm" variant="outline"><a href={bearerUrl.url} rel="noreferrer" target="_blank"><ExternalLink /></a></Button></div></SettingsSection> : null}
      <SettingsSection title={`Members · ${query.data.members.length}`}>
        {query.data.members.map((member) => {
          const protectedTarget = workspace.role === "admin" && (member.role === "owner" || member.role === "admin");
          return <div className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-b-0" key={member.membershipId}>
            <Avatar className="size-8"><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.6rem]">{initials(member.displayName ?? member.email)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{member.displayName ?? member.email}</strong><span className="block truncate text-xs text-muted-foreground">{member.email} · {member.status}</span></div>
            <Select disabled={protectedTarget || member.status === "removed"} value={member.role} onValueChange={(next) => update.mutate({ membershipId: member.membershipId, role: next as WorkspaceIdentity["role"] }, { onSuccess: () => toast.success("Member role updated"), onError: (error) => toast.error(error.message) })}><SelectTrigger className="w-28 capitalize" size="sm"><SelectValue /></SelectTrigger><SelectContent>{roles.filter((value) => workspace.role === "owner" || (value !== "owner" && value !== "admin")).map((value) => <SelectItem className="capitalize" key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
            {member.status === "active" && !protectedTarget ? <Button aria-label={`Create password reset for ${member.displayName ?? member.email}`} disabled={resetPassword.isPending} size="icon-sm" variant="ghost" onClick={() => resetPassword.mutate(member.membershipId, { onSuccess: (result) => setBearerUrl({ title: "Password reset link", url: result.resetUrl }), onError: (error) => toast.error(error.message) })}><KeyRound /></Button> : null}
            <Button disabled={protectedTarget || update.isPending} size="sm" variant={member.status === "active" ? "ghost" : "outline"} onClick={() => update.mutate({ membershipId: member.membershipId, status: member.status === "active" ? "suspended" : "active" }, { onSuccess: () => toast.success(member.status === "active" ? "Member suspended" : "Member restored"), onError: (error) => toast.error(error.message) })}>{member.status === "active" ? "Suspend" : "Restore"}</Button>
            {member.status !== "removed" ? <Button aria-label={`Remove ${member.displayName ?? member.email}`} disabled={protectedTarget || update.isPending} size="icon-sm" variant="ghost" onClick={() => update.mutate({ membershipId: member.membershipId, status: "removed" }, { onSuccess: () => toast.success("Member removed"), onError: (error) => toast.error(error.message) })}><Trash2 /></Button> : null}
          </div>;
        })}
      </SettingsSection>
      {query.data.invitations.length ? <SettingsSection title="Pending invitations">
        {query.data.invitations.map((invitation) => <div className="flex min-h-14 items-center gap-3 border-b px-4 py-3 last:border-b-0" key={invitation.id}><ShieldCheck className="size-4 text-muted-foreground" /><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{invitation.email}</strong><span className="text-xs capitalize text-muted-foreground">{invitation.role} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</span></div><Button aria-label="Refresh invitation" disabled={refresh.isPending} size="icon-sm" variant="ghost" onClick={() => refresh.mutate(invitation.id, { onSuccess: (result) => { setBearerUrl({ title: "Refreshed registration link", url: result.registrationUrl }); toast.success("Invitation refreshed"); }, onError: (error) => toast.error(error.message) })}><RotateCw /></Button><Button aria-label="Revoke invitation" disabled={revoke.isPending} size="icon-sm" variant="ghost" onClick={() => revoke.mutate(invitation.id, { onSuccess: () => toast.success("Invitation revoked"), onError: (error) => toast.error(error.message) })}><Trash2 /></Button></div>)}
      </SettingsSection> : null}
    </SettingsPageFrame>
  );
}

function initials(value: string) { return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
