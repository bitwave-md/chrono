"use client";

import { ChevronRight, FolderKanban, Goal, Milestone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          className="sidebar-item project-tree-item"
          data-active={selectedProjectId === project.id}
          variant="ghost"
          style={{ paddingLeft: 12 + depth * 14 }}
          type="button"
          onClick={() => onSelect(project.id)}
        >
          {project.children.length > 0 ? (
            <ChevronRight className="tree-chevron" size={13} />
          ) : (
            <span className="tree-spacer" />
          )}
          <Icon size={15} />
          <span>{project.name}</span>
          {project.kind === "sprint" ? (
            <Badge className="sidebar-badge" variant="outline">Sprint</Badge>
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
