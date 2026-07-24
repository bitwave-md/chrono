"use client";

import { LoaderCircle, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddProjectMemberMutation, useProjectMembersQuery, useRemoveProjectMemberMutation } from "@/modules/workspace-ui/application/use-project-detail-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import type { ProjectDetailRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

export function ProjectMembersView({ project, workspaceSlug }: { project: ProjectDetailRecord; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const membersQuery = useProjectMembersQuery(workspaceSlug, project.id);
  const workspaceMembersQuery = useMembersQuery(workspaceSlug);
  const add = useAddProjectMemberMutation(workspaceSlug, project.id);
  const remove = useRemoveProjectMemberMutation(workspaceSlug, project.id);
  const [open, setOpen] = useState(false);
  const canManage = workspace.role === "owner" || workspace.role === "admin" || project.lead?.email === workspace.userEmail;
  const members = membersQuery.data ?? [];
  const available = (workspaceMembersQuery.data ?? []).filter((member) => !members.some((current) => current.membershipId === member.membershipId));
  const initials = (value: string) => value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  const addMember = (membershipId: string) => add.mutate(membershipId, { onSuccess: () => { setOpen(false); toast.success("Project member added"); }, onError: (error) => toast.error(error.message) });
  return <div className="mx-auto w-full max-w-3xl px-5 py-7">
    <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold">Project members</h1><p className="mt-1 text-sm text-muted-foreground">People who can access every Issue in {project.name}.</p></div>{canManage ? <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button className="rounded-full" size="sm"><Plus />Add member</Button></PopoverTrigger><PopoverContent align="end" className="w-72 p-2"><strong className="px-2 text-xs text-muted-foreground">Workspace members</strong>{available.length ? available.map((member) => <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent" key={member.membershipId} type="button" onClick={() => addMember(member.membershipId)}><Avatar className="size-6"><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{initials(member.displayName ?? member.email)}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate">{member.displayName ?? member.email}</span><span className="text-xs capitalize text-muted-foreground">{member.role}</span></button>) : <p className="px-2 py-3 text-sm text-muted-foreground">Everyone already has access.</p>}</PopoverContent></Popover> : null}</div>
    <div className="mt-6 divide-y rounded-xl border">{members.map((member) => <div className="flex min-h-16 items-center gap-3 px-4 py-3" key={member.membershipId}><Avatar className="size-8"><AvatarImage alt="" src={member.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.6rem]">{initials(member.displayName ?? member.email)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{member.displayName ?? member.email}</strong><span className="text-xs text-muted-foreground">{member.email} · {member.role === "guest" ? "Guest" : "Workspace member"}</span></div>{canManage ? <Button aria-label={`Remove ${member.displayName ?? member.email}`} disabled={remove.isPending} size="icon-sm" variant="ghost" onClick={() => remove.mutate(member.membershipId, { onSuccess: () => toast.success("Project member removed"), onError: (error) => toast.error(error.message) })}>{remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}</Button> : null}</div>)}{!members.length && !membersQuery.isLoading ? <div className="grid place-items-center gap-2 p-12 text-center text-sm text-muted-foreground"><UserRound className="size-5" />No Project members yet.</div> : null}</div>
  </div>;
}
