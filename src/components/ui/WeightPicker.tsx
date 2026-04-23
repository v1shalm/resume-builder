"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

const WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

type Props = {
  value: number;
  onChange: (w: number) => void;
  "aria-label": string;
};

export function WeightPicker({ value, onChange, ...rest }: Props) {
  const play = useSfx();
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "relative flex items-center rounded-lg border border-ink-border bg-input p-[3px]",
        "shadow-[inset_0_1px_2px_var(--shadow-drop-mid),inset_0_0_0_1px_var(--shadow-edge-dark)]",
      )}
    >
      {WEIGHTS.map((w) => {
        const isActive = value === w.value;
        return (
          <button
            key={w.value}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => {
              if (!isActive) play("select");
              onChange(w.value);
            }}
            className={cn(
              "relative z-10 flex-1 rounded-md px-2 py-[5px] text-[11.5px] transition-colors duration-base",
              isActive ? "text-ink-text" : "text-ink-muted hover:text-ink-text",
            )}
            style={{ fontWeight: w.value }}
          >
            {isActive && (
              <motion.span
                layoutId="weight-selector"
                transition={spring.soft}
                aria-hidden
                className={cn(
                  "absolute inset-0 -z-10 rounded-md border border-ink-border bg-card",
                  "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_1px_2px_var(--shadow-drop-close)]",
                )}
              />
            )}
            <span className="relative">{w.label}</span>
          </button>
        );
      })}
    </div>
  );
}
