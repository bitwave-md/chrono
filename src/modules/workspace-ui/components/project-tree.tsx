"use client";

import { ChevronRight, FolderKanban, Goal, Milestone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectNode } from "@/modules/workspace-ui/domain/workspace-types";

interface ProjectTreeProps {
  projects: ProjectNode[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  depth?: number;
}

const projectIcons = {
  project: FolderKanban,
  subproject: Milestone,
  sprint: Goal,
};

const depthPadding = ["pl-2.5", "pl-6", "pl-9", "pl-12"];

export function ProjectTree({
  projects,
  selectedProjectId,
  onSelect,
  depth = 0,
}: ProjectTreeProps) {
  return projects.map((project) => {
    const Icon = projectIcons[project.kind];

    return (
      <div key={project.id}>
        <Button
          className={cn(
            "h-8 w-full justify-start gap-1.5 overflow-hidden pr-2.5 text-xs font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            depthPadding[Math.min(depth, depthPadding.length - 1)],
            selectedProjectId === project.id && "rounded-l-none border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground",
          )}
          variant="ghost"
          type="button"
          onClick={() => onSelect(project.id)}
        >
          {project.children.length > 0 ? (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <span className="size-3 shrink-0" />
          )}
          <Icon size={15} />
          <span className="min-w-0 flex-1 truncate text-left">{project.name}</span>
          {project.kind === "sprint" ? (
            <Badge className="px-1 py-0 font-mono text-[0.6rem] text-muted-foreground" variant="outline">Sprint</Badge>
          ) : null}
        </Button>
        {project.children.length > 0 ? (
          <ProjectTree
            depth={depth + 1}
            projects={project.children}
            selectedProjectId={selectedProjectId}
            onSelect={onSelect}
          />
        ) : null}
      </div>
    );
  });
}
