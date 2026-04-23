"use client";

import { create } from "zustand";

// ── Match Check UI state ──────────────────────────────────────────
// JD moved to per-variant metadata in the resume store (see
// `variantMeta[id].jobDescription`). This store holds only the
// ephemeral drawer-open state so it starts fresh each session.

type State = {
  drawerOpen: boolean;
};

type Actions = {
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
};

export const useMatchStore = create<State & Actions>()((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
}));
