"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Match Check state ──────────────────────────────────────────────
// Separate from the resume store because the JD is a transient
// application-context thing, not part of the resume artifact. If
// users later get multiple resume variants (the v2 product bet),
// each variant can map to its own JD by extending this shape.

type State = {
  jobDescription: string;
  drawerOpen: boolean;
};

type Actions = {
  setJobDescription: (jd: string) => void;
  clearJobDescription: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
};

export const useMatchStore = create<State & Actions>()(
  persist(
    (set) => ({
      jobDescription: "",
      drawerOpen: false,

      setJobDescription: (jd) => set({ jobDescription: jd }),
      clearJobDescription: () => set({ jobDescription: "" }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
    }),
    {
      name: "resume-builder:match:v1",
      // Don't persist drawer-open state — each session starts closed
      // so the layout never surprises the user on reload.
      partialize: (s) => ({ jobDescription: s.jobDescription }),
    },
  ),
);
