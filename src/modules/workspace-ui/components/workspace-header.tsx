"use client";

import { Columns3, List, Menu, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
          <Button
            aria-label="Open navigation"
            className="icon-button mobile-menu-button"
            size="icon-sm"
            variant="ghost"
            type="button"
            onClick={props.onToggleSidebar}
          >
            <Menu size={17} />
          </Button>
        ) : null}
        <div>
          <span>{props.eyebrow}</span>
          <h1>{props.title}</h1>
        </div>
        <Badge className="issue-count" variant="outline">{props.issueCount}</Badge>
      </div>

      <div className="workspace-header-actions">
        <Button className="command-trigger" variant="outline" onClick={props.onOpenCommand}>
          <Search />
          <span>Search commands</span>
          <Kbd>⌘ K</Kbd>
        </Button>
        <ToggleGroup
          aria-label="Issue view"
          className="view-toggle"
          type="single"
          value={props.viewMode}
          variant="outline"
          onValueChange={(value) => {
            if (value === "list" || value === "board") props.onSetView(value);
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem aria-label="List view" value="list"><List /></ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem aria-label="Board view" value="board"><Columns3 /></ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Board view</TooltipContent>
          </Tooltip>
        </ToggleGroup>
        <Button className="primary-action" type="button" onClick={props.onOpenCreate}>
          <Plus size={16} />
          <span>New issue</span>
          <Kbd>C</Kbd>
        </Button>
      </div>
    </header>
  );
}
