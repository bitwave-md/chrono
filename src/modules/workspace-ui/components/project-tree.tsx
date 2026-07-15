"use client";

import { ChevronRight, FolderKanban, Goal, Milestone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { ProjectNode } from "@/modules/workspace-ui/domain/workspace-types";

interface ProjectTreeProps {
  projects: ProjectNode[];
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
  nested?: boolean;
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
  nested = false,
}: ProjectTreeProps) {
  return projects.map((project) => {
    const Icon = projectIcons[project.kind];
    const hasChildren = project.children.length > 0;

    if (nested) {
      return (
        <Collapsible asChild defaultOpen key={project.id}>
          <SidebarMenuSubItem className="relative">
            <SidebarMenuSubButton
              className={hasChildren ? "pr-7" : undefined}
              isActive={selectedProjectId === project.id}
              onClick={() => onSelect(project.id)}
            >
              <Icon />
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
              {project.kind === "sprint" ? (
                <Badge className="ml-auto px-1 py-0 text-[0.6rem]" variant="outline">
                  Sprint
                </Badge>
              ) : null}
            </SidebarMenuSubButton>
            {hasChildren ? (
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction className="top-1 data-[state=open]:rotate-90">
                    <ChevronRight />
                    <span className="sr-only">Toggle {project.name}</span>
                  </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <ProjectTree
                      nested
                      projects={project.children}
                      selectedProjectId={selectedProjectId}
                      onSelect={onSelect}
                    />
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            ) : null}
          </SidebarMenuSubItem>
        </Collapsible>
      );
    }

    return (
      <Collapsible asChild defaultOpen key={project.id}>
        <SidebarMenuItem>
          <SidebarMenuButton
            className={hasChildren ? "pr-7" : undefined}
            isActive={selectedProjectId === project.id}
            tooltip={project.name}
            onClick={() => onSelect(project.id)}
          >
            <Icon />
            <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">{project.name}</span>
            {project.kind === "sprint" ? (
              <Badge className="ml-auto px-1 py-0 text-[0.6rem] group-data-[collapsible=icon]:hidden" variant="outline">
                Sprint
              </Badge>
            ) : null}
          </SidebarMenuButton>
          {hasChildren ? (
            <>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="data-[state=open]:rotate-90">
                  <ChevronRight />
                  <span className="sr-only">Toggle {project.name}</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <ProjectTree
                    nested
                    projects={project.children}
                    selectedProjectId={selectedProjectId}
                    onSelect={onSelect}
                  />
                </SidebarMenuSub>
              </CollapsibleContent>
            </>
          ) : null}
        </SidebarMenuItem>
      </Collapsible>
    );
  });
}
