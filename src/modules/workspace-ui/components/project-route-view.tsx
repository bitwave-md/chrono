"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDashed,
  Eye,
  Link2,
  MessageSquareText,
  Plus,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAddProjectMilestoneMutation, useAddProjectResourceMutation, useProjectQuery, useUpdateProjectMutation } from "@/modules/workspace-ui/application/use-project-detail-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { AssigneeProperty } from "@/modules/workspace-ui/components/assignee-property";
import { EntityIconPicker } from "@/modules/workspace-ui/components/client-icon-picker";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { ClientTimeReportView } from "@/modules/workspace-ui/components/client-time-report-view";
import { EntityHeader } from "@/modules/workspace-ui/components/entity-header";
import { MemberProperty } from "@/modules/workspace-ui/components/member-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { ProjectBranchSection } from "@/modules/workspace-ui/components/project-branch-section";
import { ProjectActivity } from "@/modules/workspace-ui/components/project-activity";
import { ProjectIcon } from "@/modules/workspace-ui/components/project-icon";
import { ProjectIssuesView } from "@/modules/workspace-ui/components/project-issues-view";
import { ProjectMembersView } from "@/modules/workspace-ui/components/project-members-view";
import { projectPriorityOptions, projectStateOptions } from "@/modules/workspace-ui/components/project-property-options";
import { ProjectTabs, type ProjectTab } from "@/modules/workspace-ui/components/project-tabs";
import { AttachmentSection } from "@/modules/workspace-ui/components/attachment-section";
import { favoriteFromProject } from "@/modules/workspace-ui/domain/favorite-target";
import type { ProjectDetailRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

const visibilityOptions = [
  { value: "internal", label: "Internal", color: "#94a3b8" },
  { value: "client_shared", label: "Client shared", color: "#22c55e" },
  { value: "restricted", label: "Restricted", color: "#f59e0b" },
];

export function ProjectRouteView({ workspaceSlug, projectId, tab }: { workspaceSlug: string; projectId: string; tab: ProjectTab }) {
  const workspace = useWorkspaceIdentity();
  const projectQuery = useProjectQuery(workspaceSlug, projectId);
  const project = projectQuery.data;
  if (projectQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading project...</div>;
  if (!project) return <div className="p-6 text-sm text-destructive">{projectQuery.error?.message ?? "Project not found."}</div>;

  return (
    <>
      <EntityHeader
        allowDelete={workspace.role === "owner" || workspace.role === "admin"}
        breadcrumbs={[
          {
            label: project.clientName,
            href: `/app/${workspaceSlug}/clients/${project.clientId}/overview`,
            icon: <ClientIcon className="size-6" client={{ name: project.clientName, iconType: project.clientIconType, iconKey: project.clientIconKey, iconColor: project.clientIconColor }} iconClassName={project.clientIconType === "emoji" ? "text-xs" : "size-3.5"} />,
          },
          { label: "Projects", href: `/app/${workspaceSlug}/clients/${project.clientId}/projects` },
        ]}
        favoriteTarget={favoriteFromProject(project)}
        icon={<ProjectIcon className="size-6" iconClassName="size-3.5" project={project} />}
        title={project.name}
        workspaceSlug={workspaceSlug}
      />
      {tab !== "issues" ? <ProjectTabs projectId={projectId} tab={tab} workspaceSlug={workspaceSlug} /> : null}
      {tab === "overview" ? <ProjectOverview project={project} workspaceSlug={workspaceSlug} /> : null}
      {tab === "activity" ? <ProjectActivity project={project} workspaceSlug={workspaceSlug} /> : null}
      {tab === "issues" ? <ProjectIssuesView project={project} workspaceSlug={workspaceSlug} /> : null}
      {tab === "time" ? <ClientTimeReportView client={{ id: project.clientId, name: project.clientName }} projectScope={{ id: project.id, name: project.name }} workspaceSlug={workspaceSlug} /> : null}
      {tab === "members" ? <ProjectMembersView project={project} workspaceSlug={workspaceSlug} /> : null}
    </>
  );
}

function ProjectOverview({ project, workspaceSlug }: { project: ProjectDetailRecord; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const canManage = workspace.role !== "guest";
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
        <div className="flex items-start gap-3">
          <EntityIconPicker
            disabled={!canManage}
            entity={project}
            label="Project"
            onChange={(appearance) => patch(appearance, appearance)}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{project.name}</h1>
            <Input className="mt-0.5 h-7 border-0 px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0" defaultValue={project.summary ?? ""} placeholder="Add a short project summary" readOnly={!canManage} onBlur={(event) => {
              const summary = event.target.value.trim() || null;
              if (canManage && summary !== project.summary) patch({ summary }, { summary });
            }} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-1 border-y py-2">
          <OptionProperty disabled={!canManage} icon={CircleDashed} label="Status" options={projectStateOptions} placeholder="Planned" value={project.state} onChange={(value) => value && patch({ state: value }, { state: value as ProjectDetailRecord["state"] })} />
          <OptionProperty disabled={!canManage} icon={Circle} label="Priority" options={projectPriorityOptions} placeholder="No priority" value={project.priority} onChange={(value) => value && patch({ priority: value }, { priority: value as ProjectDetailRecord["priority"] })} />
          <MemberProperty disabled={!canManage} label="Lead" members={membersQuery.data ?? []} value={project.lead} onChange={(lead) => patch({ leadMembershipId: lead?.membershipId ?? null }, { lead })} />
          <AssigneeProperty disabled={!canManage} members={membersQuery.data ?? []} value={project.assignees} onChange={(assignees) => patch({ assigneeMembershipIds: assignees.map((item) => item.membershipId) }, { assignees })} />
          <OptionProperty disabled={!canManage} icon={Eye} label="Visibility" options={visibilityOptions} placeholder="Internal" value={project.visibility} onChange={(value) => value && patch({ visibility: value }, { visibility: value as ProjectDetailRecord["visibility"] })} />
          <DateProperty disabled={!canManage} label="Start date" value={project.startDate} onChange={(startDate) => patch({ startDate }, { startDate })} />
          <DateProperty disabled={!canManage} label="Target date" value={project.targetDate} onChange={(targetDate) => patch({ targetDate }, { targetDate })} />
        </div>
      </section>

      <section className="mt-8 grid gap-3"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Progress</h2><span className="text-sm tabular-nums text-muted-foreground">{project.progress.percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground" style={{ width: `${project.progress.percentage}%` }} /></div><p className="text-xs text-muted-foreground">{project.progress.completed} of {project.progress.total} issues completed</p></section>

      <section className="mt-8"><h2 className="text-sm font-medium">Latest update</h2>{project.latestUpdate ? <div className="mt-3 border-l-2 pl-4"><p className="text-sm leading-6">{project.latestUpdate.body}</p><p className="mt-2 text-xs text-muted-foreground">{project.latestUpdate.authorName ?? project.latestUpdate.authorEmail} · {new Date(project.latestUpdate.createdAt).toLocaleDateString()}</p></div> : <EmptyLine icon={MessageSquareText} text="No project updates yet." />}</section>

      <section className="mt-8"><h2 className="text-sm font-medium">Description</h2><Textarea className="mt-3 min-h-32 resize-y border-0 bg-transparent p-0 leading-6 shadow-none focus-visible:ring-0" defaultValue={project.description ?? ""} placeholder="Add project context, goals, and constraints..." readOnly={!canManage} onBlur={(event) => {
        const description = event.target.value.trim() || null;
        if (canManage && description !== project.description) patch({ description }, { description });
      }} /></section>

      <ProjectBranchSection canManage={canManage} projectId={project.id} workspaceSlug={workspaceSlug} />

      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Resources</h2>{canManage ? <ResourceCreator pending={addResource.isPending} onCreate={(input) => addResource.mutate(input)} /> : null}</div>{project.resources.length ? <div className="mt-2 divide-y">{project.resources.map((resource) => <a className="flex items-center gap-2 py-2 text-sm hover:underline" href={resource.url} key={resource.id} rel="noreferrer" target="_blank"><Link2 className="size-4 text-muted-foreground" />{resource.title}</a>)}</div> : <EmptyLine icon={Link2} text="No resources linked." />}</section>

      <AttachmentSection canUpload targetId={project.id} targetType="project" workspaceSlug={workspaceSlug} />

      <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Milestones</h2>{canManage ? <MilestoneCreator pending={addMilestone.isPending} onCreate={(input) => addMilestone.mutate(input)} /> : null}</div>{project.milestones.length ? <div className="mt-2 divide-y">{project.milestones.map((milestone) => <div className="flex items-center gap-3 py-2 text-sm" key={milestone.id}><CheckCircle2 className="size-4 text-muted-foreground" /><span className="flex-1">{milestone.name}</span>{milestone.targetDate ? <span className="text-xs text-muted-foreground">{new Date(milestone.targetDate).toLocaleDateString()}</span> : null}</div>)}</div> : <EmptyLine icon={CalendarDays} text="No milestones defined." />}</section>
      {update.error ? <p className="mt-4 text-xs text-destructive">{update.error.message}</p> : null}
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
