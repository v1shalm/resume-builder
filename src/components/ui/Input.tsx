"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--input-border)] bg-input px-3 text-[13.5px] text-ink-text shadow-well-t",
        "placeholder:text-ink-subtle",
        "transition-[border-color,box-shadow] duration-fast",
        "hover:border-ink-borderStrong",
        "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex w-full rounded-lg border border-[var(--input-border)] bg-input px-3 py-2.5 text-[13.5px] leading-[1.55] text-ink-text shadow-well-t",
        "placeholder:text-ink-subtle",
        "transition-[border-color,box-shadow] duration-fast",
        "hover:border-ink-borderStrong",
        "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-[11.5px] font-medium text-ink-muted",
        className,
      )}
      {...props}
    />
  );
});
Label.displayName = "Label";
