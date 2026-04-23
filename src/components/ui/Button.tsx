"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";
import type { SoundName } from "@/lib/sfx";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background,border,color,box-shadow] duration-fast disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        primary: [
          "text-ink-accentText font-semibold",
          "bg-[linear-gradient(180deg,oklch(0.895_0.158_85)_0%,oklch(0.855_0.165_85)_50%,oklch(0.815_0.172_82)_100%)]",
          "shadow-[inset_0_1px_0_oklch(1_0_0_/_0.35),inset_0_-1px_0_oklch(0.4_0.08_70_/_0.2),0_0_0_1px_oklch(0.55_0.12_75_/_0.35),0_1px_2px_oklch(0_0_0_/_0.4)]",
          "hover:bg-[linear-gradient(180deg,oklch(0.915_0.158_85)_0%,oklch(0.875_0.165_85)_50%,oklch(0.835_0.172_82)_100%)]",
          "hover:shadow-[inset_0_1px_0_oklch(1_0_0_/_0.4),inset_0_-1px_0_oklch(0.4_0.08_70_/_0.2),0_0_0_1px_oklch(0.55_0.12_75_/_0.4),0_3px_8px_-2px_oklch(0_0_0_/_0.5)]",
        ].join(" "),
        secondary:
          "bg-ink-raised text-ink-text border border-ink-border hover:bg-ink-hover hover:border-ink-borderStrong",
        ghost:
          "bg-transparent text-ink-muted hover:bg-ink-hover hover:text-ink-text",
        outline:
          "bg-transparent border border-ink-border text-ink-text hover:bg-ink-hover hover:border-ink-borderStrong",
        danger:
          "bg-transparent text-ink-danger hover:bg-ink-hoverDanger",
      },
      size: {
        sm: "h-8 px-3 text-[12.5px]",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-10 px-4 text-[13px]",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type MotionButtonProps = Omit<HTMLMotionProps<"button">, "children" | "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag">;

export interface ButtonProps
  extends MotionButtonProps,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children?: React.ReactNode;
  /**
   * Sound played on press. Pass `false` to suppress. Defaults to `"click"`
   * for primary buttons and `"tap"` for everything else.
   */
  sound?: SoundName | false;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, onClick, sound, ...props }, ref) => {
    const play = useSfx();
    const resolvedSound: SoundName | false =
      sound === undefined ? (variant === "primary" ? "click" : "tap") : sound;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (resolvedSound) play(resolvedSound);
      onClick?.(e);
    };

    if (asChild) {
      return (
        <Slot
          ref={ref as unknown as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size, className }))}
          onClick={handleClick as unknown as React.MouseEventHandler<HTMLElement>}
          {...(props as unknown as React.HTMLAttributes<HTMLElement>)}
        />
      );
    }
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97, y: 0.5 }}
        transition={spring.press}
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
