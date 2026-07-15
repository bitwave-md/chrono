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

import { ProjectTree } from "@/modules/workspace-ui/components/project-tree";
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
        <button
          aria-label="Expand navigation"
          className="icon-button sidebar-logo-button"
          type="button"
          onClick={props.onToggle}
        >
          <Waves size={19} />
        </button>
        <div className="collapsed-rail">
          <Building2 size={17} />
          <Inbox size={17} />
          <Users size={17} />
        </div>
        <button
          aria-label="Expand navigation"
          className="icon-button sidebar-expand-button"
          type="button"
          onClick={props.onToggle}
        >
          <PanelLeftOpen size={17} />
        </button>
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
        <button
          aria-label="Collapse navigation"
          className="icon-button"
          type="button"
          onClick={props.onToggle}
        >
          <PanelLeftOpen className="collapse-icon" size={16} />
        </button>
      </div>

      <div className="sidebar-scroll">
        <label className="client-select-label" htmlFor="chrono-client-select">
          <span>Client</span>
          <select
            id="chrono-client-select"
            value={props.activeClientId ?? ""}
            onChange={(event) => props.onClientChange(event.target.value)}
          >
            {props.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <nav aria-label="Workspace navigation" className="sidebar-navigation">
          <button
            className="sidebar-item"
            data-active={!props.selectedProjectId && !props.selectedTeamId}
            type="button"
            onClick={() => {
              props.onProjectChange(null);
              props.onTeamChange(null);
            }}
          >
            <Inbox size={16} />
            <span>All issues</span>
          </button>

          <div className="sidebar-section">
            <div className="sidebar-section-label">
              <span>Projects</span>
              <span>{props.projects.length}</span>
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
              <span>{props.teams.length}</span>
            </div>
            {props.teams.map((team) => (
              <button
                className="sidebar-item"
                data-active={props.selectedTeamId === team.id}
                key={team.id}
                type="button"
                onClick={() => {
                  props.onProjectChange(null);
                  props.onTeamChange(team.id);
                }}
              >
                <CircleDot size={15} />
                <span>{team.name}</span>
                <span className="sidebar-key">{team.key}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <Link className="sidebar-account" href="/api/auth/signout">
        <span className="account-avatar">
          {props.workspace.userEmail.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <strong>{props.workspace.userEmail}</strong>
          <small>Sign out</small>
        </span>
        <LogOut size={15} />
      </Link>
    </aside>
  );
}
