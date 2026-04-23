"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SoundState = {
  enabled: boolean;
  volume: number;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
};

export const useSoundSettings = create<SoundState>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.7,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (v) => set({ enabled: v }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
    }),
    {
      name: "resume-builder:sound",
      version: 1,
    },
  ),
);
