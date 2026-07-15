"use client";

import {
  Building2,
  CircleDot,
  Inbox,
  LoaderCircle,
  LogOut,
  PanelLeftOpen,
  Users,
  Waves,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSignOutMutation } from "@/modules/auth/presentation/use-auth-mutations";
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

function navigationItemClass(active: boolean) {
  return cn(
    "h-8 w-full justify-start gap-2 overflow-hidden px-2.5 text-sm font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    active && "rounded-l-none border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground",
  );
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const signOut = useSignOutMutation();

  if (props.collapsed) {
    return (
      <aside className="sticky top-0 z-20 flex h-svh flex-col items-center border-r border-sidebar-border bg-sidebar px-1.5 py-2.5 text-sidebar-foreground max-md:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="Expand navigation" size="icon-sm" variant="ghost" onClick={props.onToggle}>
              <Waves size={19} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand navigation</TooltipContent>
        </Tooltip>
        <div className="flex flex-1 flex-col items-center gap-5 pt-7 text-muted-foreground">
          <Building2 size={17} />
          <Inbox size={17} />
          <Users size={17} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button aria-label="Expand navigation" className="mb-0.5" size="icon-sm" variant="ghost" onClick={props.onToggle}>
              <PanelLeftOpen size={17} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand navigation</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside className="sticky top-0 z-20 flex h-svh min-w-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground max-md:fixed max-md:z-50 max-md:w-[min(280px,calc(100vw-3rem))] max-md:shadow-2xl">
      <div className="grid min-h-[62px] grid-cols-[32px_minmax(0,1fr)_28px] items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <span className="grid size-8 place-items-center rounded-lg border border-sidebar-primary/30 bg-sidebar-primary/15 text-sidebar-primary">
          <Waves size={17} />
        </span>
        <div className="min-w-0">
          <strong className="block truncate text-sm">{props.workspace.name}</strong>
          <span className="mt-0.5 block truncate text-xs capitalize text-muted-foreground">{props.workspace.role}</span>
        </div>
        <Button
          aria-label="Collapse navigation"
          size="icon-sm"
          variant="ghost"
          onClick={props.onToggle}
        >
          <PanelLeftOpen className="rotate-180" size={16} />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
        <div className="grid gap-1.5 px-1 pb-3">
          <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground">Client</span>
          <WorkspaceSelect
            label="Client"
            options={props.clients.map((client) => ({ value: client.id, label: client.name }))}
            value={props.activeClientId}
            onValueChange={(clientId) => {
              if (clientId) props.onClientChange(clientId);
            }}
          />
        </div>

        <nav aria-label="Workspace navigation" className="grid gap-1">
          <Button
            className={navigationItemClass(!props.selectedProjectId && !props.selectedTeamId)}
            variant="ghost"
            onClick={() => {
              props.onProjectChange(null);
              props.onTeamChange(null);
            }}
          >
            <Inbox size={16} />
            <span>All issues</span>
          </Button>

          <div className="mt-4 grid gap-1">
            <div className="flex justify-between px-2 py-1 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground">
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
              <p className="px-2 py-1 text-xs text-muted-foreground">No projects yet</p>
            )}
          </div>

          <div className="mt-4 grid gap-1">
            <div className="flex justify-between px-2 py-1 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-muted-foreground">
              <span>Teams</span>
              <Badge variant="ghost">{props.teams.length}</Badge>
            </div>
            {props.teams.map((team) => (
              <Button
                className={navigationItemClass(props.selectedTeamId === team.id)}
                key={team.id}
                variant="ghost"
                onClick={() => {
                  props.onProjectChange(null);
                  props.onTeamChange(team.id);
                }}
              >
                <CircleDot size={15} />
                <span>{team.name}</span>
                <span className="ml-auto font-mono text-[0.62rem] text-muted-foreground">{team.key}</span>
              </Button>
            ))}
          </div>
        </nav>
        </div>
      </ScrollArea>

      <Separator />
      <Button
        className="h-auto min-h-[58px] w-full justify-start gap-2 rounded-none px-3 py-2 text-left"
        disabled={signOut.isPending}
        variant="ghost"
        onClick={() => signOut.mutate()}
      >
          <Avatar className="size-8 border border-sidebar-primary/30">
            <AvatarFallback>{props.workspace.userEmail.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs">{props.workspace.userEmail}</strong>
            <small className="mt-0.5 block text-[0.65rem] text-muted-foreground">Sign out</small>
          </span>
          {signOut.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut size={15} />}
      </Button>
    </aside>
  );
}
