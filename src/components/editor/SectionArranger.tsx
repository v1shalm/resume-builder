"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useResumeStore } from "@/lib/store";
import type { SectionKind } from "@/lib/types";
import { SortableList, DragHandle } from "./SortableList";
import { ChevronDown, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

// Collapsible body uses grid-template-rows: 0fr → 1fr so the reveal
// animates via transform rather than by animating `height` (which
// forces layout on every frame). Content stays mounted so the
// SortableList doesn't re-init on each open.

export function SectionArranger() {
  const order = useResumeStore((s) => s.resume.sectionOrder);
  const sections = useResumeStore((s) => s.resume.sections);
  const reorder = useResumeStore((s) => s.reorderSections);
  const toggle = useResumeStore((s) => s.toggleSectionVisibility);

  const [open, setOpen] = useState(false);
  // Experience is pinned to the left column in the resume layout
  // (ResumePreview owns the grid), so reordering it has no visible
  // effect and toggling its visibility collapses the whole paper.
  // Hide it from the arranger so the list shows only what's actually
  // rearrangeable — Education / Skills / Links.
  const items = order
    .filter((id) => id !== "experience")
    .map((id) => sections[id]);

  return (
    <div className="shrink-0 border-t border-ink-border bg-arranger shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="section-arranger-body"
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-fast hover:bg-ink-hover"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-border bg-card text-ink-muted shadow-raised-t"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="text-[12.5px] font-medium text-ink-text">
            Arrange sections
          </span>
          <span className="truncate text-[11.5px] text-ink-subtle">
            Drag to reorder · show / hide — {items.length} sections
          </span>
        </div>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring.snap}
          className="flex shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        </motion.span>
      </button>

      <div
        id="section-arranger-body"
        aria-hidden={!open}
        inert={!open || undefined}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-slow ease-soft",
          open
            ? "grid-rows-[1fr] border-t border-ink-border opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="px-5 py-4">
            <SortableList<{ id: SectionKind; title: string; visible: boolean }>
              items={items.map((i) => ({ id: i.id, title: i.title, visible: i.visible }))}
              onReorder={(from, to) => reorder(from as SectionKind, to as SectionKind)}
              renderItem={(item, { dragAttrs, dragListeners }) => (
                <div className="group flex items-center gap-2 rounded-lg border border-ink-border bg-card p-2 shadow-raised-t">
                  <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
                  <span
                    className={cn(
                      "flex-1 text-[13px] capitalize",
                      item.visible ? "text-ink-text" : "text-ink-subtle line-through",
                    )}
                  >
                    {item.title}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    transition={spring.press}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-fast",
                      item.visible
                        ? "text-ink-muted hover:bg-ink-hover hover:text-ink-text"
                        : "text-ink-danger hover:bg-ink-hoverDanger",
                    )}
                    aria-pressed={!item.visible}
                    aria-label={item.visible ? `Hide ${item.title}` : `Show ${item.title}`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {item.visible ? (
                        <motion.span
                          key="eye"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={spring.press}
                          className="flex"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="eye-off"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={spring.press}
                          className="flex"
                        >
                          <EyeOff className="h-3.5 w-3.5" aria-hidden />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
