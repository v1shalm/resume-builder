"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "zustand";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Tooltip, Kbd } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useThemeSwap } from "@/lib/useThemeSwap";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { SavedChip } from "./SavedChip";
import { OPEN_EXPORT_EVENT, OPEN_PALETTE_EVENT } from "./CommandPalette";

// `@react-pdf/renderer` is ~300 KB+ of PDF engine. Code-split the whole
// ExportDialog (which transitively pulls it in) so visitors who never
// export don't pay the cost. `loadExportDialog` is exposed so we can
// prefetch the chunk on hover/focus of the Export button — dynamic()
// caches the resolved module, so repeated calls are free.
const loadExportDialog = () =>
  import("./ExportDialog").then((m) => ({ default: m.ExportDialog }));
const ExportDialog = dynamic(loadExportDialog, { ssr: false });
import { Download, Sun, Moon, Undo2, Redo2, Command } from "lucide-react";
import { spring, stagger, rowFadeUp } from "@/lib/motion";

type TemporalApi = {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};

/*
 * Topbar hierarchy:
 *   left    — identity cluster: logo · "Resume" title · resume name · SavedChip
 *   right   — tools, grouped left-to-right by intent:
 *               history (undo / redo)
 *               │
 *               entry  (⌘K search chip) · theme
 *               │
 *               primary CTA (Export)
 *
 * Import JSON, Save JSON backup, Reset to starter, and the Sound mute
 * toggle all live in the command palette (⌘K) — keeping them out of
 * the bar trades one click (open palette) for a significantly calmer
 * chrome on every edit.
 */
export function Topbar() {
  // Only the header name drives this bar's render. Everything else
  // is read via `getState()` inside callbacks, so typing a bullet
  // doesn't re-render the whole topbar on every keystroke.
  const name = useResumeStore((s) => s.resume.header.name);
  const theme = useTheme((s) => s.theme);
  const swapTheme = useThemeSwap();
  const play = useSfx();

  // Subscribe to zundo's temporal store so Undo/Redo know when to
  // disable. Reactive — edits anywhere light up the buttons.
  const temporalStore = (
    useResumeStore as unknown as { temporal: import("zustand").StoreApi<TemporalApi> }
  ).temporal;
  const canUndo = useStore(temporalStore, (s) => s.pastStates.length > 0);
  const canRedo = useStore(temporalStore, (s) => s.futureStates.length > 0);

  const runUndo = () => {
    const t = temporalStore.getState();
    if (t.pastStates.length === 0) return;
    t.undo();
    showToast({ message: "Undone", duration: 1600 });
  };
  const runRedo = () => {
    const t = temporalStore.getState();
    if (t.futureStates.length === 0) return;
    t.redo();
    showToast({ message: "Redone", duration: 1600 });
  };

  const openPalette = () => {
    play("tap");
    window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
  };

  const [exportOpen, setExportOpen] = useState(false);

  // Prefetch the lazy ExportDialog chunk on hover/focus/shortcut so the
  // dialog mount is instant in practice.
  const prefetchExport = useCallback(() => {
    void loadExportDialog();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        prefetchExport();
        setExportOpen(true);
      }
    };
    const onOpenExport = () => {
      prefetchExport();
      setExportOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EXPORT_EVENT, onOpenExport);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EXPORT_EVENT, onOpenExport);
    };
  }, [prefetchExport]);

  return (
    <>
      <motion.header
        variants={stagger(0.045, 0.06)}
        initial="hidden"
        animate="show"
        className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-border bg-topbar px-3 shadow-topbar-t sm:px-4 md:px-5"
      >
        {/* ── Identity cluster ─────────────────────────────────── */}
        <motion.div
          variants={rowFadeUp}
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
        >
          <motion.div
            variants={rowFadeUp}
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={spring.snap}
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-ink-border bg-gradient-to-b from-ink-raised to-ink-surface shadow-raised-t"
            aria-hidden
          >
            <span className="text-[12px] font-semibold text-ink-text">R</span>
          </motion.div>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <h1 className="hidden shrink-0 text-[13px] font-semibold tracking-tight text-ink-text sm:inline">
              Resume
            </h1>
            <span
              aria-hidden
              className="hidden text-ink-border sm:inline"
            >
              ·
            </span>
            <span className="truncate text-[12.5px] text-ink-muted">
              {name || "Untitled"}
            </span>
            <SavedChip />
          </div>
        </motion.div>

        {/* ── Tools cluster ────────────────────────────────────── */}
        <motion.div
          variants={rowFadeUp}
          className="flex shrink-0 items-center gap-0.5 sm:gap-1"
        >
          {/* history */}
          <Tooltip
            content={
              <>
                <span>Undo</span>
                <Kbd>⌘Z</Kbd>
              </>
            }
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={runUndo}
              disabled={!canUndo}
              aria-label="Undo"
              className="hidden sm:inline-flex"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              <>
                <span>Redo</span>
                <Kbd>⌘⇧Z</Kbd>
              </>
            }
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={runRedo}
              disabled={!canRedo}
              aria-label="Redo"
              className="hidden sm:inline-flex"
            >
              <Redo2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Tooltip>

          <div
            className="mx-1.5 hidden h-4 w-px bg-ink-border sm:block"
            aria-hidden
          />

          {/* entry + theme */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open command palette"
            className={cn(
              "hidden h-7 items-center gap-2 rounded-md border border-ink-border bg-ink-surface pl-2 pr-1.5 text-[11.5px] text-ink-subtle transition-colors duration-fast sm:inline-flex",
              "shadow-well-t hover:border-ink-border-strong hover:text-ink-muted",
            )}
          >
            <Command className="h-3 w-3" aria-hidden />
            <span>Search</span>
            <kbd
              aria-hidden
              className="flex h-[18px] items-center justify-center gap-[1px] rounded-[4px] border border-ink-border bg-ink-bg px-1 font-mono text-[9.5px] font-semibold leading-none text-ink-muted"
            >
              <span>⌘</span>K
            </kbd>
          </button>

          <Tooltip content={theme === "dark" ? "Light mode" : "Dark mode"}>
            <Button
              variant="ghost"
              size="icon"
              sound={false}
              onClick={swapTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                  <motion.span
                    key="sun"
                    initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
                    transition={spring.snap}
                    className="flex"
                  >
                    <Sun className="h-3.5 w-3.5" aria-hidden />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ opacity: 0, rotate: 60, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -60, scale: 0.7 }}
                    transition={spring.snap}
                    className="flex"
                  >
                    <Moon className="h-3.5 w-3.5" aria-hidden />
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </Tooltip>

          <div
            className="mx-1.5 hidden h-4 w-px bg-ink-border sm:block"
            aria-hidden
          />

          {/* primary CTA */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setExportOpen(true)}
            onMouseEnter={prefetchExport}
            onFocus={prefetchExport}
            aria-label="Export PDF"
            className="px-3 sm:px-4"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">Export</span>
            <kbd
              aria-label="keyboard shortcut Command E"
              className="ml-1 hidden h-[22px] items-center justify-center gap-[3px] rounded-[6px] border border-[var(--kbd-border)] bg-[var(--kbd-bg)] px-[7px] text-[11px] font-semibold leading-none text-[var(--kbd-text)] md:inline-flex"
            >
              <span className="text-[11.5px] leading-none">⌘</span>
              <span className="leading-none">E</span>
            </kbd>
          </Button>
        </motion.div>
      </motion.header>
      {/*
        Only mount the dialog once it's actually been opened. Because
        `ExportDialog` is a dynamic import, gating the JSX here is what
        defers the chunk load until the user clicks Export (or presses
        ⌘E). The hover/focus prefetch warms the chunk earlier, so by
        the time this mounts the module is already cached.
      */}
      {exportOpen && (
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      )}
    </>
  );
}
