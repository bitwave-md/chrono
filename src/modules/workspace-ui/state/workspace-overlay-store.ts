import { createStore } from "zustand/vanilla";

export interface WorkspaceOverlayStore {
  createIssueOpen: boolean;
  peekIssueId: string | null;
  openCreateIssue: () => void;
  closeCreateIssue: () => void;
  openIssue: (issueId: string) => void;
  closeIssue: () => void;
}

export function createWorkspaceOverlayStore() {
  return createStore<WorkspaceOverlayStore>()((set) => ({
    createIssueOpen: false,
    peekIssueId: null,
    openCreateIssue: () => set({ createIssueOpen: true }),
    closeCreateIssue: () => set({ createIssueOpen: false }),
    openIssue: (peekIssueId) => set({ peekIssueId }),
    closeIssue: () => set({ peekIssueId: null }),
  }));
}
