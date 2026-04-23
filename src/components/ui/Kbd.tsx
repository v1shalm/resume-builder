"use client";

import * as React from "react";
import type { LucideProps } from "lucide-react";
import { Command as CommandIcon, ArrowBigUp, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Single source of truth for keyboard chips ──────────────────────
// Four sizes, three tones. Replaces:
//   · Tooltip.tsx's Kbd (now a thin re-export)
//   · Topbar's ⌘K / ⌘E chips
//   · CommandPalette's RowKbd / FooterKbd
//
// Why: the previous 5 implementations drifted on size, padding, char
// alignment, and colour. Consolidating also lets us render ⌘-class
// glyphs as SVG icons (precise size control; no font-metric drift
// vs the Latin letter next to them).

type KbdSize = "xs" | "sm" | "md" | "lg";
type KbdTone = "muted" | "onPrimary" | "active";

type Props = {
  /** String like "⌘K", "⌘⇧Z", "↵". Each character laid out in its own
   *  slot so SVG modifier glyphs can replace the raw Unicode char. */
  children: string;
  size?: KbdSize;
  /** Colour treatment. `onPrimary` is for kbds sitting inside the
   *  amber CTA; `active` is for highlighted command-palette rows. */
  tone?: KbdTone;
  className?: string;
};

// Map of modifier / arrow glyphs to an SVG renderer. Everything else
// falls through as raw text (rendered in the monospace chip font).
const GLYPH_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  "⌘": CommandIcon,
  "⇧": ArrowBigUp,
  "↑": ArrowUp,
  "↓": ArrowDown,
  "↵": CornerDownLeft,
};

// Size → { height, padding, text, gap, icon }
const SIZE_STYLES: Record<KbdSize, { root: string; iconPx: number; strokeWidth: number }> = {
  xs: { root: "h-[18px] gap-[2px] rounded-[4px] px-1.5 text-[9.5px]", iconPx: 8,  strokeWidth: 2.5 },
  sm: { root: "h-5   gap-[3px] rounded-[5px] px-[7px] text-[10px]",    iconPx: 9,  strokeWidth: 2.5 },
  md: { root: "h-[22px] gap-[3px] rounded-[6px] px-2 text-[11px]",     iconPx: 11, strokeWidth: 2.25 },
  lg: { root: "h-6   gap-1    rounded-[6px] px-2.5 text-[12px]",       iconPx: 12, strokeWidth: 2 },
};

const TONE_STYLES: Record<KbdTone, string> = {
  muted:
    "border border-ink-border bg-ink-surface text-ink-muted",
  onPrimary:
    "border border-[var(--kbd-border)] bg-[var(--kbd-bg)] text-[var(--kbd-text)]",
  active:
    "border border-[oklch(0.55_0.12_75_/_0.45)] bg-[oklch(0.855_0.165_85_/_0.12)] text-[oklch(0.4_0.12_75)]",
};

export function Kbd({ children, size = "sm", tone = "muted", className }: Props) {
  const chars = Array.from(children);
  const { root, iconPx, strokeWidth } = SIZE_STYLES[size];

  return (
    <kbd
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-mono font-semibold leading-none",
        root,
        TONE_STYLES[tone],
        className,
      )}
    >
      {chars.map((c, i) => {
        const Icon = GLYPH_ICONS[c];
        if (Icon) {
          return (
            <Icon
              key={i}
              className="shrink-0"
              strokeWidth={strokeWidth}
              aria-hidden
              style={{ width: iconPx, height: iconPx }}
            />
          );
        }
        return (
          <span key={i} className="leading-none">
            {c}
          </span>
        );
      })}
    </kbd>
  );
}
