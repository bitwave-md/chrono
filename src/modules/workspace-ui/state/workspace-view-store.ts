import { createStore } from "zustand/vanilla";

export type WorkspaceViewMode = "list" | "board";

export interface WorkspaceViewState {
  workspaceSectionOpen: boolean;
  clientsSectionOpen: boolean;
  expandedClientIds: Record<string, boolean>;
  focusedIssueId: string | null;
  sidebarCollapsed: boolean;
  viewMode: WorkspaceViewMode;
}

export interface WorkspaceViewActions {
  setWorkspaceSectionOpen: (open: boolean) => void;
  setClientsSectionOpen: (open: boolean) => void;
  setClientExpanded: (clientId: string, open: boolean) => void;
  focusIssue: (issueId: string | null) => void;
  setViewMode: (viewMode: WorkspaceViewMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export type WorkspaceViewStore = WorkspaceViewState & WorkspaceViewActions;

export function createWorkspaceViewStore() {
  return createStore<WorkspaceViewStore>()((set) => ({
    workspaceSectionOpen: true,
    clientsSectionOpen: true,
    expandedClientIds: {},
    focusedIssueId: null,
    sidebarCollapsed: false,
    viewMode: "list",
    setWorkspaceSectionOpen: (workspaceSectionOpen) => set({ workspaceSectionOpen }),
    setClientsSectionOpen: (clientsSectionOpen) => set({ clientsSectionOpen }),
    setClientExpanded: (clientId, open) => set((state) => ({
      expandedClientIds: { ...state.expandedClientIds, [clientId]: open },
    })),
    focusIssue: (focusedIssueId) => set({ focusedIssueId }),
    setViewMode: (viewMode) => set({ viewMode }),
    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    toggleSidebar: () =>
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  }));
}
