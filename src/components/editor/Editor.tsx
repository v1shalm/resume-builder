"use client";

import { useEffect, useState } from "react";
import { Topbar } from "./Topbar";
import { PreviewPane } from "./PreviewPane";
import { EditorPanel } from "./EditorPanel";
import { SoundRoot } from "@/components/providers/SoundRoot";
import { Toaster } from "@/components/ui/Toaster";
import { useUndoShortcuts } from "@/lib/useUndoShortcuts";

export function Editor() {
  const [mounted, setMounted] = useState(false);
  useUndoShortcuts();
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ink-bg">
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-subtle">
          <span className="h-1 w-1 animate-pulse rounded-full bg-ink-muted" />
          Loading
        </div>
      </div>
    );
  }

  return (
    <SoundRoot>
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-ink-bg text-ink-text">
        <Topbar />
        {/*
          Layout breakpoints:
          · Mobile  (<768px)  → single column, preview 52vh on top, editor below (scrollable).
          · Tablet  (md)      → two columns, editor 340px.
          · Laptop  (lg)      → editor 400px.
          · Desktop (xl+)     → editor 440px (default).
        */}
        <div className="grid flex-1 overflow-hidden grid-cols-1 grid-rows-[minmax(0,52vh)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_340px] md:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <PreviewPane />
          <EditorPanel />
        </div>
        <Toaster />
      </div>
    </SoundRoot>
  );
}
