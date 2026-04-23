"use client";

import * as React from "react";
import { SoundProvider } from "@web-kits/audio/react";
import { useSoundSettings } from "@/lib/soundSettings";

/**
 * Bridges our persisted sound settings into the @web-kits/audio React
 * context. Every descendant that uses `usePatch` / `useSound` respects
 * this enabled/volume state (and `prefers-reduced-motion`, which the
 * library handles internally).
 */
export function SoundRoot({ children }: { children: React.ReactNode }) {
  const enabled = useSoundSettings((s) => s.enabled);
  const volume = useSoundSettings((s) => s.volume);

  return (
    <SoundProvider enabled={enabled} volume={volume}>
      {children}
    </SoundProvider>
  );
}
