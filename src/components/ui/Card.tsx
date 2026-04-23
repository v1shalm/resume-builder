"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Raised card chrome ─────────────────────────────────────────────
// Single source of truth for the `rounded-* border bg-card shadow-
// raised-t` pattern that appeared 12+ times across the editor.
//
// Use <Card> as the outer wrapper. Slot <CardHeader> at the top for
// rows that want a tinted header strip (company/role, skill-group
// name). Slot <CardBody> for the padded content area.
//
// Anything that wants bespoke internals can skip the slots and just
// wrap children directly — the primitive only owns the outer chrome.

type Radius = "md" | "lg" | "xl";

const RADIUS_CLASS: Record<Radius, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  radius?: Radius;
  /** Skip the drop-shadow / border for a "flat" nested card look. */
  flat?: boolean;
};

export function Card({ className, radius = "xl", flat, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-card",
        RADIUS_CLASS[radius],
        !flat && "border border-ink-border shadow-raised-t",
        className,
      )}
      {...rest}
    />
  );
}

/** Tinted header strip for a Card. Matches the `bg-card-head` surface
 *  and the inset top-highlight used across experience / skill rows. */
export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-ink-border bg-card-head px-2.5 py-2 shadow-[inset_0_1px_0_var(--shadow-highlight)]",
        className,
      )}
      {...rest}
    />
  );
}

/** Padded content area for a Card. Default padding matches the
 *  breathing-room standard (p-5 gap-5) established in the editor. */
export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}
