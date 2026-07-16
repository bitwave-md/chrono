"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Eye,
  FolderKanban,
  Link2,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Signal,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAddProjectMilestoneMutation, useAddProjectResourceMutation, useProjectActivityQuery, useProjectQuery, usePublishProjectUpdateMutation, useUpdateProjectMutation } from "@/modules/workspace-ui/application/use-project-detail-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { MemberProperty } from "@/modules/workspace-ui/components/member-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { ProjectBranchSection } from "@/modules/workspace-ui/components/project-branch-section";
import { ProjectIssuesView } from "@/modules/workspace-ui/components/project-issues-view";
import { projectPriorityOptions, projectStateOptions } from "@/modules/workspace-ui/components/project-property-options";
import { RouteHeader } from "@/modules/workspace-ui/components/route-header";
import type { ProjectDetailRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

type ProjectTab = "overview" | "activity" | "issues";

const visibilityOptions = [
  { value: "internal", label: "Internal", color: "#94a3b8" },
  { value: "client_shared", label: "Client shared", color: "#22c55e" },
  { value: "restricted", label: "Restricted", color: "#f59e0b" },
];
const healthOptions = [
  { value: "on_track", label: "On track", color: "#22c55e" },
  { value: "at_risk", label: "At risk", color: "#f59e0b" },
  { value: "off_track", label: "Off track", color: "#ef4444" },
];

export function ProjectRouteView({ workspaceSlug, projectId, tab }: { workspaceSlug: string; projectId: string; tab: ProjectTab }) {
  const projectQuery = useProjectQuery(workspaceSlug, projectId);
  const project = projectQuery.data;
  if (projectQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading project...</div>;
  if (!project) return <div className="p-6 text-sm text-destructive">{projectQuery.error?.message ?? "Project not found."}</div>;

  return (
    <>
      <RouteHeader breadcrumbs={[
        { label: project.clientName, href: `/app/${workspaceSlug}/clients/${project.clientId}/overview` },
        { label: "Projects", href: `/app/${workspaceSlug}/clients/${project.clientId}/projects` },
      ]} title={project.name} />
      <div className="border-b px-5 pt-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 place-items-center rounded-md bg-muted"><FolderKanban className="size-5" /></span>
          <div className="min-w-0"><h1 className="truncate text-xl font-semibold">{project.name}</h1><p className="mt-1 text-sm text-muted-foreground">{project.summary ?? "Add a short project summary"}</p></div>
        </div>
        <nav className="mt-5 flex gap-5 text-sm">
          {(["overview", "activity", "issues"] as const).map((item) => (
            <Link className={`border-b-2 pb-2 capitalize ${tab === item ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`} href={`/app/${workspaceSlug}/projects/${projectId}/${item}`} key={item}>{item}</Link>
          ))}
        </nav>
      </div>
      {tab === "overview" ? <ProjectOverview project={project} workspaceSlug={workspaceSlug} /> : null}
      {tab === "activity" ? <ProjectActivity project={project} workspaceSlug={workspaceSlug} /> : null}
      {tab === "issues" ? <ProjectIssuesView project={project} workspaceSlug={workspaceSlug} /> : null}
    </>
  );
}

function ProjectOverview({ project, workspaceSlug }: { project: ProjectDetailRecord; workspaceSlug: string }) {
  const membersQuery = useMembersQuery(workspaceSlug);
  const update = useUpdateProjectMutation(workspaceSlug, project.id);
  const addResource = useAddProjectResourceMutation(workspaceSlug, project.id);
  const addMilestone = useAddProjectMilestoneMutation(workspaceSlug, project.id);
  const patch = (
    request: Record<string, unknown>,
    optimistic: Partial<ProjectDetailRecord> & Partial<ProjectRecord>,
  ) => update.mutate({ request, optimistic });
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-7">
      <section>
        <Input className="h-auto border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0" defaultValue={project.summary ?? ""} placeholder="Add a short project summary" onBlur={(event) => {
          const summary = event.target.value.trim() || null;
          if (summary !== project.summary) patch({ summary }, { summary });
        }} />
        <div className="mt-3 flex flex-wrap items-center gap-1 border-y py-2">
          <OptionProperty icon={CircleDashed} label="Status" options={projectStateOptions} placeholder="Planned" value={project.state} onChange={(value) => value && patch({ state: value }, { state: value as ProjectDetailRecord["state"] })} />
          <OptionProperty icon={Signal} label="Priority" options={projectPriorityOptions} placeholder="No priority" value={project.priority} onChange={(value) => value && patch({ priority: value }, { priority: value as ProjectDetailRecord["priority"] })} />
          <MemberProperty label="Lead" members={membersQuery.data ?? []} value={project.lead} onChange={(lead) => patch({ leadMembershipId: lead?.membershipId ?? null }, { lead })} />
          <AssigneeProperty members={membersQuery.data ?? []} value={project.assignees} onChange={(assignees) => patch({ assigneeMembershipIds: assignees.map((item) => item.membershipId) }, { assignees })} />
          <OptionProperty icon={Eye} label="Visibility" options={visibilityOptions} placeholder="Internal" value={project.visibility} onChange={(value) => value && patch({ visibility: value }, { visibility: value as ProjectDetailRecord["visibility"] })} />
          <DateProperty label="Start date" value={project.startDate} onChange={(startDate) => patch({ startDate }, { startDate })} />
          <DateProperty label="Target date" value={project.targetDate} onChange={(targetDate) => patch({ targetDate }, { targetDate })} />
        </div>
      </section>

      <section className="mt-8 grid gap-3"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Progress</h2><span className="text-sm tabular-nums text-muted-foreground">{project.progress.percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground" style={{ width: `${project.progress.percentage}%` }} /></div><p className="text-xs text-muted-foreground">{project.progress.completed} of {project.progress.total} issues completed</p></section>

      <section className="mt-8"><h2 className="text-sm font-medium">Latest update</h2>{project.latestUpdate ? <div className="mt-3 border-l-2 pl-4"><p className="text-sm leading-6">{project.latestUpdate.body}</p><p className="mt-2 text-xs text-muted-foreground">{project.latestUpdate.authorName ?? project.latestUpdate.authorEmail} · {new Date(project.latestUpdate.createdAt).toLocaleDateString()}</p></div> : <EmptyLine icon={MessageSquareText} text="No project updates yet." />}</section>

      <section className="mt-8"><h2 className="text-sm font-medium">Description</h2><Textarea className="mt-3 min-h-32 resize-y border-0 bg-transparent p-0 leading-6 shadow-none focus-visible:ring-0" defaultValue={project.description ?? ""} placeholder="Add project context, goals, and constraints..." onBlur={(event) => {
        const description = event.target.value.trim() || null;
        if (description !== project.description) patch({ description }, { description });
      }} /></section>

      <ProjectBranchSection projectId={project.id} workspaceSlug={workspaceSlug} />

      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Resources</h2><ResourceCreator pending={addResource.isPending} onCreate={(input) => addResource.mutate(input)} /></div>{project.resources.length ? <div className="mt-2 divide-y">{project.resources.map((resource) => <a className="flex items-center gap-2 py-2 text-sm hover:underline" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><Link2 className="size-4 text-muted-foreground" />{resource.title}</a>)}</div> : <EmptyLine icon={Link2} text="No resources linked." />}</section>

      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Milestones</h2><MilestoneCreator pending={addMilestone.isPending} onCreate={(input) => addMilestone.mutate(input)} /></div>{project.milestones.length ? <div className="mt-2 divide-y">{project.milestones.map((milestone) => <div className="flex items-center gap-3 py-2 text-sm" key={milestone.id}><CheckCircle2 className="size-4 text-muted-foreground" /><span className="flex-1">{milestone.name}</span>{milestone.targetDate ? <span className="text-xs text-muted-foreground">{new Date(milestone.targetDate).toLocaleDateString()}</span> : null}</div>)}</div> : <EmptyLine icon={CalendarDays} text="No milestones defined." />}</section>
      {update.error ? <p className="mt-4 text-xs text-destructive">{update.error.message}</p> : null}
    </div>
  );
}

function ProjectActivity({ project, workspaceSlug }: { project: ProjectDetailRecord; workspaceSlug: string }) {
  const activityQuery = useProjectActivityQuery(workspaceSlug, project.id);
  const publish = usePublishProjectUpdateMutation(workspaceSlug, project.id);
  const [body, setBody] = useState("");
  const [health, setHealth] = useState<string | null>(project.latestUpdate?.health ?? "on_track");
  const [progress, setProgress] = useState(project.progress.percentage.toString());
  const submit = (event: FormEvent) => { event.preventDefault(); if (!body.trim()) return; publish.mutate({ body: body.trim(), health, progress: Number(progress) }, { onSuccess: () => setBody("") }); };
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-7">
      <form className="border-b pb-6" onSubmit={submit}>
        <Textarea maxLength={20_000} placeholder="Write a project update..." rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="mt-2 flex flex-wrap items-center gap-2"><OptionProperty icon={CircleDashed} label="Health" options={healthOptions} placeholder="Health" value={health} onChange={setHealth} /><Input className="h-8 w-20" max={100} min={0} type="number" value={progress} onChange={(event) => setProgress(event.target.value)} /><Button className="ml-auto" disabled={publish.isPending || !body.trim()} size="sm" type="submit">{publish.isPending ? <LoaderCircle className="animate-spin" /> : null}Publish update</Button></div>
      </form>
      <div className="mt-6 grid gap-6">
        {(activityQuery.data?.updates ?? []).map((item) => <article className="border-l-2 pl-4" key={item.id}><div className="flex items-center gap-2"><Avatar className="size-6"><AvatarFallback>{(item.authorName ?? item.authorEmail).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><strong className="text-sm">{item.authorName ?? item.authorEmail}</strong><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.body}</p>{item.health ? <Badge className="mt-3" variant="outline">{item.health.replace("_", " ")}</Badge> : null}</article>)}
        {(activityQuery.data?.events ?? []).map((event) => <div className="flex gap-3 text-xs text-muted-foreground" key={event.id}><CircleDashed className="size-4" /><span><strong className="text-foreground">{event.actorName ?? event.actorEmail ?? "System"}</strong> {event.eventType.replaceAll(".", " ")} · {new Date(event.createdAt).toLocaleString()}</span></div>)}
        {!activityQuery.isLoading && !activityQuery.data?.updates.length && !activityQuery.data?.events.length ? <EmptyLine icon={MessageSquareText} text="No activity yet." /> : null}
      </div>
    </div>
  );
}

function EmptyLine({ icon: Icon, text }: { icon: typeof Link2; text: string }) {
  return <div className="mt-3 flex min-h-12 items-center gap-2 border-y py-3 text-sm text-muted-foreground"><Icon className="size-4" />{text}</div>;
}

function ResourceCreator({ pending, onCreate }: { pending: boolean; onCreate: (input: { title: string; url: string; description: string | null }) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  return <Popover><PopoverTrigger asChild><Button aria-label="Add resource" size="icon-sm" variant="ghost"><Plus /></Button></PopoverTrigger><PopoverContent align="end" className="grid w-80 gap-2 p-3"><strong className="text-sm">Add resource</strong><Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} /><Input placeholder="https://..." type="url" value={url} onChange={(event) => setUrl(event.target.value)} /><Button disabled={pending || !title.trim() || !url.trim()} size="sm" onClick={() => onCreate({ title: title.trim(), url: url.trim(), description: null })}>Add resource</Button></PopoverContent></Popover>;
}

function MilestoneCreator({ pending, onCreate }: { pending: boolean; onCreate: (input: { name: string; targetDate: string | null }) => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  return <Popover><PopoverTrigger asChild><Button aria-label="Add milestone" size="icon-sm" variant="ghost"><Plus /></Button></PopoverTrigger><PopoverContent align="end" className="grid w-80 gap-2 p-3"><strong className="text-sm">Add milestone</strong><Input placeholder="Milestone name" value={name} onChange={(event) => setName(event.target.value)} /><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Button disabled={pending || !name.trim()} size="sm" onClick={() => onCreate({ name: name.trim(), targetDate: date ? new Date(`${date}T12:00:00Z`).toISOString() : null })}>Add milestone</Button></PopoverContent></Popover>;
}
