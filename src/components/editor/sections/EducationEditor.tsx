"use client";

import { useResumeStore, temporalStore } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { SortableList, DragHandle } from "../SortableList";
import { Field } from "./HeaderEditor";
import { SectionHeader, EmptyState } from "./ExperienceEditor";
import { Trash2 } from "lucide-react";
import { useSfx } from "@/lib/useSfx";

export function EducationEditor() {
  const items = useResumeStore((s) => s.resume.education);
  const add = useResumeStore((s) => s.addEducation);
  const update = useResumeStore((s) => s.updateEducation);
  const remove = useResumeStore((s) => s.removeEducation);
  const reorder = useResumeStore((s) => s.reorderEducation);
  const play = useSfx();

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader count={items.length} onAdd={add} addLabel="Add entry" />
      {items.length === 0 ? (
        <EmptyState
          label="No education yet."
          hint="Add degrees, certifications, or coursework that's relevant."
        />
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          renderItem={(ed, { dragAttrs, dragListeners }) => (
            <article className="group flex flex-col overflow-hidden rounded-xl border border-ink-border bg-card shadow-raised-t">
              <div className="flex items-center gap-2 border-b border-ink-border bg-card-head px-2.5 py-2 shadow-[inset_0_1px_0_var(--shadow-highlight)]">
                <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
                <Input
                  aria-label="Degree"
                  className="h-8 flex-1 border-transparent bg-transparent text-[13.5px] font-semibold shadow-none hover:border-ink-border focus:shadow-none"
                  value={ed.degree}
                  onChange={(e) => update(ed.id, { degree: e.target.value })}
                  placeholder="e.g. Bachelor in Science"
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = ed.degree || "Education entry";
                    play("remove");
                    remove(ed.id);
                    showToast({
                      message: `${label} removed`,
                      action: {
                        label: "Undo",
                        onClick: () => temporalStore().undo(),
                      },
                    });
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
                  aria-label={`Remove ${ed.degree || "entry"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                <Field label="Field">
                  <Input
                    value={ed.field}
                    onChange={(e) => update(ed.id, { field: e.target.value })}
                    placeholder="e.g. Information Technology"
                  />
                </Field>
                <Field label="Year">
                  <Input
                    value={ed.year}
                    onChange={(e) => update(ed.id, { year: e.target.value })}
                    placeholder="e.g. 2017 – 2020"
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Institution">
                    <Input
                      value={ed.institution}
                      onChange={(e) => update(ed.id, { institution: e.target.value })}
                      placeholder="e.g. Mumbai University"
                    />
                  </Field>
                </div>
              </div>
            </article>
          )}
        />
      )}
    </div>
  );
}
