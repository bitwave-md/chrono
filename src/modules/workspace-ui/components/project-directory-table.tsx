"use client";

import {
  Activity,
  CircleDashed,
  FolderKanban,
  Gauge,
  Signal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";

import { useUpdateProjectMutation } from "@/modules/workspace-ui/application/use-project-detail-queries";
import { useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { DateProperty } from "@/modules/workspace-ui/components/date-property";
import { MemberProperty } from "@/modules/workspace-ui/components/member-property";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import { projectPriorityOptions, projectStateOptions } from "@/modules/workspace-ui/components/project-property-options";
import type {
  MemberRecord,
  ProjectDetailRecord,
  ProjectRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

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
  const gridTemplateColumns = showClient
    ? "minmax(250px, 1fr) 140px 140px 150px 180px 170px 70px 190px"
    : "minmax(270px, 1fr) 140px 150px 180px 170px 70px 190px";
  const gridStyle = { gridTemplateColumns };

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[1050px] items-center gap-2 px-5 py-3 text-xs text-muted-foreground" style={gridStyle}>
        <span>Name</span>
        {showClient ? <span>Client</span> : null}
        <span>Health</span><span>Priority</span><span>Lead</span>
        <span>Target date</span><span>Issues</span><span>Status</span>
      </div>
      <div>
        {projects.map((project) => (
          <ProjectDirectoryRow
            gridStyle={gridStyle}
            key={project.id}
            members={membersQuery.data ?? []}
            project={project}
            showClient={showClient}
            workspaceSlug={workspaceSlug}
          />
        ))}
        {!projects.length ? (
          <div className="flex min-h-24 items-center gap-2 border-t px-5 text-sm text-muted-foreground">
            <FolderKanban className="size-4" />No Projects found.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectDirectoryRow({
  project,
  workspaceSlug,
  showClient,
  members,
  gridStyle,
}: {
  project: ProjectRecord;
  workspaceSlug: string;
  showClient: boolean;
  members: MemberRecord[];
  gridStyle: { gridTemplateColumns: string };
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
      className="grid min-h-14 min-w-[1050px] cursor-pointer items-center gap-2 border-t px-5 text-sm hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
      role="link"
      style={gridStyle}
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={openWithKeyboard}
    >
      <span className="flex min-w-0 items-center gap-3 font-medium">
        <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{project.name}</span>
      </span>
      {showClient ? <span className="truncate text-muted-foreground">{project.clientName}</span> : null}
      <ProjectHealth project={project} />
      <PropertyCell>
        <OptionProperty
          disabled={update.isPending}
          icon={Signal}
          label="Priority"
          options={projectPriorityOptions}
          placeholder="No priority"
          value={project.priority}
          onChange={(priority) => priority && patch(
            { priority },
            { priority: priority as ProjectRecord["priority"] },
          )}
        />
      </PropertyCell>
      <PropertyCell>
        <MemberProperty
          disabled={update.isPending}
          label="Lead"
          members={members}
          value={project.lead}
          onChange={(lead) => patch(
            { leadMembershipId: lead?.membershipId ?? null },
            { lead },
          )}
        />
      </PropertyCell>
      <PropertyCell>
        <DateProperty
          label="Target date"
          value={project.targetDate}
          onChange={(targetDate) => patch({ targetDate }, { targetDate })}
        />
      </PropertyCell>
      <span className="tabular-nums text-muted-foreground">{project.issueCount}</span>
      <PropertyCell>
        <div className="flex min-w-0 items-center gap-1">
          <OptionProperty
            disabled={update.isPending}
            icon={CircleDashed}
            label="Status"
            options={projectStateOptions}
            placeholder="Planned"
            value={project.state}
            onChange={(state) => state && patch(
              { state },
              { state: state as ProjectRecord["state"] },
            )}
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {project.progressPercentage}%
          </span>
        </div>
      </PropertyCell>
    </div>
  );
}

function PropertyCell({ children }: { children: React.ReactNode }) {
  return <span className="min-w-0" onClick={stopRowClick}>{children}</span>;
}

function ProjectHealth({ project }: { project: ProjectRecord }) {
  if (!project.health) {
    return <span className="flex items-center gap-2 text-muted-foreground"><Activity className="size-4" />No health</span>;
  }
  const metadata = healthMetadata[project.health];
  return (
    <span className={`flex items-center gap-2 ${metadata.className}`}>
      <Gauge className="size-4" />
      <span>{metadata.label}</span>
      {project.healthUpdatedAt ? <span className="text-xs opacity-80">· {relativeAge(project.healthUpdatedAt)}</span> : null}
    </span>
  );
}

function relativeAge(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function stopRowClick(event: MouseEvent<HTMLSpanElement>) {
  event.stopPropagation();
}
