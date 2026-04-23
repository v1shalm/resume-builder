"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { THEMES } from "@/lib/themes";
import { useSfx } from "@/lib/useSfx";

type Props = {
  value: string; // theme id
  onChange: (themeId: string, accent: string, sub: string) => void;
  "aria-label": string;
};

export function ThemePicker({ value, onChange, ...rest }: Props) {
  const play = useSfx();
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className="grid grid-cols-4 gap-2"
    >
      {THEMES.map((t) => {
        const isActive = t.id === value;
        return (
          <motion.button
            key={t.id}
            role="radio"
            aria-checked={isActive}
            aria-label={t.name}
            type="button"
            whileHover={{ y: -1, scale: 1.03 }}
            whileTap={{ scale: 0.94, y: 0.5 }}
            transition={spring.press}
            onClick={() => {
              if (!isActive) play("select");
              onChange(t.id, t.accent, t.sub);
            }}
            className={cn(
              "group flex flex-col items-stretch gap-0 overflow-hidden rounded-[10px]",
              "transition-[box-shadow] duration-fast",
              isActive
                ? "shadow-[0_0_0_2px_oklch(0.855_0.165_85),0_0_0_3.5px_var(--ink-bg),0_0_12px_-2px_oklch(0.855_0.165_85_/_0.45)]"
                : "shadow-none",
            )}
          >
            <div
              className="relative h-10 w-full"
              style={{
                background: t.accent,
                boxShadow: [
                  "inset 0 0 0 2px rgba(255,255,255,0.32)",
                  "inset 0 1.5px 0 rgba(255,255,255,0.45)",
                  "inset 0 -1.5px 0 rgba(0,0,0,0.28)",
                  "0 0 0 1px var(--ink-border)",
                ].join(", "),
              }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check
                    className="h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                    style={{ color: "white" }}
                    aria-hidden
                  />
                </span>
              )}
            </div>
            <div
              className="h-5 w-full"
              style={{
                background: t.sub,
                boxShadow: [
                  "inset 0 0 0 2px rgba(255,255,255,0.28)",
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                  "0 0 0 1px var(--ink-border)",
                ].join(", "),
              }}
            />
            <span
              className={cn(
                "px-2 pb-1.5 pt-1 text-center text-[10.5px] font-medium",
                isActive ? "text-ink-text" : "text-ink-muted group-hover:text-ink-text",
              )}
            >
              {t.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
