"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

const PRESETS = [
  { id: "navy", hex: "#23316d", label: "Navy" },
  { id: "indigo", hex: "#3b3f99", label: "Indigo" },
  { id: "ink", hex: "#1a1c24", label: "Ink" },
  { id: "slate", hex: "#3a4250", label: "Slate" },
  { id: "teal", hex: "#1f5e5e", label: "Teal" },
  { id: "forest", hex: "#2a4b2f", label: "Forest" },
  { id: "oxblood", hex: "#6e2832", label: "Oxblood" },
  { id: "brick", hex: "#9a3a20", label: "Brick" },
  { id: "ochre", hex: "#8a6520", label: "Ochre" },
  { id: "plum", hex: "#5a2a58", label: "Plum" },
  { id: "black", hex: "#0e0f13", label: "Black" },
  { id: "cobalt", hex: "#1d4ed8", label: "Cobalt" },
];

type Props = {
  value: string;
  onChange: (hex: string) => void;
  "aria-label": string;
};

export function ColorPicker({ value, onChange, ...rest }: Props) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const play = useSfx();

  const isValidHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s);

  return (
    <DropdownMenu.Root onOpenChange={(o) => play(o ? "dropdownOpen" : "dropdownClose")}>
      <DropdownMenu.Trigger
        aria-label={rest["aria-label"]}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-ink-border bg-card px-3 text-left text-[13px] text-ink-text shadow-raised-t",
          "transition-colors duration-fast hover:border-ink-borderStrong",
          "focus:outline-none data-[state=open]:border-ink-borderStrong",
        )}
      >
        <span className="flex items-center gap-2.5">
          <Swatch hex={value} size="sm" />
          <span className="tabular-nums">{value.toUpperCase()}</span>
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[260px] rounded-xl border border-ink-border bg-overlay p-3 shadow-overlay-t",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
          <div className="mb-2 text-[10.5px] uppercase tracking-[0.08em] text-ink-subtle">
            Presets
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PRESETS.map((p) => {
              const isActive = value.toLowerCase() === p.hex.toLowerCase();
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  aria-label={p.label}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!isActive) play("select");
                    onChange(p.hex);
                  }}
                  whileHover={{ y: -1, scale: 1.04 }}
                  whileTap={{ scale: 0.92, y: 0.5 }}
                  transition={spring.press}
                  className="rounded-[9px] focus-visible:outline-offset-[3px]"
                >
                  <Swatch hex={p.hex} active={isActive} />
                </motion.button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-ink-border pt-3">
            <label
              htmlFor="custom-hex-native"
              className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[9px]"
              aria-label="Pick custom color"
            >
              <Swatch hex={value} size="md" />
              <input
                id="custom-hex-native"
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Custom color"
              />
            </label>
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                setDraft(v);
                if (isValidHex(v)) onChange(v);
              }}
              onBlur={() => {
                if (!isValidHex(draft)) setDraft(value);
              }}
              className={cn(
                "h-9 flex-1 rounded-lg border border-[var(--input-border)] bg-input px-3 text-[13px] tabular-nums text-ink-text shadow-well-t",
                "transition-[border-color,box-shadow] duration-fast hover:border-ink-borderStrong",
                "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)] focus:outline-none",
              )}
              placeholder="#000000"
              aria-label="Hex value"
            />
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Color swatch with primary-CTA depth treatment: per-swatch gradient overlay
// for top→bottom lightness, inset highlight + inset bottom darkening, 1px
// dark ring, and a drop shadow so the swatch reads as a button, not a dot.
function Swatch({
  hex,
  active,
  size = "base",
}: {
  hex: string;
  active?: boolean;
  size?: "sm" | "base" | "md";
}) {
  const sizeCls =
    size === "sm" ? "h-5 w-5 rounded-[6px]" : size === "md" ? "h-9 w-9 rounded-[9px]" : "h-8 w-8 rounded-[9px]";

  return (
    <span
      className={cn("relative block overflow-hidden", sizeCls)}
      style={{
        background: hex,
        boxShadow: [
          // Thick solid white chip border — the signature "Figma-swatch" look:
          // a 3px white ring frames the colored fill so it always reads as a
          // chip sitting on the panel, in both light and dark themes.
          "inset 0 0 0 3px #ffffff",
          // Thin dark separator between the white ring and the colored fill —
          // prevents the white from washing into lighter swatches.
          "inset 0 0 0 4px rgba(0,0,0,0.12)",
          // Subtle top highlight on the color fill itself
          "inset 0 4px 0 -3px rgba(255,255,255,0.35)",
          // Outer hairline ring — theme-aware so no dark halo in light mode
          "0 0 0 1px var(--ink-border)",
          // Drop shadows — tokenized, subtle in light, stronger in dark
          "0 1px 2px var(--shadow-drop-mid)",
          "0 3px 8px -2px var(--shadow-drop-close)",
        ].join(", "),
      }}
    >
      {/* Gloss gradient overlay — simulates top→bottom lightness shift */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      {active && size !== "sm" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Check
            className="h-4 w-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
            style={{ color: "white" }}
          />
        </span>
      )}
      {active && size !== "sm" && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[3px] rounded-[12px]"
          style={{
            boxShadow:
              "0 0 0 2px oklch(0.855 0.165 85), 0 0 0 3.5px oklch(0.14 0.004 250), 0 0 16px -2px oklch(0.855 0.165 85 / 0.55)",
          }}
        />
      )}
    </span>
  );
}
