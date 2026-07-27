"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";

import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { useActiveTimerQuery, useTimerSyncBridge } from "@/modules/workspace-ui/application/use-timer-query";
import { useProjectBranchesQuery } from "@/modules/workspace-ui/application/use-project-branch-queries";
import { useProjectsQuery, useClientsQuery, useMembersQuery } from "@/modules/workspace-ui/application/use-workspace-queries";
import { useWorkspaceShortcuts } from "@/modules/workspace-ui/application/use-workspace-shortcuts";
import { CommandMenu } from "@/modules/workspace-ui/components/command-menu";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { TimerDock } from "@/modules/workspace-ui/components/timer-dock";
import { WorkspaceSidebar } from "@/modules/workspace-ui/components/workspace-sidebar";
import { SettingsShell } from "@/modules/settings/components/settings-shell";
import { usePreferencesQuery } from "@/modules/settings/application/use-settings-queries";
import { UpdateNotificationBridge } from "@/modules/settings/components/update-notification-bridge";
import type { WorkspaceIdentity, WorkspaceOption } from "@/modules/workspace-ui/domain/workspace-types";
import { IssueCreationRouteContext } from "@/modules/workspace-ui/domain/issue-creation-route-context";
import { useCommandMenu, useWorkspaceOverlay, useWorkspaceView, WorkspaceUiProvider } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface WorkspaceExperienceProps {
  workspace: WorkspaceIdentity;
  workspaces: WorkspaceOption[];
  children: ReactNode;
}

export function WorkspaceExperience(props: WorkspaceExperienceProps) {
  return (
    <WorkspaceUiProvider workspace={props.workspace}>
      <WorkspaceSidebarProvider>
        <WorkspacePreferenceBridge workspaceSlug={props.workspace.slug} />
        <UpdateNotificationBridge enabled={props.workspace.isOperator} workspaceSlug={props.workspace.slug} />
        <WorkspaceShell {...props} />
      </WorkspaceSidebarProvider>
    </WorkspaceUiProvider>
  );
}

function WorkspacePreferenceBridge({ workspaceSlug }: { workspaceSlug: string }) {
  const preferences = usePreferencesQuery(workspaceSlug);
  const { setTheme } = useTheme();
  const setViewMode = useWorkspaceView((state) => state.setViewMode);
  const setSidebarCollapsed = useWorkspaceView((state) => state.setSidebarCollapsed);
  useEffect(() => {
    if (!preferences.data) return;
    setTheme(preferences.data.theme);
    document.documentElement.dataset.density = preferences.data.density;
    setViewMode(preferences.data.issueView);
    setSidebarCollapsed(preferences.data.sidebarCollapsed);
  }, [preferences.data, setSidebarCollapsed, setTheme, setViewMode]);
  return null;
}

function WorkspaceSidebarProvider({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useWorkspaceView((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useWorkspaceView((state) => state.setSidebarCollapsed);
  return <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>{children}</SidebarProvider>;
}

function WorkspaceShell({ workspace, workspaces, children }: WorkspaceExperienceProps) {
  const pathname = usePathname();
  if (pathname.startsWith(`/app/${workspace.slug}/settings`)) {
    return <SettingsShell workspace={workspace}>{children}</SettingsShell>;
  }
  return <ApplicationShell workspace={workspace} workspaces={workspaces}>{children}</ApplicationShell>;
}

function ApplicationShell({ workspace, workspaces, children }: WorkspaceExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const creationRoute = IssueCreationRouteContext.from(pathname, searchParams.get("branch"));
  const clientsQuery = useClientsQuery(workspace.slug);
  const clients = clientsQuery.data ?? [];
  const projectsQuery = useProjectsQuery(workspace.slug, null);
  const allProjects = projectsQuery.data ?? [];
  const activeProject = allProjects.find((project) => project.id === creationRoute.projectId) ?? null;
  const activeClient = clients.find((client) => client.id === (creationRoute.clientId ?? activeProject?.clientId))
    ?? (!creationRoute.clientId && !creationRoute.projectId ? clients[0] : null);
  const projects = activeClient
    ? allProjects.filter((project) => project.clientId === activeClient.id)
    : [];
  const branchesQuery = useProjectBranchesQuery(workspace.slug, activeProject?.id ?? null);
  const branches = branchesQuery.data ?? [];
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
      <SidebarInset className="min-h-svh overflow-hidden bg-background md:my-1.5 md:mr-1.5 md:min-h-[calc(100svh-0.75rem)] md:rounded-xl md:border md:border-white/[0.06] md:shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
        {children}
      </SidebarInset>

      <CommandMenu
        clients={clients}
        open={commandOpen}
        projects={allProjects}
        workspaceRoot={`/app/${workspace.slug}`}
        onNavigate={(path) => router.push(path)}
        onOpenChange={setCommandOpen}
        onOpenCreate={openCreateIssue}
        onToggleSidebar={toggleSidebar}
      />
      {createIssueOpen && activeClient ? (
        <CreateIssueDialog
          clientId={activeClient.id}
          filters={creationRoute.filters}
          branches={branches}
          members={members}
          open
          projects={projects}
          selectedProjectId={activeProject?.id ?? null}
          selectedBranchId={creationRoute.branchId}
          workspaceSlug={workspace.slug}
          onOpenChange={(open) => (open ? openCreateIssue() : closeCreateIssue())}
        />
      ) : null}
      <TimerDock state={activeTimerQuery.data} workspaceSlug={workspace.slug} />
      <Toaster />
    </>
  );
}
