"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: string;
  softMax: number;
  /** Show as a small chip (for bullets inside lists) or a plain inline counter. */
  variant?: "inline" | "chip";
  className?: string;
};

/**
 * Lightweight character counter for fields that have an editorial soft
 * cap (tagline, title, bullet). Stays muted until the value approaches
 * the cap, then warms to amber, then switches to danger past it.
 *
 * We don't enforce the cap — resumes are weird, and the writer may
 * deliberately push a long sentence. This is a hint, not a gate.
 */
export function CharCount({ value, softMax, variant = "inline", className }: Props) {
  const len = value.length;
  const ratio = len / softMax;
  const state: "ok" | "near" | "over" =
    ratio >= 1 ? "over" : ratio >= 0.85 ? "near" : "ok";

  if (len === 0) return null;

  const base =
    "font-mono tabular-nums text-[10px] leading-none tracking-[0.04em]";
  const color =
    state === "over"
      ? "text-ink-danger"
      : state === "near"
        ? "text-[oklch(0.7_0.14_75)]"
        : "text-ink-subtle";

  if (variant === "chip") {
    return (
      <span
        aria-hidden
        className={cn(
          base,
          color,
          "rounded-sm px-1 py-0.5 bg-ink-surface/40",
          className,
        )}
      >
        {len}/{softMax}
      </span>
    );
  }

  return (
    <span aria-hidden className={cn(base, color, className)}>
      {len}/{softMax}
    </span>
  );
}
