"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { CharCount } from "@/components/ui/CharCount";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

// Opener verbs that start strong bullets. Ordered roughly by product-
// designer relevance — these come first in the chip row because Vishal
// will reach for them most. Keep the list short: a picker with 20 verbs
// is analysis paralysis; 10 is "pick and go."
const STARTER_VERBS = [
  "Led",
  "Shipped",
  "Designed",
  "Built",
  "Scaled",
  "Launched",
  "Improved",
  "Reduced",
  "Increased",
  "Owned",
] as const;

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  softMax?: number;
  minRows?: number;
  className?: string;
  "aria-label"?: string;
};

/**
 * A bullet textarea with two editorial affordances:
 *
 *   1. Starter verb chips — shown only when the bullet is EMPTY and
 *      FOCUSED. Click a verb to prepend it, preserving any partial
 *      draft. Disappear the moment typing starts or focus leaves.
 *   2. Soft character counter — fades in only after the writer has
 *      content to measure. Turns amber, then danger, as the sentence
 *      pushes past the editorial comfort zone (~160 chars / ~2 lines
 *      of resume body text).
 *
 * Both affordances sit below the field so they never crowd the writing
 * surface itself.
 */
export function BulletField({
  value,
  onChange,
  placeholder = "What you did, and the impact it had.",
  softMax = 160,
  minRows = 2,
  className,
  "aria-label": ariaLabel = "Bullet point",
}: Props) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const isEmpty = value.trim().length === 0;
  const showStarters = focused && isEmpty;

  const prependVerb = (verb: string) => {
    // Use a trailing space so the writer's cursor lands already-typing.
    onChange(`${verb} `);
    // Keep focus in the field.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
      }
    });
  };

  return (
    <div className={cn("flex flex-1 flex-col gap-1.5", className)}>
      <AutoTextarea
        ref={ref}
        aria-label={ariaLabel}
        minRows={minRows}
        className="min-h-[52px] border-transparent bg-transparent shadow-none hover:border-ink-border focus:shadow-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
      />
      {/*
        Reveal via grid-template-rows: 0fr → 1fr so the starter chip
        row animates by transform rather than by animating `height`.
        Content stays mounted so chip taps don't race the exit anim.
      */}
      <div
        aria-hidden={!showStarters}
        inert={!showStarters || undefined}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-fast ease-soft",
          showStarters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <SectionLabel size="sm" className="pr-1">Start with</SectionLabel>
            {STARTER_VERBS.map((verb) => (
              <motion.button
                key={verb}
                type="button"
                // Keep focus in the textarea by preventing the mousedown
                // from stealing it — chips act like "inline inserts."
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => prependVerb(verb)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.94 }}
                transition={spring.press}
                tabIndex={showStarters ? 0 : -1}
                className="rounded-md border border-ink-border bg-card px-2 py-0.5 text-[11px] text-ink-muted shadow-chip-t transition-colors duration-fast hover:border-ink-borderStrong hover:text-ink-text"
              >
                {verb}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      {!isEmpty && (
        <div className="flex justify-end">
          <CharCount value={value} softMax={softMax} />
        </div>
      )}
    </div>
  );
}
