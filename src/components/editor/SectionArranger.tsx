"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useResumeStore } from "@/lib/store";
import type { SectionKind } from "@/lib/types";
import { SortableList, DragHandle } from "./SortableList";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

export function SectionArranger() {
  const order = useResumeStore((s) => s.resume.sectionOrder);
  const sections = useResumeStore((s) => s.resume.sections);
  const reorder = useResumeStore((s) => s.reorderSections);
  const toggle = useResumeStore((s) => s.toggleSectionVisibility);

  const [open, setOpen] = useState(false);
  const items = order.map((id) => sections[id]);
  const play = useSfx();

  return (
    <div className="shrink-0 border-t border-ink-border bg-arranger shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark)]">
      <button
        onClick={() => {
          play(open ? "close" : "open");
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls="section-arranger-body"
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors duration-fast hover:bg-ink-hover"
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[12.5px] font-medium text-ink-text">
            Arrange sections
          </span>
          <span className="text-[11.5px] text-ink-subtle">
            {order.map((o) => sections[o].title).join(" · ")}
          </span>
        </div>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring.snap}
          className="flex"
        >
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="section-arranger-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: spring.soft,
              opacity: { duration: 0.18 },
            }}
            className="overflow-hidden border-t border-ink-border"
          >
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
                      onClick={() => {
                        play(item.visible ? "toggleOff" : "toggleOn");
                        toggle(item.id);
                      }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
