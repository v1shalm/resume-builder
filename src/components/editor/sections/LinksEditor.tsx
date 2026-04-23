"use client";

import { useResumeStore, temporalStore } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { SortableList, DragHandle } from "../SortableList";
import { SectionHeader, EmptyState, LinksSkeleton } from "./ExperienceEditor";
import { Trash2 } from "lucide-react";
import { useSfx } from "@/lib/useSfx";

export function LinksEditor() {
  const items = useResumeStore((s) => s.resume.links);
  const add = useResumeStore((s) => s.addLink);
  const update = useResumeStore((s) => s.updateLink);
  const remove = useResumeStore((s) => s.removeLink);
  const reorder = useResumeStore((s) => s.reorderLinks);
  const play = useSfx();

  return (
    <div className="flex flex-col gap-5">
      {items.length > 0 && (
        <SectionHeader count={items.length} onAdd={add} addLabel="Add link" />
      )}
      {items.length === 0 ? (
        <EmptyState
          title="Add your links"
          description="Portfolio first, LinkedIn, GitHub, Dribbble — where people should find you."
          addLabel="Add link"
          onAdd={add}
        >
          <LinksSkeleton />
        </EmptyState>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          renderItem={(l, { dragAttrs, dragListeners }) => (
            <div className="group flex items-center gap-2 rounded-lg border border-ink-border bg-card p-2 shadow-raised-t">
              <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
              <Input
                aria-label="Link label"
                className="h-8 w-32 shrink-0 border-transparent bg-transparent text-[13.5px] font-medium shadow-none hover:border-ink-border focus:shadow-none"
                value={l.label}
                onChange={(e) => update(l.id, { label: e.target.value })}
                placeholder="e.g. LinkedIn"
              />
              <Input
                aria-label="URL"
                className="h-8 flex-1 border-transparent bg-transparent text-[12.5px] text-ink-muted shadow-none hover:border-ink-border focus:shadow-none"
                value={l.url}
                onChange={(e) => update(l.id, { url: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
              <button
                type="button"
                onClick={() => {
                  const label = l.label || "Link";
                  play("remove");
                  remove(l.id);
                  showToast({
                    message: `${label} removed`,
                    action: {
                      label: "Undo",
                      onClick: () => temporalStore().undo(),
                    },
                  });
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
                aria-label={`Remove ${l.label || "link"}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
