"use client";

import { CircleDot, Inbox, LoaderCircle, LogOut, Waves } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
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
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string | null) => void;
  onTeamChange: (teamId: string | null) => void;
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const signOut = useSignOutMutation();
  const { isMobile, setOpenMobile } = useSidebar();

  const finishNavigation = (action: () => void) => {
    action();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-11" tooltip={props.workspace.name}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Waves />
              </span>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <strong className="block truncate text-sm">{props.workspace.name}</strong>
                <small className="block truncate text-xs capitalize text-sidebar-foreground/60">
                  {props.workspace.role}
                </small>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Client</SidebarGroupLabel>
          <SidebarGroupContent>
            <WorkspaceSelect
              label="Client"
              options={props.clients.map((client) => ({
                value: client.id,
                label: client.name,
              }))}
              value={props.activeClientId}
              onValueChange={(clientId) => {
                if (clientId) finishNavigation(() => props.onClientChange(clientId));
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={!props.selectedProjectId && !props.selectedTeamId}
                  tooltip="All issues"
                  onClick={() =>
                    finishNavigation(() => {
                      props.onProjectChange(null);
                      props.onTeamChange(null);
                    })
                  }
                >
                  <Inbox />
                  <span className="group-data-[collapsible=icon]:hidden">All issues</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Projects</span>
            <span className="ml-auto tabular-nums">{props.projects.length}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {props.projects.length ? (
                <ProjectTree
                  projects={props.projects}
                  selectedProjectId={props.selectedProjectId}
                  onSelect={(projectId) =>
                    finishNavigation(() => {
                      props.onTeamChange(null);
                      props.onProjectChange(projectId);
                    })
                  }
                />
              ) : (
                <SidebarMenuItem>
                  <span className="block px-2 py-1 text-xs text-sidebar-foreground/60">
                    No projects yet
                  </span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Teams</span>
            <span className="ml-auto tabular-nums">{props.teams.length}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {props.teams.map((team) => (
                <SidebarMenuItem key={team.id}>
                  <SidebarMenuButton
                    isActive={props.selectedTeamId === team.id}
                    tooltip={team.name}
                    onClick={() =>
                      finishNavigation(() => {
                        props.onProjectChange(null);
                        props.onTeamChange(team.id);
                      })
                    }
                  >
                    <CircleDot />
                    <span className="group-data-[collapsible=icon]:hidden">{team.name}</span>
                    <span className="ml-auto font-mono text-[0.65rem] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                      {team.key}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-11"
              disabled={signOut.isPending}
              tooltip="Sign out"
              onClick={() => signOut.mutate()}
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarFallback>
                  {props.workspace.userEmail.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <strong className="block truncate text-xs">{props.workspace.userEmail}</strong>
                <small className="block text-[0.65rem] text-sidebar-foreground/60">Sign out</small>
              </span>
              {signOut.isPending ? (
                <LoaderCircle className="animate-spin group-data-[collapsible=icon]:hidden" />
              ) : (
                <LogOut className="group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
