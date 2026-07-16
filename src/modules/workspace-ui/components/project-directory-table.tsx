"use client";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  Gauge,
  SignalHigh,
  SignalLow,
  SignalMedium,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  ProjectPriority,
  ProjectRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

const priorityMetadata: Record<
  ProjectPriority,
  { label: string; Icon: typeof SignalHigh; className: string }
> = {
  none: { label: "No priority", Icon: SignalLow, className: "text-muted-foreground" },
  urgent: { label: "Urgent", Icon: SignalHigh, className: "text-destructive" },
  high: { label: "High", Icon: SignalHigh, className: "text-amber-400" },
  medium: { label: "Medium", Icon: SignalMedium, className: "text-foreground/75" },
  low: { label: "Low", Icon: SignalLow, className: "text-blue-400" },
};

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
  const gridTemplateColumns = showClient
    ? "minmax(260px, 1fr) 150px 140px 120px 170px 150px 80px 100px"
    : "minmax(280px, 1fr) 140px 120px 170px 150px 80px 100px";
  const gridStyle = {
    gridTemplateColumns,
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[980px] items-center gap-3 px-5 py-3 text-xs text-muted-foreground" style={gridStyle}>
        <span>Name</span>
        {showClient ? <span>Client</span> : null}
        <span>Health</span><span>Priority</span><span>Lead</span>
        <span>Target date</span><span>Issues</span><span>Status</span>
      </div>
      <div>
        {projects.map((project) => (
          <Link
            className="grid min-h-14 min-w-[980px] items-center gap-3 border-t px-5 text-sm hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none"
            href={`/app/${workspaceSlug}/projects/${project.id}/overview`}
            key={project.id}
            style={gridStyle}
          >
            <span className="flex min-w-0 items-center gap-3 font-medium">
              <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{project.name}</span>
            </span>
            {showClient ? <span className="truncate text-muted-foreground">{project.clientName}</span> : null}
            <ProjectHealth project={project} />
            <ProjectPriorityCell priority={project.priority} />
            <ProjectLead project={project} />
            <span className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" />
              {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : "No target"}
            </span>
            <span className="tabular-nums text-muted-foreground">{project.issueCount}</span>
            <span className="flex items-center gap-2 tabular-nums">
              {project.state === "completed" ? <CheckCircle2 className="size-4 text-blue-400" /> : <CircleDashed className="size-4 text-amber-400" />}
              {project.progressPercentage}%
            </span>
          </Link>
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

function ProjectPriorityCell({ priority }: { priority: ProjectPriority }) {
  const metadata = priorityMetadata[priority];
  return <span className={`flex items-center gap-2 ${metadata.className}`} title={metadata.label}><metadata.Icon className="size-4" /><span>{metadata.label}</span></span>;
}

function ProjectLead({ project }: { project: ProjectRecord }) {
  if (!project.lead) return <span className="text-muted-foreground">No lead</span>;
  const label = project.lead.displayName ?? project.lead.email;
  return <span className="flex min-w-0 items-center gap-2"><Avatar className="size-5"><AvatarImage alt="" src={project.lead.avatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{label.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="truncate">{label}</span></span>;
}

function relativeAge(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
