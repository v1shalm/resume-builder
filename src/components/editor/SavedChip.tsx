"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useResumeStore } from "@/lib/store";
import { spring } from "@/lib/motion";

type Status = "saving" | "saved";

/**
 * Auto-save indicator. Zustand's persist middleware writes to
 * localStorage synchronously on every state change, so "saving" is
 * really just "acknowledging the change." This chip exists to
 * calibrate trust — without it, savvy users hit ⌘S out of habit,
 * nothing happens, and they grow anxious about whether edits stick.
 *
 * Lifecycle: always visible. Shows "Saving…" briefly during a typing
 * burst, then settles into "Saved · {relative time}" (e.g. "just now",
 * "2m ago", "1h ago"). The timestamp ticks once a minute so the chip
 * never goes stale.
 */
export function SavedChip() {
  const resume = useResumeStore((s) => s.resume);
  const [status, setStatus] = useState<Status>("saved");
  const [savedAt, setSavedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const toSaved = setTimeout(() => {
      setStatus("saved");
      setSavedAt(Date.now());
    }, 280);
    return () => clearTimeout(toSaved);
  }, [resume]);

  // Tick the relative time once a minute so "just now" rolls to "1m
  // ago" without the user having to edit anything.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none hidden h-5 min-w-[70px] items-center justify-end md:flex">
      <AnimatePresence mode="wait" initial={false}>
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
              <Check className="h-3 w-3 text-[var(--ink-success)]" aria-hidden />
              <span className="tabular-nums">
                Saved <span className="text-ink-subtle/70">· {formatAgo(now - savedAt)}</span>
              </span>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
