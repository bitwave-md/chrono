"use client";

import { type ReactNode, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useActiveTimerQuery, useTimerSyncBridge } from "@/modules/workspace-ui/application/use-timer-query";
import { useProjectsQuery, useClientsQuery, useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { useWorkspaceShortcuts } from "@/modules/workspace-ui/application/use-workspace-shortcuts";
import { CommandMenu } from "@/modules/workspace-ui/components/command-menu";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { TimerDock } from "@/modules/workspace-ui/components/timer-dock";
import { WorkspaceSidebar } from "@/modules/workspace-ui/components/workspace-sidebar";
import { flattenProjects, type WorkspaceIdentity, type WorkspaceOption } from "@/modules/workspace-ui/domain/workspace-types";
import { useCommandMenu, useWorkspaceOverlay, useWorkspaceView, WorkspaceUiProvider } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface WorkspaceExperienceProps {
  workspace: WorkspaceIdentity;
  workspaces: WorkspaceOption[];
  children: ReactNode;
}

export function WorkspaceExperience(props: WorkspaceExperienceProps) {
  return (
    <WorkspaceUiProvider>
      <WorkspaceSidebarProvider>
        <WorkspaceShell {...props} />
      </WorkspaceSidebarProvider>
    </WorkspaceUiProvider>
  );
}

function WorkspaceSidebarProvider({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useWorkspaceView((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useWorkspaceView((state) => state.setSidebarCollapsed);
  return <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>{children}</SidebarProvider>;
}

function WorkspaceShell({ workspace, workspaces, children }: WorkspaceExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const clientsQuery = useClientsQuery(workspace.slug);
  const clients = clientsQuery.data ?? [];
  const routeClientId = pathname.match(/\/clients\/([^/]+)/)?.[1] ?? null;
  const activeClient = clients.find((client) => client.id === routeClientId) ?? clients[0] ?? null;
  const projectsQuery = useProjectsQuery(workspace.slug, activeClient?.id ?? null);
  const projects = useMemo(() => flattenProjects(projectsQuery.data ?? []), [projectsQuery.data]);
  const membersQuery = useMembersQuery(workspace.slug);
  const members = membersQuery.data ?? [];
  const activeTimerQuery = useActiveTimerQuery(workspace.slug);
  const createIssueOpen = useWorkspaceOverlay((state) => state.createIssueOpen);
  const openCreateIssue = useWorkspaceOverlay((state) => state.openCreateIssue);
  const closeCreateIssue = useWorkspaceOverlay((state) => state.closeCreateIssue);
  const commandOpen = useCommandMenu((state) => state.open);
  const setCommandOpen = useCommandMenu((state) => state.setOpen);
  const toggleCommand = useCommandMenu((state) => state.toggle);
  const { toggleSidebar } = useSidebar();

  useTimerSyncBridge(workspace.slug);
  useWorkspaceShortcuts({
    issues: [],
    focusedIssueId: null,
    dialogOpen: commandOpen || createIssueOpen,
    onToggleCommand: toggleCommand,
    onOpenCreate: openCreateIssue,
    onToggleSidebar: toggleSidebar,
    onSetView: () => undefined,
    onFocusIssue: () => undefined,
    onOpenIssue: () => undefined,
  });

  return (
    <>
      <WorkspaceSidebar clients={clients} workspace={workspace} workspaces={workspaces} />
      <SidebarInset className="min-h-svh">{children}</SidebarInset>

      <CommandMenu
        clients={clients}
        open={commandOpen}
        projects={projects}
        workspaceRoot={`/app/${workspace.slug}`}
        onNavigate={(path) => router.push(path)}
        onOpenChange={setCommandOpen}
        onOpenCreate={openCreateIssue}
        onToggleSidebar={toggleSidebar}
      />
      {createIssueOpen && activeClient ? (
        <CreateIssueDialog
          clientId={activeClient.id}
          filters={{}}
          members={members}
          open
          projects={projects}
          selectedProjectId={null}
          workspaceSlug={workspace.slug}
          onOpenChange={(open) => (open ? openCreateIssue() : closeCreateIssue())}
        />
      ) : null}
      <TimerDock state={activeTimerQuery.data} workspaceSlug={workspace.slug} />
    </>
  );
}
