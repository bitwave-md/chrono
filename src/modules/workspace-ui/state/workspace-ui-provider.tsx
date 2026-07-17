"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { useStore } from "zustand";

import type { WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";

import {
  createCommandMenuStore,
  type CommandMenuStore,
} from "@/modules/workspace-ui/state/command-menu-store";
import {
  createWorkspaceOverlayStore,
  type WorkspaceOverlayStore,
} from "@/modules/workspace-ui/state/workspace-overlay-store";
import {
  createWorkspaceViewStore,
  type WorkspaceViewStore,
} from "@/modules/workspace-ui/state/workspace-view-store";

type ViewStoreApi = ReturnType<typeof createWorkspaceViewStore>;
type OverlayStoreApi = ReturnType<typeof createWorkspaceOverlayStore>;
type CommandStoreApi = ReturnType<typeof createCommandMenuStore>;

const ViewStoreContext = createContext<ViewStoreApi | null>(null);
const OverlayStoreContext = createContext<OverlayStoreApi | null>(null);
const CommandStoreContext = createContext<CommandStoreApi | null>(null);
const WorkspaceIdentityContext = createContext<WorkspaceIdentity | null>(null);

export function WorkspaceUiProvider({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: WorkspaceIdentity;
}) {
  const [viewStore] = useState(createWorkspaceViewStore);
  const [overlayStore] = useState(createWorkspaceOverlayStore);
  const [commandStore] = useState(createCommandMenuStore);

  return (
    <WorkspaceIdentityContext.Provider value={workspace}>
      <ViewStoreContext.Provider value={viewStore}>
        <OverlayStoreContext.Provider value={overlayStore}>
          <CommandStoreContext.Provider value={commandStore}>
            {children}
          </CommandStoreContext.Provider>
        </OverlayStoreContext.Provider>
      </ViewStoreContext.Provider>
    </WorkspaceIdentityContext.Provider>
  );
}

export function useWorkspaceIdentity(): WorkspaceIdentity {
  const workspace = useContext(WorkspaceIdentityContext);
  if (!workspace) throw new Error("useWorkspaceIdentity requires WorkspaceUiProvider.");
  return workspace;
}

export function useWorkspaceView<T>(
  selector: (state: WorkspaceViewStore) => T,
): T {
  const store = useContext(ViewStoreContext);

  if (!store) {
    throw new Error("useWorkspaceView requires WorkspaceUiProvider.");
  }

  return useStore(store, selector);
}

export function useWorkspaceOverlay<T>(
  selector: (state: WorkspaceOverlayStore) => T,
): T {
  const store = useContext(OverlayStoreContext);

  if (!store) {
    throw new Error("useWorkspaceOverlay requires WorkspaceUiProvider.");
  }

  return useStore(store, selector);
}

export function useCommandMenu<T>(
  selector: (state: CommandMenuStore) => T,
): T {
  const store = useContext(CommandStoreContext);

  if (!store) {
    throw new Error("useCommandMenu requires WorkspaceUiProvider.");
  }

  return useStore(store, selector);
}
