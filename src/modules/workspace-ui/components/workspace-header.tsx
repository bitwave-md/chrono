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
    <header className="sticky top-0 z-10 flex min-h-[63px] items-center justify-between gap-4 border-b bg-background/85 px-4 py-2 backdrop-blur-xl max-md:px-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {props.sidebarCollapsed ? (
          <Button
            aria-label="Open navigation"
            size="icon-sm"
            variant="ghost"
            type="button"
            onClick={props.onToggleSidebar}
          >
            <Menu size={17} />
          </Button>
        ) : null}
        <div className="min-w-0">
          <span className="block font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">{props.eyebrow}</span>
          <h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight">{props.title}</h1>
        </div>
        <Badge className="h-6 min-w-6 font-mono text-[0.68rem] text-muted-foreground" variant="outline">{props.issueCount}</Badge>
      </div>

      <div className="flex items-center gap-2 max-md:gap-1">
        <Button className="min-w-48 justify-start text-muted-foreground max-lg:size-9 max-lg:min-w-0 max-lg:px-0" variant="outline" onClick={props.onOpenCommand}>
          <Search />
          <span className="max-lg:hidden">Search commands</span>
          <Kbd className="ml-auto max-md:hidden">⌘ K</Kbd>
        </Button>
        <ToggleGroup
          aria-label="Issue view"
          className="overflow-hidden border max-sm:hidden"
          type="single"
          value={props.viewMode}
          variant="outline"
          onValueChange={(value) => {
            if (value === "list" || value === "board") props.onSetView(value);
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem className="rounded-none border-0" aria-label="List view" value="list"><List /></ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem className="rounded-none border-0 border-l" aria-label="Board view" value="board"><Columns3 /></ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>Board view</TooltipContent>
          </Tooltip>
        </ToggleGroup>
        <Button className="max-md:size-9 max-md:px-0" type="button" onClick={props.onOpenCreate}>
          <Plus size={16} />
          <span className="max-md:hidden">New issue</span>
          <Kbd className="max-lg:hidden">C</Kbd>
        </Button>
      </div>
    </header>
  );
}
