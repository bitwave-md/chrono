import { createStore } from "zustand/vanilla";

export interface CommandMenuStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export function createCommandMenuStore() {
  return createStore<CommandMenuStore>()((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
  }));
}
