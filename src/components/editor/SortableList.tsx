"use client";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSfx } from "@/lib/useSfx";

type SortableListProps<T extends { id: string }> = {
  items: T[];
  onReorder: (fromId: string, toId: string) => void;
  renderItem: (item: T, handleProps: { dragAttrs: Record<string, unknown>; dragListeners: Record<string, unknown> | undefined }) => React.ReactNode;
};

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const play = useSfx();

  const onDragStart = (_e: DragStartEvent) => {
    play("dragStart");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    play("dragEnd");
    onReorder(String(active.id), String(over.id));
  };

  // Position-based SR announcements. The generic list can't know a
  // human label for each item, so we describe moves by position only
  // ("Item moved from position 2 to 4 of 5") — clear, universal, and
  // avoids leaking opaque ID strings to assistive tech.
  const positionOf = (id: string | number) =>
    items.findIndex((i) => i.id === String(id)) + 1;
  const total = items.length;

  const announcements = {
    onDragStart({ active }: { active: { id: string | number } }) {
      return `Picked up item at position ${positionOf(active.id)} of ${total}.`;
    },
    onDragOver({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      if (!over) return `Item at position ${positionOf(active.id)} is no longer over a droppable area.`;
      return `Item moved to position ${positionOf(over.id)} of ${total}.`;
    },
    onDragEnd({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      if (!over) return `Item dropped. It returned to position ${positionOf(active.id)}.`;
      return `Item dropped at position ${positionOf(over.id)} of ${total}.`;
    },
    onDragCancel({ active }: { active: { id: string | number } }) {
      return `Reorder cancelled. Item returned to position ${positionOf(active.id)}.`;
    },
  };

  void arrayMove;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {(handleProps) => renderItem(item, handleProps)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (handleProps: {
    dragAttrs: Record<string, unknown>;
    dragListeners: Record<string, unknown> | undefined;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform) || undefined,
        transition,
      }}
      className={cn(
        "touch-none",
        isDragging && "relative z-10 opacity-95 [&>*]:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.45),0_4px_8px_-4px_oklch(0_0_0_/_0.35)]",
      )}
    >
      {children({
        dragAttrs: attributes as unknown as Record<string, unknown>,
        dragListeners: listeners as unknown as Record<string, unknown> | undefined,
      })}
    </div>
  );
}

export function DragHandle({
  dragAttrs,
  dragListeners,
  className,
}: {
  dragAttrs: Record<string, unknown>;
  dragListeners: Record<string, unknown> | undefined;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label="Drag to reorder"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 26, mass: 0.5 }}
      className={cn(
        // Touch-friendly hit area (40×40 on mobile) with smaller painted chrome
        "flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-md text-ink-muted/60 transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text active:cursor-grabbing sm:h-8 sm:w-7",
        className,
      )}
      {...dragAttrs}
      {...dragListeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </motion.button>
  );
}
