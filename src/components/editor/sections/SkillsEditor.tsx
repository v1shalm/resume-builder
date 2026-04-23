"use client";

import { useResumeStore, temporalStore } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { TokenInput } from "@/components/ui/TokenInput";
import { SortableList, DragHandle } from "../SortableList";
import { SectionHeader, EmptyState, SkillsSkeleton } from "./ExperienceEditor";
import { Trash2 } from "lucide-react";
import { SKILL_SUGGESTIONS } from "@/lib/skill-suggestions";
import { useSfx } from "@/lib/useSfx";

export function SkillsEditor() {
  const groups = useResumeStore((s) => s.resume.skillGroups);
  const add = useResumeStore((s) => s.addSkillGroup);
  const update = useResumeStore((s) => s.updateSkillGroup);
  const remove = useResumeStore((s) => s.removeSkillGroup);
  const reorder = useResumeStore((s) => s.reorderSkillGroups);
  const play = useSfx();

  return (
    <div className="flex flex-col gap-5">
      {groups.length > 0 && (
        <SectionHeader count={groups.length} onAdd={add} addLabel="Add group" />
      )}
      {groups.length === 0 ? (
        <EmptyState
          title="Add your first skill group"
          description="Group by category so they scan fast — e.g. Design, Tools, Research."
          addLabel="Add group"
          onAdd={add}
        >
          <SkillsSkeleton />
        </EmptyState>
      ) : (
        <SortableList
          items={groups}
          onReorder={reorder}
          renderItem={(g, { dragAttrs, dragListeners }) => (
            <article className="group flex flex-col overflow-hidden rounded-xl border border-ink-border bg-card shadow-raised-t">
              <div className="flex items-center gap-2 border-b border-ink-border bg-card-head px-2.5 py-2 shadow-[inset_0_1px_0_var(--shadow-highlight)]">
                <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
                <Input
                  aria-label="Group name"
                  className="h-8 flex-1 border-transparent bg-transparent text-[13.5px] font-semibold shadow-none hover:border-ink-border focus:shadow-none"
                  value={g.label}
                  onChange={(e) => update(g.id, { label: e.target.value })}
                  placeholder="e.g. Design, Tools & Technologies"
                />
                <button
                  type="button"
                  onClick={() => {
                    const label = g.label || "Skill group";
                    play("remove");
                    remove(g.id);
                    showToast({
                      message: `${label} removed`,
                      action: {
                        label: "Undo",
                        onClick: () => temporalStore().undo(),
                      },
                    });
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
                  aria-label={`Remove ${g.label || "group"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="p-5">
                <TokenInput
                  aria-label={`Skills in ${g.label || "this group"}`}
                  value={g.items}
                  onChange={(items) => update(g.id, { items })}
                  suggestions={SKILL_SUGGESTIONS}
                  placeholder="Type a skill and press Enter…"
                />
              </div>
            </article>
          )}
        />
      )}
    </div>
  );
}
