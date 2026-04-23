"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export const TooltipProvider = TooltipPrimitive.Provider;

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
};

/**
 * Tiny wrapper around Radix Tooltip — dark chip with a mono shortcut
 * hint on the right (optional, via string containing a `kbd:` suffix,
 * or a ReactNode for full control). Wrap icon-only buttons so their
 * aria-label also surfaces visually on hover.
 */
export function Tooltip({
  content,
  children,
  side = "bottom",
  align = "center",
  delay = 300,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipPrimitive.Root
      delayDuration={delay}
      open={open}
      onOpenChange={setOpen}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      {/* Radix's Slot (asChild) + AnimatePresence doesn't play nice —
          during the exit frame Slot can see zero/multiple children and
          throws "React.Children.only". Rendering the motion.div as a
          regular child (no asChild) sidesteps the Slot entirely; the
          tooltip chip is still a single element but Radix owns the
          positioner and we just animate the inner wrapper. */}
      <AnimatePresence>
        {open && (
          <TooltipPrimitive.Portal forceMount>
            <TooltipPrimitive.Content
              forceMount
              side={side}
              align={align}
              sideOffset={6}
              className="z-50"
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -2, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.1 } }}
                transition={spring.snap}
                className={cn(
                  "pointer-events-none flex items-center gap-1.5 rounded-md border border-ink-border bg-overlay px-2 py-1 text-[11px] font-medium text-ink-text",
                  "shadow-[0_2px_4px_var(--shadow-drop-close),0_8px_20px_-6px_var(--shadow-drop-far)]",
                )}
              >
                {content}
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </AnimatePresence>
    </TooltipPrimitive.Root>
  );
}

/** Small mono kbd chip for inline use inside Tooltip content. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      aria-hidden
      className="inline-flex h-[16px] items-center justify-center rounded-[4px] border border-ink-border bg-ink-surface px-1 font-mono text-[9.5px] font-semibold leading-none text-ink-muted"
    >
      {children}
    </kbd>
  );
}
