import { createStore } from "zustand/vanilla";

export type WorkspaceViewMode = "list" | "board";

export interface WorkspaceViewState {
  selectedClientId: string | null;
  selectedProjectId: string | null;
  selectedTeamId: string | null;
  focusedIssueId: string | null;
  sidebarCollapsed: boolean;
  viewMode: WorkspaceViewMode;
}

export interface WorkspaceViewActions {
  selectClient: (clientId: string) => void;
  selectProject: (projectId: string | null) => void;
  selectTeam: (teamId: string | null) => void;
  focusIssue: (issueId: string | null) => void;
  setViewMode: (viewMode: WorkspaceViewMode) => void;
  toggleSidebar: () => void;
}

export type WorkspaceViewStore = WorkspaceViewState & WorkspaceViewActions;

export function createWorkspaceViewStore() {
  return createStore<WorkspaceViewStore>()((set) => ({
    selectedClientId: null,
    selectedProjectId: null,
    selectedTeamId: null,
    focusedIssueId: null,
    sidebarCollapsed: false,
    viewMode: "list",
    selectClient: (selectedClientId) =>
      set({
        selectedClientId,
        selectedProjectId: null,
        selectedTeamId: null,
        focusedIssueId: null,
      }),
    selectProject: (selectedProjectId) =>
      set({ selectedProjectId, focusedIssueId: null }),
    selectTeam: (selectedTeamId) =>
      set({ selectedTeamId, focusedIssueId: null }),
    focusIssue: (focusedIssueId) => set({ focusedIssueId }),
    setViewMode: (viewMode) => set({ viewMode }),
    toggleSidebar: () =>
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  }));
}
