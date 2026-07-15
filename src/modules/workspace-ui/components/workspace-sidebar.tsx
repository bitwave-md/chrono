"use client";

import {
  Building2,
  CircleDot,
  Inbox,
  LogOut,
  PanelLeftOpen,
  Users,
  Waves,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectTree } from "@/modules/workspace-ui/components/project-tree";
import { WorkspaceSelect } from "@/modules/workspace-ui/components/workspace-select";
import type {
  ClientRecord,
  ProjectNode,
  TeamRecord,
  WorkspaceIdentity,
} from "@/modules/workspace-ui/domain/workspace-types";

interface WorkspaceSidebarProps {
  workspace: WorkspaceIdentity;
  clients: ClientRecord[];
  projects: ProjectNode[];
  teams: TeamRecord[];
  activeClientId: string | null;
  selectedProjectId: string | null;
  selectedTeamId: string | null;
  collapsed: boolean;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string | null) => void;
  onTeamChange: (teamId: string | null) => void;
  onToggle: () => void;
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  if (props.collapsed) {
    return (
      <aside className="workspace-sidebar workspace-sidebar-collapsed">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="Expand navigation" className="icon-button sidebar-logo-button" size="icon-sm" variant="ghost" onClick={props.onToggle}>
              <Waves size={19} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand navigation</TooltipContent>
        </Tooltip>
        <div className="collapsed-rail">
          <Building2 size={17} />
          <Inbox size={17} />
          <Users size={17} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="Expand navigation" className="icon-button sidebar-expand-button" size="icon-sm" variant="ghost" onClick={props.onToggle}>
              <PanelLeftOpen size={17} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand navigation</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-switcher">
        <span className="workspace-mark">
          <Waves size={17} />
        </span>
        <div>
          <strong>{props.workspace.name}</strong>
          <span>{props.workspace.role}</span>
        </div>
        <Button
          aria-label="Collapse navigation"
          className="icon-button"
          size="icon-sm"
          variant="ghost"
          onClick={props.onToggle}
        >
          <PanelLeftOpen className="collapse-icon" size={16} />
        </Button>
      </div>

      <ScrollArea className="sidebar-scroll">
        <div className="client-select-label">
          <span>Client</span>
          <WorkspaceSelect
            label="Client"
            options={props.clients.map((client) => ({ value: client.id, label: client.name }))}
            value={props.activeClientId}
            onValueChange={(clientId) => {
              if (clientId) props.onClientChange(clientId);
            }}
          />
        </div>

        <nav aria-label="Workspace navigation" className="sidebar-navigation">
          <Button
            className="sidebar-item"
            data-active={!props.selectedProjectId && !props.selectedTeamId}
            variant="ghost"
            onClick={() => {
              props.onProjectChange(null);
              props.onTeamChange(null);
            }}
          >
            <Inbox size={16} />
            <span>All issues</span>
          </Button>

          <div className="sidebar-section">
            <div className="sidebar-section-label">
              <span>Projects</span>
              <Badge variant="ghost">{props.projects.length}</Badge>
            </div>
            {props.projects.length ? (
              <ProjectTree
                projects={props.projects}
                selectedProjectId={props.selectedProjectId}
                onSelect={(projectId) => {
                  props.onTeamChange(null);
                  props.onProjectChange(projectId);
                }}
              />
            ) : (
              <p className="sidebar-empty">No projects yet</p>
            )}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">
              <span>Teams</span>
              <Badge variant="ghost">{props.teams.length}</Badge>
            </div>
            {props.teams.map((team) => (
              <Button
                className="sidebar-item"
                data-active={props.selectedTeamId === team.id}
                key={team.id}
                variant="ghost"
                onClick={() => {
                  props.onProjectChange(null);
                  props.onTeamChange(team.id);
                }}
              >
                <CircleDot size={15} />
                <span>{team.name}</span>
                <span className="sidebar-key">{team.key}</span>
              </Button>
            ))}
          </div>
        </nav>
      </ScrollArea>

      <Separator />
      <Button asChild className="sidebar-account" variant="ghost">
        <Link href="/api/auth/signout">
          <Avatar className="account-avatar">
            <AvatarFallback>{props.workspace.userEmail.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span>
            <strong>{props.workspace.userEmail}</strong>
            <small>Sign out</small>
          </span>
          <LogOut size={15} />
        </Link>
      </Button>
    </aside>
  );
}
