"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Mono-uppercase section label ──────────────────────────────────
// The `font-mono uppercase tracking-[0.08em]` label pattern that
// appears for "CONTACTS", "TITLE FONT", "THEME", "BULLETS", stat-card
// headers etc. Three sizes — use the smallest inside dialogs, the
// middle inside the editor, and the largest for top-level section
// titles if ever needed.
//
// Keeps tracking, weight, and tone consistent so labels across the
// whole app read as "the same vocabulary".

type Size = "xs" | "sm" | "md";
type Tone = "subtle" | "muted";

const SIZE_CLASS: Record<Size, string> = {
  xs: "text-[9.5px]",
  sm: "text-[10px]",
  md: "text-[11.5px]",
};

const TONE_CLASS: Record<Tone, string> = {
  subtle: "text-ink-subtle",
  muted: "text-ink-muted",
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  size?: Size;
  tone?: Tone;
  as?: "span" | "label" | "h4" | "h5";
};

export function SectionLabel({
  className,
  size = "sm",
  tone = "subtle",
  as: Comp = "span",
  ...rest
}: Props) {
  return (
    <Comp
      className={cn(
        "font-mono font-semibold uppercase tracking-[0.08em] leading-none",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
      {...rest}
    />
  );
}
