"use client";

import { useCallback } from "react";
import { usePatch } from "@web-kits/audio/react";
import type { PlayOptions } from "@web-kits/audio";
import { uiSoundPatch, SOUND_MAP, type SoundName } from "./sfx";

/**
 * Returns a stable `play(name, opts?)` function that triggers any of the
 * named UI sounds defined in `uiSoundPatch`.
 *
 * The semantic name is resolved through `SOUND_MAP` to the actual patch
 * key, so callsites stay readable even when patches use kebab-case keys.
 *
 * Playback automatically respects the nearest `<SoundProvider>` — so
 * toggling sounds off in the Topbar, or having `prefers-reduced-motion`
 * set, silently no-ops.
 */
export function useSfx() {
  const patch = usePatch(uiSoundPatch);
  return useCallback(
    (name: SoundName, opts?: PlayOptions) => {
      patch.play(SOUND_MAP[name], opts);
    },
    [patch],
  );
}
