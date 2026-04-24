"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Tooltip, Kbd } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";
import { useMatchStore } from "@/lib/match-store";
import { useSidebarStore } from "@/lib/sidebar-store";
import { useTheme } from "@/lib/theme";
import { useThemeSwap } from "@/lib/useThemeSwap";
import { showToast } from "@/lib/toast";
import { matchCheck } from "@/lib/match-check";
import { Download, Undo2, Redo2, Target, Sun, Moon } from "lucide-react";
import { spring, stagger, rowFadeUp } from "@/lib/motion";
import { OPEN_EXPORT_EVENT } from "./CommandPalette";

// Lazy-load the heavy PDF engine until the user opens Export.
const loadExportDialog = () =>
  import("./ExportDialog").then((m) => ({ default: m.ExportDialog }));
const ExportDialog = dynamic(loadExportDialog, { ssr: false });

type TemporalApi = {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};

/*
 * Topbar v2 — three zones:
 *
 *   LEFT    — VariantName (click-to-rename) · SavedStatus (dot + label)
 *   CENTER  — Undo / Redo, flanked by hairline dividers
 *   RIGHT   — ThemeToggle · divider · AtsScoreButton (live %) · Export PDF
 *
 * Search pill + sidebar toggle stay out of the topbar — ⌘K owns
 * "find / run", and the VariantsSidebar has its own floating pill.
 * Keyboard shortcuts preserved: ⌘E export · ⌘J ATS · ⌘O sidebar ·
 * ⌘⇧N new variant.
 */
export function Topbar() {
  const temporalStore = (
    useResumeStore as unknown as { temporal: import("zustand").StoreApi<TemporalApi> }
  ).temporal;
  const canUndo = useStore(temporalStore, (s) => s.pastStates.length > 0);
  const canRedo = useStore(temporalStore, (s) => s.futureStates.length > 0);

  const runUndo = () => {
    const t = temporalStore.getState();
    if (t.pastStates.length === 0) return;
    t.undo();
    showToast({
      message: "Undone",
      duration: 2200,
      action: { label: "Redo", onClick: () => temporalStore.getState().redo() },
    });
  };
  const runRedo = () => {
    const t = temporalStore.getState();
    if (t.futureStates.length === 0) return;
    t.redo();
    showToast({
      message: "Redone",
      duration: 2200,
      action: { label: "Undo", onClick: () => temporalStore.getState().undo() },
    });
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        useMatchStore.getState().toggleDrawer();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        useSidebarStore.getState().toggleCollapsed();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        useResumeStore.getState().createVariant();
        useSidebarStore.getState().setCollapsed(false);
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
        className="relative z-30 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-ink-border bg-topbar px-3 shadow-topbar-t sm:px-4"
      >
        {/* LEFT — variant name + saved status */}
        <motion.div
          variants={rowFadeUp}
          className="flex min-w-0 items-center gap-2.5 justify-self-start"
        >
          <VariantName />
          <SavedStatus />
        </motion.div>

        {/* CENTER — undo / redo, hairline dividers on both sides */}
        <motion.div
          variants={rowFadeUp}
          className="flex items-center justify-self-center"
        >
          <span
            aria-hidden
            className="mx-2 hidden h-4 w-px bg-ink-border sm:block"
          />
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
              sound="tap"
              onClick={runUndo}
              disabled={!canUndo}
              aria-label="Undo"
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
              sound="tap"
              onClick={runRedo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Tooltip>
          <span
            aria-hidden
            className="mx-2 hidden h-4 w-px bg-ink-border sm:block"
          />
        </motion.div>

        {/* RIGHT — theme toggle · divider · ATS score · Export */}
        <motion.div
          variants={rowFadeUp}
          className="flex items-center gap-2 justify-self-end"
        >
          <ThemeToggle />
          <span
            aria-hidden
            className="mx-1 hidden h-4 w-px bg-ink-border sm:block"
          />
          <AtsScoreButton />
          <Button
            variant="primary"
            size="md"
            onClick={() => setExportOpen(true)}
            onMouseEnter={prefetchExport}
            onFocus={prefetchExport}
            aria-label="Export PDF"
            className="px-3"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">Export</span>
            <Kbd size="sm" tone="onPrimary" className="ml-1 hidden md:inline-flex">⌘E</Kbd>
          </Button>
        </motion.div>
      </motion.header>
      {exportOpen && (
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      )}
    </>
  );
}

// ── VariantName ────────────────────────────────────────────────────
// Click the label to rename the active variant inline. Enter commits,
// Esc reverts, blur commits. Rename writes through `renameVariant`.
function VariantName() {
  const currentId = useResumeStore((s) => s.currentVariantId);
  const label = useResumeStore(
    (s) => s.variantMeta[s.currentVariantId]?.label ?? "Untitled",
  );
  const renameVariant = useResumeStore((s) => s.renameVariant);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  useEffect(() => {
    setDraft(label);
  }, [label]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== label) renameVariant(currentId, next);
    else setDraft(label);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Resume variant name"
        className="h-6 min-w-0 max-w-[240px] rounded-md border border-[var(--input-focus-border)] bg-input px-1.5 text-[13px] font-medium text-ink-text shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className="min-w-0 max-w-[260px] truncate rounded-md px-1.5 py-0.5 text-left text-[13px] font-medium text-ink-text transition-colors duration-fast hover:bg-ink-hover"
    >
      {label}
    </button>
  );
}

// ── SavedStatus ────────────────────────────────────────────────────
// 5px colored dot + "Saved" / "Saving…" in muted text. Dot tint
// flips during the 280ms write debounce window. Localstorage writes
// are synchronous (zustand `persist`), so "Saving…" is a trust cue,
// not a real network state.
function SavedStatus() {
  const resume = useResumeStore((s) => s.resume);
  const [status, setStatus] = useState<"saving" | "saved">("saved");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(() => setStatus("saved"), 280);
    return () => clearTimeout(t);
  }, [resume]);

  return (
    <span
      className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-muted"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "h-[5px] w-[5px] rounded-full transition-colors duration-fast",
          status === "saved"
            ? "bg-[var(--ink-success)]"
            : "bg-[var(--ink-accent)]",
        )}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2, transition: { duration: 0.12 } }}
          transition={spring.snap}
        >
          {status === "saved" ? "Saved" : "Saving…"}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ── ThemeToggle ────────────────────────────────────────────────────
// Sun ↔ Moon icon crossfade (rotate + scale + opacity spring). The
// underlying swap plays a cinematic dawn/dusk audio sequence — see
// useThemeSwap for details. Silent on the button itself so the sound
// design owns the moment.
function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const swapTheme = useThemeSwap();
  return (
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
  );
}

// ── AtsScoreButton ──────────────────────────────────────────────────
// Live ATS score alongside the "ATS" label. JD is debounced 400ms so
// the algorithm doesn't fire on every keystroke in the drawer, but
// resume edits update the score immediately. Colour bands: >=80
// green · >=50 amber · else red.
function AtsScoreButton() {
  const resume = useResumeStore((s) => s.resume);
  const jd = useResumeStore(
    (s) => s.variantMeta[s.currentVariantId]?.jobDescription ?? "",
  );
  const toggleDrawer = useMatchStore((s) => s.toggleDrawer);
  const drawerOpen = useMatchStore((s) => s.drawerOpen);

  const [debouncedJd, setDebouncedJd] = useState(jd);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedJd(jd), 400);
    return () => clearTimeout(t);
  }, [jd]);

  const result = useMemo(
    () => matchCheck(resume, debouncedJd),
    [resume, debouncedJd],
  );
  const { score, hasJd } = result;

  // --warn-text is light-mode-only (reads dark-brown in dark mode,
  // where the score becomes invisible on the dark secondary button).
  // --ats-miss-text is defined in both themes.
  const scoreTone =
    score >= 80
      ? "text-[var(--ink-success)]"
      : score >= 50
        ? "text-[var(--ats-miss-text)]"
        : "text-[var(--ink-danger)]";

  return (
    <Button
      variant="secondary"
      size="md"
      sound={false}
      onClick={() => toggleDrawer()}
      aria-pressed={drawerOpen}
      aria-label={hasJd ? `ATS match ${score}%` : "Open ATS match check"}
      className="px-3"
    >
      <Target className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">ATS</span>
      {hasJd && (
        <span className={cn("ml-1 font-semibold tabular-nums", scoreTone)}>
          {score}%
        </span>
      )}
      <Kbd size="sm" className="ml-1 hidden md:inline-flex">⌘J</Kbd>
    </Button>
  );
}
