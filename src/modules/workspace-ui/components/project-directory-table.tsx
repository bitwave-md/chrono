"use client";

import { Activity, ChevronRight, Circle, CircleDashed, CircleDot, Gauge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type MouseEvent, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useUpdateProjectMutation } from "@/modules/workspace-ui/application/use-project-detail-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { ClientIcon } from "@/modules/workspace-ui/components/client-icon";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { groupHeaderGradient } from "@/modules/workspace-ui/components/group-header-gradient";
import { MemberProperty } from "@/modules/workspace-ui/components/member-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { projectPriorityOptions, projectStateOptions } from "@/modules/workspace-ui/components/project-property-options";
import { ProjectIcon } from "@/modules/workspace-ui/components/project-icon";
import { buildProjectListGroups, type ProjectListGroup } from "@/modules/workspace-ui/domain/project-list-groups";
import type { MemberRecord, ProjectDetailRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

const healthMetadata = {
  on_track: { label: "On track", className: "text-emerald-500" },
  at_risk: { label: "At risk", className: "text-amber-500" },
  off_track: { label: "Off track", className: "text-destructive" },
};

export function ProjectDirectoryTable({
  projects,
  workspaceSlug,
  showClient,
}: {
  projects: ProjectRecord[];
  workspaceSlug: string;
  showClient: boolean;
}) {
  const membersQuery = useMembersQuery(workspaceSlug);
  const groups = buildProjectListGroups(projects);

  return (
    <div className="pb-4" role="list">
      {groups.map((group) => (
        <ProjectGroup
          group={group}
          key={group.state}
          members={membersQuery.data ?? []}
          showClient={showClient}
          workspaceSlug={workspaceSlug}
        />
      ))}
    </div>
  );
}

function ProjectGroup({
  group,
  members,
  showClient,
  workspaceSlug,
}: {
  group: ProjectListGroup<ProjectRecord>;
  members: MemberRecord[];
  showClient: boolean;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(true);
  const stateOption = projectStateOptions.find((option) => option.value === group.state);
  const StateIcon = stateOption?.icon ?? CircleDashed;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="group/project-header mx-2 mt-0.5 flex h-10 w-[calc(100%-1rem)] items-center rounded-md bg-muted/40 transition-colors hover:bg-muted/70"
        style={groupHeaderGradient(group.color)}
      >
        <CollapsibleTrigger asChild>
          <button className="flex h-full min-w-0 flex-1 items-center gap-2 px-4 text-left text-xs font-medium" type="button">
            <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
            <StateIcon className="size-4" style={{ color: group.color }} />
            <span>{group.label}</span>
            <span className="text-muted-foreground">{group.projects.length}</span>
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-2">
        {group.projects.map((project) => (
          <ProjectRow
            key={project.id}
            members={members}
            project={project}
            showClient={showClient}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ProjectRow({
  project,
  workspaceSlug,
  showClient,
  members,
}: {
  project: ProjectRecord;
  workspaceSlug: string;
  showClient: boolean;
  members: MemberRecord[];
}) {
  const router = useRouter();
  const update = useUpdateProjectMutation(workspaceSlug, project.id);
  const href = `/app/${workspaceSlug}/projects/${project.id}/overview`;
  const patch = (
    request: Record<string, unknown>,
    optimistic: Partial<ProjectDetailRecord> & Partial<ProjectRecord>,
  ) => update.mutate({ request, optimistic });
  const openWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(href);
    }
  };

  return (
    <div
      className="group/project relative mt-0.5 flex min-h-12 cursor-pointer items-center gap-2 rounded-md px-4 text-sm hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 max-md:px-3"
      role="listitem"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={openWithKeyboard}
    >
      <span className="flex min-w-40 flex-1 items-center gap-2.5 font-medium">
        <ProjectIcon className="size-6" iconClassName={project.iconType === "emoji" ? "text-xs" : "size-3.5"} project={project} />
        <span className="truncate">{project.name}</span>
      </span>
      <span className="flex min-w-0 shrink items-center justify-end gap-1 max-md:gap-0.5">
        {showClient ? <ClientChip project={project} workspaceSlug={workspaceSlug} /> : null}
        <span className="max-xl:hidden"><ProjectHealth project={project} /></span>
        <PropertyCell className="max-lg:hidden">
          <OptionProperty
            disabled={update.isPending}
            icon={Circle}
            label="Priority"
            options={projectPriorityOptions}
            placeholder="No priority"
            value={project.priority}
            onChange={(priority) => priority && patch({ priority }, { priority: priority as ProjectRecord["priority"] })}
          />
        </PropertyCell>
        <PropertyCell className="max-xl:hidden">
          <MemberProperty
            disabled={update.isPending}
            label="Lead"
            members={members}
            value={project.lead}
            onChange={(lead) => patch({ leadMembershipId: lead?.membershipId ?? null }, { lead })}
          />
        </PropertyCell>
        <PropertyCell className="max-xl:hidden">
          <DateProperty label="Target date" value={project.targetDate} onChange={(targetDate) => patch({ targetDate }, { targetDate })} />
        </PropertyCell>
        <ProjectIssuesChip project={project} workspaceSlug={workspaceSlug} />
        <PropertyCell>
          <OptionProperty
            disabled={update.isPending}
            icon={CircleDashed}
            label="Status"
            options={projectStateOptions}
            placeholder="Planned"
            value={project.state}
            onChange={(state) => state && patch({ state }, { state: state as ProjectRecord["state"] })}
          />
        </PropertyCell>
      </span>
    </div>
  );
}

function ClientChip({ project, workspaceSlug }: { project: ProjectRecord; workspaceSlug: string }) {
  return (
    <Link
      className="flex h-7 max-w-44 items-center gap-1.5 rounded-full border border-border/70 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-lg:hidden"
      href={`/app/${workspaceSlug}/clients/${project.clientId}/projects`}
      title={`Open ${project.clientName} Projects`}
      onClick={stopLinkClick}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <ClientIcon className="size-4 shrink-0 rounded" client={{ name: project.clientName, iconType: project.clientIconType, iconKey: project.clientIconKey, iconColor: project.clientIconColor }} iconClassName={project.clientIconType === "emoji" ? "text-[0.55rem]" : "size-2.5"} />
      <span className="truncate">{project.clientName}</span>
    </Link>
  );
}

function ProjectIssuesChip({ project, workspaceSlug }: { project: ProjectRecord; workspaceSlug: string }) {
  return (
    <Link
      className="flex h-7 items-center gap-1.5 rounded-full border border-border/70 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-sm:hidden"
      href={`/app/${workspaceSlug}/projects/${project.id}/issues`}
      title={`Open ${project.name} Issues`}
      onClick={stopLinkClick}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <CircleDot className="size-3.5" />
      <span className="tabular-nums">{project.issueCount}</span>
      {project.issueCount ? <span className="text-muted-foreground/60">· {project.progressPercentage}%</span> : null}
    </Link>
  );
}

function PropertyCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("min-w-0", className)} onClick={(event) => event.stopPropagation()}>{children}</span>;
}

function ProjectHealth({ project }: { project: ProjectRecord }) {
  if (!project.health) return <span className="flex h-7 items-center gap-1.5 px-2 text-xs text-muted-foreground"><Activity className="size-3.5" />No health</span>;
  const metadata = healthMetadata[project.health];
  return (
    <span className={cn("flex h-7 items-center gap-1.5 px-2 text-xs", metadata.className)}>
      <Gauge className="size-3.5" />
      <span>{metadata.label}</span>
      {project.healthUpdatedAt ? <span className="opacity-70">· {relativeAge(project.healthUpdatedAt)}</span> : null}
    </span>
  );
}

function relativeAge(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function stopLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}
