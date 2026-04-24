"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Section label ──────────────────────────────────────────────────
// Sentence-case micro-label for "Contacts", "Title font", "Theme",
// "Bullets", stat-card headers etc. Three sizes — use the smallest
// inside dialogs, the middle inside the editor, and the largest for
// top-level section titles if ever needed.
//
// Keeps weight and tone consistent so labels across the whole app
// read as "the same vocabulary". Linear/Raycast-adjacent typographic
// voice: no uppercase, no tracking, no mono.

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
        "font-medium leading-none",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
      {...rest}
    />
  );
}
