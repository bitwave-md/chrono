"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useIssuesQuery, useUpdateIssueMutation } from "@/modules/workspace-ui/application/use-issue-queries";
import {
  useActiveTimerQuery,
  useTimerSyncBridge,
} from "@/modules/workspace-ui/application/use-timer-query";
import { useWorkspaceShortcuts } from "@/modules/workspace-ui/application/use-workspace-shortcuts";
import {
  useClientsQuery,
  useProjectsQuery,
  useTeamsQuery,
  useTimeCategoriesQuery,
  useWorkflowStatusesQuery,
} from "@/modules/workspace-ui/application/use-workspace-queries";
import { CommandMenu } from "@/modules/workspace-ui/components/command-menu";
import { CreateIssueDialog } from "@/modules/workspace-ui/components/create-issue-dialog";
import { IssueBoard } from "@/modules/workspace-ui/components/issue-board";
import { IssueList } from "@/modules/workspace-ui/components/issue-list";
import { IssuePeekPane } from "@/modules/workspace-ui/components/issue-peek-pane";
import { TimerDock } from "@/modules/workspace-ui/components/timer-dock";
import { WorkspaceHeader } from "@/modules/workspace-ui/components/workspace-header";
import { WorkspaceLoading } from "@/modules/workspace-ui/components/workspace-loading";
import { WorkspaceSidebar } from "@/modules/workspace-ui/components/workspace-sidebar";
import {
  flattenProjects,
  type WorkspaceIdentity,
} from "@/modules/workspace-ui/domain/workspace-types";
import {
  useCommandMenu,
  useWorkspaceOverlay,
  useWorkspaceView,
  WorkspaceUiProvider,
} from "@/modules/workspace-ui/state/workspace-ui-provider";

export function WorkspaceExperience({ workspace }: { workspace: WorkspaceIdentity }) {
  return (
    <WorkspaceUiProvider>
      <WorkspaceShell workspace={workspace} />
    </WorkspaceUiProvider>
  );
}

function WorkspaceShell({ workspace }: { workspace: WorkspaceIdentity }) {
  const selectedClientId = useWorkspaceView((state) => state.selectedClientId);
  const selectedProjectId = useWorkspaceView((state) => state.selectedProjectId);
  const selectedTeamId = useWorkspaceView((state) => state.selectedTeamId);
  const focusedIssueId = useWorkspaceView((state) => state.focusedIssueId);
  const sidebarCollapsed = useWorkspaceView((state) => state.sidebarCollapsed);
  const viewMode = useWorkspaceView((state) => state.viewMode);
  const selectClient = useWorkspaceView((state) => state.selectClient);
  const selectProject = useWorkspaceView((state) => state.selectProject);
  const selectTeam = useWorkspaceView((state) => state.selectTeam);
  const focusIssue = useWorkspaceView((state) => state.focusIssue);
  const setViewMode = useWorkspaceView((state) => state.setViewMode);
  const toggleSidebar = useWorkspaceView((state) => state.toggleSidebar);
  const createIssueOpen = useWorkspaceOverlay((state) => state.createIssueOpen);
  const peekIssueId = useWorkspaceOverlay((state) => state.peekIssueId);
  const openCreateIssue = useWorkspaceOverlay((state) => state.openCreateIssue);
  const closeCreateIssue = useWorkspaceOverlay((state) => state.closeCreateIssue);
  const openIssue = useWorkspaceOverlay((state) => state.openIssue);
  const closeIssue = useWorkspaceOverlay((state) => state.closeIssue);
  const commandOpen = useCommandMenu((state) => state.open);
  const setCommandOpen = useCommandMenu((state) => state.setOpen);
  const toggleCommand = useCommandMenu((state) => state.toggle);

  const clientsQuery = useClientsQuery(workspace.slug);
  const clients = clientsQuery.data ?? [];
  const activeClient =
    clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const activeClientId = activeClient?.id ?? null;
  const projectsQuery = useProjectsQuery(workspace.slug, activeClientId);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const flatProjects = useMemo(() => flattenProjects(projects), [projects]);
  const teamsQuery = useTeamsQuery(workspace.slug);
  const teams = teamsQuery.data ?? [];
  const categoriesQuery = useTimeCategoriesQuery(workspace.slug);
  const categories = categoriesQuery.data ?? [];
  const selectedProject = flatProjects.find(
    (project) => project.id === selectedProjectId,
  );
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const issueFilters = useMemo(
    () => ({
      ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
    }),
    [selectedProjectId, selectedTeamId],
  );
  const issuesQuery = useIssuesQuery(workspace.slug, activeClientId, issueFilters);
  const issues = issuesQuery.data ?? [];
  const statusesQuery = useWorkflowStatusesQuery(
    workspace.slug,
    selectedProject?.effectiveWorkflowId ?? null,
  );
  const statuses = statusesQuery.data ?? [];
  const activeTimerQuery = useActiveTimerQuery(workspace.slug);
  const updateIssue = useUpdateIssueMutation(
    workspace.slug,
    activeClientId,
    issueFilters,
  );
  const peekIssue = issues.find((issue) => issue.id === peekIssueId) ?? null;

  useTimerSyncBridge(workspace.slug);
  useWorkspaceShortcuts({
    issues,
    focusedIssueId,
    dialogOpen: commandOpen || createIssueOpen || Boolean(peekIssueId),
    onToggleCommand: toggleCommand,
    onOpenCreate: openCreateIssue,
    onToggleSidebar: toggleSidebar,
    onSetView: setViewMode,
    onFocusIssue: focusIssue,
    onOpenIssue: openIssue,
  });

  if (clientsQuery.isLoading) {
    return <WorkspaceLoading />;
  }

  if (clientsQuery.error) {
    return <WorkspaceFailure message={clientsQuery.error.message} />;
  }

  const title = selectedProject?.name ?? selectedTeam?.name ?? activeClient?.name ?? "Issues";
  const eyebrow = selectedProject
    ? selectedProject.kind
    : selectedTeam
      ? "Functional team"
      : activeClient
        ? `${activeClient.key} workspace`
        : "Workspace";

  return (
    <div
      className={cn(
        "grid min-h-svh bg-background max-md:grid-cols-1",
        sidebarCollapsed
          ? "grid-cols-[54px_minmax(0,1fr)]"
          : "grid-cols-[258px_minmax(0,1fr)] max-lg:grid-cols-[226px_minmax(0,1fr)]",
      )}
    >
      <WorkspaceSidebar
        activeClientId={activeClientId}
        clients={clients}
        collapsed={sidebarCollapsed}
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedTeamId={selectedTeamId}
        teams={teams}
        workspace={workspace}
        onClientChange={selectClient}
        onProjectChange={selectProject}
        onTeamChange={selectTeam}
        onToggle={toggleSidebar}
      />

      <main className="min-h-svh min-w-0">
        <WorkspaceHeader
          eyebrow={eyebrow}
          issueCount={issues.length}
          sidebarCollapsed={sidebarCollapsed}
          title={title}
          viewMode={viewMode}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenCreate={openCreateIssue}
          onSetView={setViewMode}
          onToggleSidebar={toggleSidebar}
        />

        <section className="min-h-[calc(100svh-63px)] p-4 max-md:p-2.5" aria-live="polite">
          {issuesQuery.isLoading || projectsQuery.isLoading || teamsQuery.isLoading ? (
            <WorkspaceLoading label="Loading issues" />
          ) : issuesQuery.error ? (
            <WorkspaceFailure message={issuesQuery.error.message} />
          ) : viewMode === "list" ? (
            <IssueList
              focusedIssueId={focusedIssueId}
              issues={issues}
              onFocus={focusIssue}
              onOpen={openIssue}
            />
          ) : (
            <IssueBoard
              issues={issues}
              selectedProjectId={selectedProjectId}
              statuses={statuses}
              onOpen={openIssue}
              onMove={(issue, status) =>
                updateIssue.mutate({
                  issueId: issue.id,
                  expectedVersion: issue.version,
                  statusId: status.id,
                  optimistic: { statusId: status.id, statusName: status.name },
                })
              }
            />
          )}
        </section>
      </main>

      {createIssueOpen ? (
        <CreateIssueDialog
          clientId={activeClientId}
          filters={issueFilters}
          open
          projects={flatProjects}
          selectedProjectId={selectedProjectId}
          selectedTeamId={selectedTeamId}
          statuses={statuses}
          teams={teams}
          workspaceSlug={workspace.slug}
          onOpenChange={(open) => (open ? openCreateIssue() : closeCreateIssue())}
        />
      ) : null}
      {peekIssue ? (
        <IssuePeekPane
          activeTimer={activeTimerQuery.data}
          categories={categories}
          issue={peekIssue}
          key={peekIssue.id}
          open
          projects={flatProjects}
          teams={teams}
          updateError={updateIssue.error}
          updatePending={updateIssue.isPending}
          workspaceSlug={workspace.slug}
          onOpenChange={(open) => (open ? undefined : closeIssue())}
          onUpdate={(variables) => updateIssue.mutate(variables)}
        />
      ) : null}
      <CommandMenu
        clients={clients}
        open={commandOpen}
        projects={flatProjects}
        teams={teams}
        onOpenChange={setCommandOpen}
        onOpenCreate={openCreateIssue}
        onSelectClient={selectClient}
        onSelectProject={(projectId) => {
          selectTeam(null);
          selectProject(projectId);
        }}
        onSelectTeam={(teamId) => {
          selectProject(null);
          selectTeam(teamId);
        }}
        onSetBoard={() => setViewMode("board")}
        onSetList={() => setViewMode("list")}
        onToggleSidebar={toggleSidebar}
      />
      <TimerDock state={activeTimerQuery.data} workspaceSlug={workspace.slug} />
    </div>
  );
}

function WorkspaceFailure({ message }: { message: string }) {
  return (
    <Alert className="m-6 w-auto" variant="destructive">
      <AlertTriangle size={18} />
      <AlertTitle>Chrono could not load this view.</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
