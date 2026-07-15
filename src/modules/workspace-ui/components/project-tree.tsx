"use client";

import { ChevronRight, FolderKanban, Goal, Milestone } from "lucide-react";

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
        <button
          className="sidebar-item project-tree-item"
          data-active={selectedProjectId === project.id}
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
            <span className="sidebar-badge">Sprint</span>
          ) : null}
        </button>
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
