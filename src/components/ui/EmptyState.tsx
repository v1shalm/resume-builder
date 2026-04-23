"use client";

import type React from "react";
import { Button } from "./Button";
import { Plus } from "lucide-react";

// ── Empty-state card ──────────────────────────────────────────────
// Dashed border + hatched background pattern with three slots:
//   · optional `children` — a ghost/skeleton preview of a filled entry
//   · title + description — role-specific micro-copy
//   · primary CTA
// Fades the skeleton at the bottom via a linear-gradient mask so the
// copy sits atop a soft horizon, not a hard cutoff.
//
// Consumed by: ExperienceEditor, SkillsEditor, EducationEditor,
// LinksEditor — all four section types render the same pattern with
// their own skeleton + copy.

type Props = {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  children?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  addLabel,
  onAdd,
  children,
}: Props) {
  return (
    <div className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-dashed border-ink-border bg-hatch p-5">
      {children && (
        <div
          aria-hidden
          className="pointer-events-none relative opacity-40 [mask-image:linear-gradient(180deg,oklch(0_0_0)_0%,oklch(0_0_0_/_0.5)_80%,transparent_100%)]"
        >
          {children}
        </div>
      )}
      <div className="relative flex flex-col gap-1.5">
        <span className="text-[13.5px] font-medium text-ink-text">{title}</span>
        <span className="text-[12.5px] leading-[1.5] text-ink-muted">
          {description}
        </span>
      </div>
      <div className="relative">
        <Button variant="primary" size="md" sound="add" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
