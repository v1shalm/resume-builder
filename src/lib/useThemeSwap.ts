"use client";

import { useCallback } from "react";
import { useSequence } from "@web-kits/audio/react";
import {
  whoosh,
  levelUp,
  sparkle,
  pageExit,
  archive,
  ding,
} from "@/audio/core";
import { useTheme } from "./theme";

/**
 * Cinematic theme-swap:
 *
 *   DARK → LIGHT ("dawn"):
 *     0.00s  whoosh     — gentle upward noise sweep
 *     0.08s  levelUp    — 4-note rising sine arpeggio
 *     0.30s  sparkle    — bright FM bell with reverb
 *
 *   LIGHT → DARK ("dusk"):
 *     0.00s  whoosh     — same sweep, feels like an exhale here
 *     0.10s  pageExit   — descending pink-noise bandpass
 *     0.20s  archive    — descending sine sweep
 *     0.35s  ding       — low bell in the distance (reduced volume)
 *
 * Both sequences are context-aware via `useSequence` — they respect
 * the SoundProvider's enabled/volume and `prefers-reduced-motion`.
 */
export function useThemeSwap() {
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  const dawn = useSequence([
    { sound: whoosh, at: 0 },
    { sound: levelUp, at: 0.08 },
    { sound: sparkle, at: 0.3 },
  ]);

  const dusk = useSequence([
    { sound: whoosh, at: 0 },
    { sound: pageExit, at: 0.1 },
    { sound: archive, at: 0.2 },
    { sound: ding, at: 0.35, volume: 0.4 },
  ]);

  return useCallback(() => {
    // Fire the sequence for the NEW theme, then flip. Running the
    // sequence first lines the audio up with the visual transition
    // (icon rotates, root class swaps) the same frame.
    if (theme === "dark") dawn.play();
    else dusk.play();
    toggleTheme();
  }, [theme, toggleTheme, dawn, dusk]);
}
