"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
};

export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ className, minRows = 2, onInput, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "0px";
      el.style.height = el.scrollHeight + "px";
    }, []);

    React.useLayoutEffect(() => {
      resize();
    }, [value, resize]);

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        className={cn(
          "flex w-full rounded-lg border border-[var(--input-border)] bg-input px-3 py-2.5 text-[13.5px] leading-[1.6] text-ink-text shadow-well-t",
          "placeholder:text-ink-subtle",
          "transition-[border-color,box-shadow] duration-fast",
          "hover:border-ink-borderStrong",
          "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)] focus:outline-none",
          "resize-none overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoTextarea.displayName = "AutoTextarea";
