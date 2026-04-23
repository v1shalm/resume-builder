"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
import { useSfx } from "@/lib/useSfx";

const TICK_COUNT = 11;
// Thumb is smaller than the track so there's a clear "pocket" of pill color
// around it on every side. FILL_EXTEND_PX is the distance past the thumb
// CENTER where the fill ends — sized so the right pocket (5px) matches the
// top/bottom pocket created by (TRACK_H - THUMB_SIZE_PX) / 2 = (26 - 16) / 2.
//   right pocket = FILL_EXTEND_PX - THUMB_SIZE_PX / 2 = 13 - 8 = 5
const THUMB_SIZE_PX = 16;
const FILL_EXTEND_PX = 13;

type Props = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>;

// Slider with a physical "bar" fill (not a painted gradient stop) so the
// trailing edge is an actual rounded pill that wraps around the white thumb.
// The fill extends past the thumb's center by THUMB_HALF_PX so the thumb
// sits fully inside the yellow.

export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  Props
>(({ className, value, defaultValue, min = 0, max = 100, onValueChange, onValueCommit, ...props }, ref) => {
  const raw = value ?? defaultValue ?? [min];
  const v = raw[0] ?? min;
  const pct = max === min ? 0 : ((v - min) / (max - min)) * 100;

  const play = useSfx();
  // Track the last value we ticked for so holding still is silent.
  const lastTickedRef = React.useRef<number>(v);

  const handleValueChange = (next: number[]) => {
    const n = next[0];
    if (n !== undefined && n !== lastTickedRef.current) {
      lastTickedRef.current = n;
      // ±80 cents of random detune keeps a fast drag from sounding like
      // a single pitched drone. Cheap, effective.
      play("sliderTick", { detune: (Math.random() - 0.5) * 160 });
    }
    onValueChange?.(next);
  };

  const handleValueCommit = (next: number[]) => {
    play("tap");
    onValueCommit?.(next);
  };

  // Theme-aware via CSS vars; dots and base swap with light/dark mode.
  const DOTS_BG = `radial-gradient(circle at center, var(--slider-tick) 1.5px, transparent 2px)`;
  const BASE_BG = `linear-gradient(180deg, var(--grad-input-top) 0%, var(--grad-input-bot) 100%)`;

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      className={cn(
        "relative flex h-8 w-full touch-none select-none items-center",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-[26px] w-full grow overflow-hidden rounded-full border border-ink-border",
          "shadow-[inset_0_1px_2px_var(--shadow-drop-mid),inset_0_-1px_0_var(--shadow-highlight)]",
        )}
        style={{
          backgroundImage: `${DOTS_BG}, ${BASE_BG}`,
          backgroundSize: `${100 / (TICK_COUNT - 1)}% 100%, 100% 100%`,
          backgroundPosition: `${100 / (TICK_COUNT - 1) / 2}% center, 0 0`,
          backgroundRepeat: `repeat-x, no-repeat`,
        }}
      >
        {/* Yellow fill — a real rounded pill that extends THUMB_HALF_PX past
            the thumb center. Capped with maxWidth so the right-side rounded
            corner is ALWAYS visible (never clipped by Track's right edge),
            leaving a sliver of track beyond the fill at all values. */}
        <div
          aria-hidden
          className={cn(
            "absolute left-0 top-0 h-full rounded-full",
            "bg-[linear-gradient(90deg,oklch(0.93_0.155_85)_0%,oklch(0.86_0.165_83)_55%,oklch(0.78_0.175_68)_100%)]",
            "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.38),inset_0_-1px_0_oklch(0.4_0.1_70_/_0.3),0_0_0_0.5px_oklch(0.55_0.12_75_/_0.55)]",
          )}
          style={{
            width: `min(calc(${pct}% + ${FILL_EXTEND_PX}px), calc(100% - 3px))`,
            minWidth: `${FILL_EXTEND_PX * 2}px`,
          }}
        />
      </SliderPrimitive.Track>

      <SliderPrimitive.Thumb
        style={{ height: THUMB_SIZE_PX, width: THUMB_SIZE_PX }}
        className={cn(
          "relative block rounded-full",
          // Base white orb
          "bg-[linear-gradient(180deg,oklch(0.995_0.002_85)_0%,oklch(0.955_0.005_85)_100%)]",
          // Layered shadow stack:
          //   inset top highlight   — top glow
          //   inset full white ring — thicker 2px perimeter stroke (NEW)
          //   inset bottom shadow   — foot of the orb
          //   amber hairline outer  — contact with the yellow fill
          //   drop shadows          — lift above the track
          "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.9),inset_0_0_0_2px_oklch(1_0_0_/_0.55),inset_0_-1.5px_0_oklch(0.7_0.01_85_/_0.3),0_0_0_1px_oklch(0.4_0.08_75_/_0.55),0_1.5px_3px_oklch(0_0_0_/_0.5),0_2px_6px_-2px_oklch(0_0_0_/_0.35)]",
          "transition-transform duration-fast",
          "hover:scale-[1.08]",
          "focus-visible:outline-none focus-visible:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.9),inset_0_0_0_2px_oklch(1_0_0_/_0.55),inset_0_-1.5px_0_oklch(0.7_0.01_85_/_0.3),0_0_0_1px_oklch(0.4_0.08_75_/_0.65),0_0_0_4px_oklch(0.855_0.165_85_/_0.3),0_1.5px_3px_oklch(0_0_0_/_0.5)]",
          "active:scale-95",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = "Slider";
