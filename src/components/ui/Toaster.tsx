"use client";

import { AnimatePresence, motion } from "motion/react";
import { useToastStore } from "@/lib/toast";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/**
 * Global toast surface. One toast at a time, bottom-centre, tool-quiet.
 * Mount this once at the app root — it reads from `useToastStore`.
 */
export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 z-[70] flex items-end justify-center px-4 sm:bottom-8"
      style={{ bottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 14, filter: "blur(8px)", scale: 0.96 }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
            exit={{
              opacity: 0,
              y: 8,
              filter: "blur(6px)",
              scale: 0.97,
              transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
            }}
            transition={spring.soft}
            role="status"
            className={cn(
              "pointer-events-auto flex max-w-[min(440px,calc(100vw-2rem))] items-center gap-2.5 rounded-full border border-ink-border bg-overlay py-1.5 pl-4 pr-1.5 shadow-overlay-t",
            )}
          >
            <span className="flex-1 truncate text-[12.5px] text-ink-text">
              {toast.message}
            </span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss();
                }}
                className="h-7 shrink-0 rounded-full border border-ink-border bg-card px-3 text-[12px] font-medium text-ink-text shadow-raised-t transition-colors duration-fast hover:bg-ink-hover"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss notification"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
