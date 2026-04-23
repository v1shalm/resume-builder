"use client";

import { useEffect } from "react";
import { useResumeStore } from "./store";
import { showToast } from "./toast";

// zundo types leak the full zustand store API here; we only use undo/redo.
type TemporalApi = {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};

/**
 * Global ⌘Z / ⌘⇧Z (and Ctrl variants) undo/redo shortcuts.
 *
 * Mount once in the root of the editor. Ignores key presses originating
 * from form controls so native input undo still works inside a textarea
 * mid-sentence; only fires when the focus is outside editable fields or
 * when the user hits the shortcut on the app chrome.
 *
 * Actually we *do* want ⌘Z to work from inside inputs too — the
 * whole-resume undo is more powerful than the browser's per-field
 * stack. So we allow it everywhere and blur the active element so the
 * cursor returns cleanly.
 */
export function useUndoShortcuts() {
  useEffect(() => {
    const getTemporal = () =>
      (useResumeStore as unknown as { temporal: { getState: () => TemporalApi } })
        .temporal.getState();

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const isUndo = k === "z" && !e.shiftKey;
      const isRedo = (k === "z" && e.shiftKey) || k === "y";
      if (!isUndo && !isRedo) return;

      const temporal = getTemporal();

      if (isUndo) {
        if (temporal.pastStates.length === 0) return;
        e.preventDefault();
        temporal.undo();
        showToast({ message: "Undone", duration: 1600 });
      } else if (isRedo) {
        if (temporal.futureStates.length === 0) return;
        e.preventDefault();
        temporal.redo();
        showToast({ message: "Redone", duration: 1600 });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
