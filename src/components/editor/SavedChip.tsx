"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useResumeStore } from "@/lib/store";
import { spring } from "@/lib/motion";

type Status = "idle" | "saving" | "saved";

/**
 * Auto-save indicator. Zustand's persist middleware writes to
 * localStorage synchronously on every state change, so "saving" is
 * really just "acknowledging the change." This chip exists to
 * calibrate trust — without it, savvy users hit ⌘S out of habit,
 * nothing happens, and they grow anxious about whether edits stick.
 *
 * Lifecycle: resume changes → "Saving…" for ~300ms → "Saved ✓" for
 * ~2s → fades to idle (hidden). Rendered as its own component so its
 * subscription doesn't re-render the whole Topbar on every keystroke.
 */
export function SavedChip() {
  const resume = useResumeStore((s) => s.resume);
  const [status, setStatus] = useState<Status>("idle");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const toSaved = setTimeout(() => setStatus("saved"), 280);
    const toIdle = setTimeout(() => setStatus("idle"), 2400);
    return () => {
      clearTimeout(toSaved);
      clearTimeout(toIdle);
    };
  }, [resume]);

  return (
    <div className="pointer-events-none hidden h-5 min-w-[58px] items-center justify-end md:flex">
      <AnimatePresence mode="wait" initial={false}>
        {status !== "idle" && (
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3, transition: { duration: 0.12 } }}
            transition={spring.snap}
            className="inline-flex items-center gap-1 text-[11px] text-ink-subtle"
            aria-live="polite"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                <span>Saving</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3" aria-hidden />
                <span>Saved</span>
              </>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
