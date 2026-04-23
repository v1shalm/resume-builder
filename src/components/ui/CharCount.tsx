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
  // Stay calm for the whole usable range. Amber only kicks in in the
  // last 5% (a genuine "you're near the cap" signal, not a nag), and
  // red is reserved for past-the-cap. Previously amber started at 85%
  // which read as alarming for a tagline at 90% of its budget — most
  // writers work in that band intentionally.
  const state: "ok" | "near" | "over" =
    ratio > 1 ? "over" : ratio >= 0.95 ? "near" : "ok";

  if (len === 0) return null;

  const base =
    "font-mono tabular-nums text-[10px] leading-none tracking-[0.04em]";
  const color =
    state === "over"
      ? "text-ink-danger"
      : state === "near"
        ? "text-[oklch(0.75_0.11_85)]"
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
