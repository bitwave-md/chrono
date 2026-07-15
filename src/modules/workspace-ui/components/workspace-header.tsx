"use client";

import { Columns3, List, Menu, Plus, Search } from "lucide-react";

import type { WorkspaceViewMode } from "@/modules/workspace-ui/state/workspace-view-store";

interface WorkspaceHeaderProps {
  title: string;
  eyebrow: string;
  viewMode: WorkspaceViewMode;
  issueCount: number;
  sidebarCollapsed: boolean;
  onOpenCommand: () => void;
  onOpenCreate: () => void;
  onSetView: (mode: WorkspaceViewMode) => void;
  onToggleSidebar: () => void;
}

export function WorkspaceHeader(props: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-title-group">
        {props.sidebarCollapsed ? (
          <button
            aria-label="Open navigation"
            className="icon-button mobile-menu-button"
            type="button"
            onClick={props.onToggleSidebar}
          >
            <Menu size={17} />
          </button>
        ) : null}
        <div>
          <span>{props.eyebrow}</span>
          <h1>{props.title}</h1>
        </div>
        <span className="issue-count">{props.issueCount}</span>
      </div>

      <div className="workspace-header-actions">
        <button
          className="command-trigger"
          type="button"
          onClick={props.onOpenCommand}
        >
          <Search size={15} />
          <span>Search commands</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="view-toggle" role="group" aria-label="Issue view">
          <button
            aria-label="List view"
            data-active={props.viewMode === "list"}
            type="button"
            onClick={() => props.onSetView("list")}
          >
            <List size={15} />
          </button>
          <button
            aria-label="Board view"
            data-active={props.viewMode === "board"}
            type="button"
            onClick={() => props.onSetView("board")}
          >
            <Columns3 size={15} />
          </button>
        </div>
        <button className="primary-action" type="button" onClick={props.onOpenCreate}>
          <Plus size={16} />
          <span>New issue</span>
          <kbd>C</kbd>
        </button>
      </div>
    </header>
  );
}
