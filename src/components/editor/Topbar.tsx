"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { useResumeStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useSoundSettings } from "@/lib/soundSettings";
import { useSfx } from "@/lib/useSfx";
import { useThemeSwap } from "@/lib/useThemeSwap";
import { SavedChip } from "./SavedChip";

// `@react-pdf/renderer` is ~300 KB+ of PDF engine. Code-split the whole
// ExportDialog (which transitively pulls it in) so visitors who never
// export don't pay the cost. `loadExportDialog` is exposed so we can
// prefetch the chunk on hover/focus of the Export button — dynamic()
// caches the resolved module, so repeated calls are free.
const loadExportDialog = () =>
  import("./ExportDialog").then((m) => ({ default: m.ExportDialog }));
const ExportDialog = dynamic(loadExportDialog, { ssr: false });
import {
  Download,
  RotateCcw,
  FileJson,
  FileUp,
  Sun,
  Moon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { spring, stagger, rowFadeUp } from "@/lib/motion";

export function Topbar() {
  // Only the header name drives this bar's render. Everything else
  // (reset/importResume/resume-for-JSON-export) is read via `getState()`
  // inside the callbacks, so typing a bullet in the editor doesn't
  // re-render the whole topbar on every keystroke.
  const name = useResumeStore((s) => s.resume.header.name);
  const theme = useTheme((s) => s.theme);
  const swapTheme = useThemeSwap();
  const soundEnabled = useSoundSettings((s) => s.enabled);
  const toggleSound = useSoundSettings((s) => s.toggle);
  const play = useSfx();

  const [exportOpen, setExportOpen] = useState(false);

  // Prefetch the lazy ExportDialog chunk. Called on hover/focus of the
  // Export button AND when the ⌘E shortcut is observed, so the dialog
  // mount is instant in practice.
  const prefetchExport = useCallback(() => {
    void loadExportDialog();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        // Kick the chunk load in parallel with the state flip so the
        // dialog shows up as soon as the chunk arrives.
        prefetchExport();
        setExportOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefetchExport]);

  const downloadJSON = () => {
    const resume = useResumeStore.getState().resume;
    const blob = new Blob([JSON.stringify(resume, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resume.header.name.replace(/\s+/g, "_")}_resume.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          useResumeStore.getState().importResume(data);
        } catch {
          alert("Couldn't read that file. Make sure it's a JSON saved from this builder.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    if (
      confirm(
        "Reset to the starter resume?\n\nYour current edits will be replaced and can't be recovered. Save a JSON backup first if you want to keep them.",
      )
    ) {
      useResumeStore.getState().reset();
    }
  };

  return (
    <>
      <motion.header
        variants={stagger(0.045, 0.06)}
        initial="hidden"
        animate="show"
        className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-ink-border bg-topbar px-3 shadow-topbar-t sm:px-4 md:px-5"
      >
        <motion.div variants={rowFadeUp} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <motion.div
            variants={rowFadeUp}
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={spring.snap}
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-ink-border bg-gradient-to-b from-ink-raised to-ink-surface shadow-raised-t"
            aria-hidden
          >
            <span className="text-[12px] font-semibold text-ink-text">R</span>
          </motion.div>
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h1 className="truncate text-[14px] font-semibold tracking-tight text-ink-text">
              <span className="hidden sm:inline">Resume Builder</span>
              <span className="sm:hidden">Resume</span>
            </h1>
            <span className="hidden truncate text-[12px] text-ink-subtle md:inline">
              {name || "—"}
            </span>
          </div>
          <SavedChip />
        </motion.div>
        <motion.div variants={rowFadeUp} className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Import — icon-only on narrow, icon+label from md */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={uploadJSON}
            aria-label="Import JSON"
          >
            <FileUp className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="hidden md:inline-flex"
            onClick={uploadJSON}
          >
            <FileUp className="h-3.5 w-3.5" aria-hidden />
            <span>Import</span>
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="hidden lg:inline-flex"
            onClick={downloadJSON}
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden />
            <span>Save JSON</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            aria-label="Reset to seeded resume"
            className="hidden sm:inline-flex"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            sound={false}
            onClick={() => {
              // Play the "off" cue *before* flipping so the user gets one
              // last piece of audible feedback at the moment they mute.
              // When flipping back on, the next interaction will be the
              // confirmation — simpler than fighting the provider's
              // re-render timing.
              if (soundEnabled) play("toggleOff");
              toggleSound();
            }}
            aria-label={soundEnabled ? "Mute interface sounds" : "Unmute interface sounds"}
            aria-pressed={!soundEnabled}
          >
            <AnimatePresence mode="wait" initial={false}>
              {soundEnabled ? (
                <motion.span
                  key="volume-on"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={spring.snap}
                  className="flex"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden />
                </motion.span>
              ) : (
                <motion.span
                  key="volume-off"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={spring.snap}
                  className="flex"
                >
                  <VolumeX className="h-3.5 w-3.5" aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
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
          <div className="mx-1 hidden h-5 w-px bg-ink-border sm:mx-1.5 sm:block" aria-hidden />
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
