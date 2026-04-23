"use client";

import type React from "react";
import { useResumeStore, temporalStore } from "@/lib/store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { SortableList, DragHandle } from "../SortableList";
import { BulletField } from "../BulletField";
import { Field } from "./HeaderEditor";
import { Plus, Trash2 } from "lucide-react";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";

export function ExperienceEditor() {
  const items = useResumeStore((s) => s.resume.experience);
  const addExperience = useResumeStore((s) => s.addExperience);
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const removeExperience = useResumeStore((s) => s.removeExperience);
  const reorderExperience = useResumeStore((s) => s.reorderExperience);
  const addBullet = useResumeStore((s) => s.addBullet);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);
  const reorderBullets = useResumeStore((s) => s.reorderBullets);
  const play = useSfx();

  return (
    <div className="flex flex-col gap-5">
      {items.length > 0 && (
        <SectionHeader
          count={items.length}
          onAdd={addExperience}
          addLabel="Add role"
        />
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Add your first role"
          description="Start with your most recent role — recruiters read top-down."
          addLabel="Add role"
          onAdd={addExperience}
        >
          <ExperienceSkeleton />
        </EmptyState>
      ) : (
        <SortableList
          items={items}
          onReorder={reorderExperience}
          renderItem={(exp, { dragAttrs, dragListeners }) => (
            <Card className="group flex flex-col">
              <CardHeader>
                <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
                <Input
                  aria-label="Company"
                  className="h-8 flex-1 border-transparent bg-transparent text-[13.5px] font-semibold shadow-none hover:border-ink-border focus:shadow-none"
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                  placeholder="e.g. Pineapple Design Studio"
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = exp.company || exp.role || "Role";
                    play("remove");
                    removeExperience(exp.id);
                    showToast({
                      message: `${label} removed`,
                      action: {
                        label: "Undo",
                        onClick: () => temporalStore().undo(),
                      },
                    });
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
                  aria-label={`Remove ${exp.company || "role"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </CardHeader>

              <CardBody className="flex flex-col gap-5">
                <Field label="Role">
                  <Input
                    value={exp.role}
                    onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                    placeholder="e.g. Sr. Associate UI Designer"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <Input
                      value={exp.startDate}
                      onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                      placeholder="Mar 2024"
                    />
                  </Field>
                  <Field label="End">
                    <Input
                      value={exp.endDate}
                      onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                      placeholder="Present"
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <SectionLabel size="md" tone="muted">Bullets</SectionLabel>
                    <Button
                      variant="ghost"
                      size="sm"
                      sound="add"
                      onClick={() => addBullet(exp.id)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Bullet
                    </Button>
                  </div>
                  <SortableList
                    items={exp.bullets}
                    onReorder={(from, to) => reorderBullets(exp.id, from, to)}
                    renderItem={(b, { dragAttrs, dragListeners }) => (
                      <div className="group/bullet flex items-start gap-2 rounded-lg border border-ink-border bg-input p-2 shadow-[inset_0_1px_0_var(--shadow-highlight)]">
                        <div className="pt-2">
                          <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
                        </div>
                        <BulletField
                          value={b.text}
                          onChange={(text) => updateBullet(exp.id, b.id, text)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            play("remove");
                            removeBullet(exp.id, b.id);
                            showToast({
                              message: "Bullet removed",
                              action: {
                                label: "Undo",
                                onClick: () => temporalStore().undo(),
                              },
                            });
                          }}
                          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
                          aria-label="Remove bullet"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    )}
                  />
                </div>
              </CardBody>
            </Card>
          )}
        />
      )}
    </div>
  );
}

export function SectionHeader({
  count,
  onAdd,
  addLabel,
}: {
  count: number;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2.5">
        <SectionLabel size="md" tone="muted" className="tabular-nums">
          {count === 1 ? "1 item" : `${count} items`}
        </SectionLabel>
      </div>
      <Button variant="secondary" size="md" sound="add" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}

// Backwards-compat re-export so existing section imports still work.
// New code should import directly from `@/components/ui/EmptyState`.
export { EmptyState } from "@/components/ui/EmptyState";

// ── Skeletons ───────────────────────────────────────────────────────
// Non-interactive visual scaffolds shown behind the empty-state copy.
// Gray bars approximate the shape of a filled entry so users see what
// they're building toward. Use `bg-ink-border` for "filled" bars and
// `bg-ink-border-strong` for emphasis lines.

function SkelBar({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-full bg-ink-border ${className}`} style={style} />
  );
}

export function ExperienceSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-border bg-card shadow-raised-t">
      <div className="flex items-center justify-between gap-2 border-b border-ink-border bg-card-head px-3 py-2.5">
        <SkelBar className="h-3 w-32" />
        <SkelBar className="h-2.5 w-14" />
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        <SkelBar className="h-2.5 w-40" />
        <SkelBar className="h-2 w-[90%]" />
        <SkelBar className="h-2 w-[82%]" />
        <SkelBar className="h-2 w-[55%]" />
      </div>
    </div>
  );
}

export function SkillsSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-border bg-card shadow-raised-t">
      <div className="flex items-center gap-2 border-b border-ink-border bg-card-head px-3 py-2.5">
        <SkelBar className="h-3 w-20" />
      </div>
      <div className="flex flex-wrap gap-1.5 p-4">
        {[14, 20, 12, 16, 22, 14, 18].map((w, i) => (
          <div
            key={i}
            className="h-5 rounded-full border border-ink-border bg-ink-surface"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function EducationSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-ink-border bg-card shadow-raised-t">
      <div className="flex items-center justify-between gap-2 border-b border-ink-border bg-card-head px-3 py-2.5">
        <SkelBar className="h-3 w-36" />
        <SkelBar className="h-2.5 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <SkelBar className="h-2.5 w-full" />
        <SkelBar className="h-2.5 w-full" />
        <div className="col-span-2">
          <SkelBar className="h-2.5 w-[60%]" />
        </div>
      </div>
    </div>
  );
}

export function LinksSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[28, 24].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-ink-border bg-card p-2.5 shadow-raised-t"
        >
          <div className="h-3 w-3 rounded-full bg-ink-border" />
          <SkelBar className="h-2.5" style={{ width: `${w * 4}px` } as React.CSSProperties} />
        </div>
      ))}
    </div>
  );
}
