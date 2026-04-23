"use client";

import { create } from "zustand";

// A single, stack-based toast store. One toast visible at a time —
// consistent with the "quiet tool" aesthetic; we don't want a pile of
// notifications competing for attention.
//
// Any part of the app can call `showToast({ message, action? })` to
// surface a transient, optional-undo confirmation at the bottom of the
// viewport. A new toast replaces whatever is on screen (with motion).

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: number;
  message: string;
  action?: ToastAction;
  // Auto-dismiss timer, in ms. Falsy = sticky.
  duration?: number;
};

type State = {
  toast: Toast | null;
  show: (t: Omit<Toast, "id">) => void;
  dismiss: () => void;
};

let nextId = 0;

export const useToastStore = create<State>((set, get) => ({
  toast: null,
  show: (t) => {
    const id = ++nextId;
    set({ toast: { id, duration: 5000, ...t } });
    const duration = t.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        // Only dismiss if this toast is still the current one —
        // avoids dismissing a newer toast that replaced us.
        if (get().toast?.id === id) set({ toast: null });
      }, duration);
    }
  },
  dismiss: () => set({ toast: null }),
}));

/** Imperative helper — usable from anywhere (not just React). */
export function showToast(t: Omit<Toast, "id">) {
  useToastStore.getState().show(t);
}
