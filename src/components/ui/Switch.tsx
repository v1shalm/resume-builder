"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useSfx } from "@/lib/useSfx";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const play = useSfx();
  const handleChange = (v: boolean) => {
    play(v ? "toggleOn" : "toggleOff");
    onCheckedChange?.(v);
  };
  return (
    <SwitchPrimitive.Root
      ref={ref}
      onCheckedChange={handleChange}
      className={cn(
        // Off state — recessed well
        "peer relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-ink-border bg-input transition-colors duration-base",
        "shadow-[inset_0_1px_2px_var(--shadow-drop-mid),inset_0_-1px_0_var(--shadow-highlight)]",
        // On state — yellow CTA: same 3-stop gradient, inset top highlight, hairline ring, outer drop shadow
        "data-[state=checked]:border-[oklch(0.55_0.12_75_/_0.55)]",
        "data-[state=checked]:bg-[linear-gradient(180deg,oklch(0.895_0.158_85)_0%,oklch(0.855_0.165_85)_50%,oklch(0.815_0.172_82)_100%)]",
        "data-[state=checked]:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.38),inset_0_-1px_0_oklch(0.4_0.08_70_/_0.25),0_0_0_1px_oklch(0.55_0.12_75_/_0.35),0_1px_3px_-1px_oklch(0_0_0_/_0.45),0_0_12px_-2px_oklch(0.855_0.165_85_/_0.35)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none relative block h-[16px] w-[16px] rounded-full transition-transform duration-base ease-soft",
          // Thumb off — light graphite orb, inset highlight + outer drop shadow
          "translate-x-[3px]",
          "bg-[linear-gradient(180deg,oklch(0.88_0.005_250)_0%,oklch(0.74_0.005_250)_100%)]",
          "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.55),inset_0_-1px_0_oklch(0_0_0_/_0.2),0_1px_2px_oklch(0_0_0_/_0.45),0_0_0_0.5px_oklch(0_0_0_/_0.35)]",
          // Thumb on — dark orb on yellow, crisp edge + inner highlight
          "data-[state=checked]:translate-x-[19px]",
          "data-[state=checked]:bg-[linear-gradient(180deg,oklch(0.24_0.02_75)_0%,oklch(0.14_0.02_75)_100%)]",
          "data-[state=checked]:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.18),inset_0_-1px_0_oklch(0_0_0_/_0.4),0_1px_2px_oklch(0_0_0_/_0.55),0_0_0_0.5px_oklch(0.25_0.04_75_/_0.8)]",
        )}
      />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = "Switch";
