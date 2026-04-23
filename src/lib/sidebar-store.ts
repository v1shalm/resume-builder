"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Variants sidebar state ────────────────────────────────────────
// The sidebar is always mounted. Two states: `collapsed` = floating
// pill, `!collapsed` = full panel. Default is expanded so the
// feature is discoverable on first load; users who prefer more
// canvas space tuck it into the pill and we remember that choice.

type Tab = "resumes" | "templates";

type State = {
  collapsed: boolean;
  tab: Tab;
};

type Actions = {
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  setTab: (t: Tab) => void;
};

export const useSidebarStore = create<State & Actions>()(
  persist(
    (set) => ({
      collapsed: false,
      tab: "resumes",
      setCollapsed: (v) => set({ collapsed: v }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setTab: (t) => set({ tab: t }),
    }),
    {
      name: "resume-builder:sidebar:v2",
      partialize: (s) => ({ collapsed: s.collapsed, tab: s.tab }),
    },
  ),
);
