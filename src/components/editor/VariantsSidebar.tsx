"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  PanelLeft,
  Copy,
  Pencil,
  Trash2,
  ShieldCheck,
  Columns,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { Tooltip, Kbd } from "@/components/ui/Tooltip";
import { useResumeStore } from "@/lib/store";
import { useSidebarStore } from "@/lib/sidebar-store";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { TEMPLATES, templateById, type Template } from "@/lib/templates";
import type { Resume } from "@/lib/types";
import { ResumePreview } from "@/components/preview/ResumePreview";
import { FontLoader } from "@/components/preview/FontLoader";

// ── Variants sidebar ──────────────────────────────────────────────
// Floating left panel with two tabs:
//   · "My Resumes" — live-rendered thumbnails of each variant, click
//     to switch, + to duplicate, inline rename, delete with undo.
//   · "Templates" — a card per template (live-rendered against the
//     ACTIVE resume's content so you see how your data looks in it),
//     click to apply to the active variant. ATS-safe single-column
//     options are flagged with a shield pill so users pick with eyes
//     open.
//
// Floats above the preview (position: fixed) with a raised drop so
// it reads as elevation, not chrome. Click-outside does NOT close —
// users are expected to browse/edit with the sidebar open. Explicit
// close via X, ⌘O, or Esc.

const SIDEBAR_WIDTH = 280;
// A4 preview (794×1123) scaled to fit the card thumbnail exactly.
// Math: sidebar (280) − body padding (24) − card padding (20) = 236.
// Keeping the aspect ratio exact so nothing gets squashed.
const THUMB_WIDTH = 236;
const THUMB_SCALE = THUMB_WIDTH / 794;
const THUMB_HEIGHT = Math.round(1123 * THUMB_SCALE);

export function VariantsSidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const tab = useSidebarStore((s) => s.tab);
  const setTab = useSidebarStore((s) => s.setTab);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const play = useSfx();

  // On first mount, force-collapse on mobile viewports where an
  // expanded 280px sidebar would crowd out the preview + editor.
  // Desktop users keep whatever state was persisted (defaults to
  // expanded); mobile users start with the pill and explicitly opt
  // in to the panel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches && !collapsed) {
      setCollapsed(true);
    }
    // Only on mount — we don't want to re-collapse on every resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expand = () => {
    play("modalOpen");
    setCollapsed(false);
  };
  const collapse = () => {
    play("modalClose");
    setCollapsed(true);
  };

  // Esc collapses the expanded panel. Ignored when already collapsed
  // so we don't swallow Escape globally.
  useEffect(() => {
    if (collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  // Perf: the panel's thumbnails subscribe to the resume store and
  // would re-render on every keystroke even while invisible. Mount
  // body immediately on expand; unmount ~400ms after collapse begins
  // (after fade-out completes) so edits during a collapsed session
  // don't do background render work. A rapid expand→collapse→expand
  // toggle cancels the pending unmount via effect cleanup.
  const [renderBody, setRenderBody] = useState(!collapsed);
  useEffect(() => {
    if (!collapsed) {
      setRenderBody(true);
      return;
    }
    const t = setTimeout(() => setRenderBody(false), 400);
    return () => clearTimeout(t);
  }, [collapsed]);

  // Both pill AND panel are always mounted. They crossfade via the
  // `animate` prop based on `collapsed` — no AnimatePresence, no
  // unmount/remount, no way for the transition to get stuck on
  // rapid toggles. The invisible one has `pointer-events: none`
  // and `aria-hidden` so it can't intercept clicks or be focused.
  return (
    <>
      <CollapsedPill collapsed={collapsed} onExpand={expand} />
      <motion.aside
        role="complementary"
        aria-label="Resumes and templates"
        aria-hidden={collapsed}
        initial={false}
        animate={
          collapsed
            ? { opacity: 0, x: -10, filter: "blur(4px)" }
            : { opacity: 1, x: 0, filter: "blur(0px)" }
        }
        transition={spring.soft}
        style={{ pointerEvents: collapsed ? "none" : "auto" }}
        className={cn(
          // Width: capped at 280px with a safety fallback for very
          // narrow viewports (<320px) so the sidebar never overflows
          // the screen. Same formula works everywhere — no breakpoint
          // juggling.
          "fixed bottom-3 left-3 top-[4.5rem] z-30 flex w-[min(calc(100vw-24px),280px)] flex-col overflow-hidden rounded-xl border border-ink-border bg-panel",
          // Raised floating card (Figma-style) — distinct from the
          // editor chrome, reads as a detachable panel above canvas.
          "shadow-[inset_0_1px_0_var(--shadow-highlight),0_2px_4px_var(--shadow-drop-close),0_18px_44px_-10px_var(--shadow-drop-far),0_8px_20px_-8px_var(--shadow-drop-mid)]",
        )}
      >
        {renderBody && (
          <>
            <Header onCollapse={collapse} />
            <Tabs tab={tab} onChange={setTab} />
            <div className="flex-1 overflow-auto">
              {tab === "resumes" ? <ResumesTab /> : <TemplatesTab />}
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}

// ── Collapsed floating pill ─────────────────────────────────────
// Always mounted. When `collapsed` is false it's driven to opacity 0
// + slightly shifted + pointer-events-none so it's effectively gone
// for users + assistive tech, but without unmount/remount churn.
// Tooltip only registers events when `collapsed` is true (pointer-
// events are off otherwise), so no phantom tooltips appear over the
// expanded panel.
function CollapsedPill({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  return (
    <Tooltip
      side="right"
      content={
        <>
          <span>Expand sidebar</span>
          <Kbd size="xs">⌘O</Kbd>
        </>
      }
    >
      <motion.button
        type="button"
        onClick={onExpand}
        initial={false}
        animate={
          collapsed
            ? { opacity: 1, x: 0, filter: "blur(0px)" }
            : { opacity: 0, x: -10, filter: "blur(4px)" }
        }
        transition={spring.soft}
        whileHover={collapsed ? { x: 2 } : undefined}
        whileTap={collapsed ? { scale: 0.97 } : undefined}
        aria-label="Expand resumes sidebar"
        aria-hidden={!collapsed}
        tabIndex={collapsed ? 0 : -1}
        style={{ pointerEvents: collapsed ? "auto" : "none" }}
        className={cn(
          "group fixed left-3 top-[4.5rem] z-30 flex h-9 items-center gap-2 rounded-lg border border-ink-border bg-card pl-2.5 pr-2.5 text-[12px] font-medium text-ink-text",
          "shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_2px_var(--shadow-drop-close),0_10px_24px_-8px_var(--shadow-drop-far)]",
          "hover:shadow-[inset_0_1px_0_var(--shadow-highlight),0_3px_6px_var(--shadow-drop-close),0_14px_30px_-8px_var(--shadow-drop-far)]",
          "transition-[box-shadow] duration-fast",
        )}
      >
        <PanelLeft
          className="h-3.5 w-3.5 text-ink-muted transition-colors duration-fast group-hover:text-ink-text"
          aria-hidden
        />
        <span>Resumes</span>
      </motion.button>
    </Tooltip>
  );
}

// ── Expanded header ─────────────────────────────────────────────
function Header({ onCollapse }: { onCollapse: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-ink-border bg-tabs px-3 shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_0_0_var(--shadow-edge-dark)]">
      <div className="flex min-w-0 items-center gap-2">
        <FileStack className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate text-[12.5px] font-semibold text-ink-text">
          Resumes
        </span>
      </div>
      <button
        type="button"
        onClick={onCollapse}
        aria-label="Collapse sidebar"
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text sm:h-7 sm:w-7"
      >
        <PanelLeft className="h-3.5 w-3.5" aria-hidden />
      </button>
    </header>
  );
}

// ── Tabs ────────────────────────────────────────────────────────
function Tabs({
  tab,
  onChange,
}: {
  tab: "resumes" | "templates";
  onChange: (t: "resumes" | "templates") => void;
}) {
  const tabs: { id: "resumes" | "templates"; label: string }[] = [
    { id: "resumes", label: "My Resumes" },
    { id: "templates", label: "Templates" },
  ];
  return (
    <div
      role="tablist"
      className="flex shrink-0 border-b border-ink-border bg-tabs px-1 shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_0_0_var(--shadow-edge-dark)]"
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex-1 whitespace-nowrap px-2 py-2.5 text-[12px] font-medium transition-colors duration-fast",
              "hover:text-ink-text",
              active ? "text-ink-text" : "text-ink-muted",
            )}
          >
            <span className="relative z-10">{t.label}</span>
            {active && (
              <motion.span
                layoutId="variants-tab-indicator"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-ink-text shadow-[0_0_10px_oklch(0.94_0.004_250_/_0.4)]"
                transition={spring.soft}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Thumbnail ───────────────────────────────────────────────────
// A tiny clipped ResumePreview at fixed scale. Pointer-events are
// disabled on the inner so nothing inside the thumb reacts to hover
// / keyboard — it's a visual preview only.
function ResumeThumb({ resume }: { resume: Resume }) {
  return (
    <div
      aria-hidden
      className="relative overflow-hidden rounded-md bg-ink-bg"
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: "top left",
          width: 794,
        }}
      >
        <FontLoader
          titleFontId={resume.style.titleFontId}
          bodyFontId={resume.style.bodyFontId}
        />
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}

// ── Card shell ──────────────────────────────────────────────────
// Shared chrome between variant cards and template cards. Matches
// the white/raised CTA family (same shadow stack as secondary
// buttons) so cards read as "tactile things you click".
function ThumbCard({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      transition={spring.press}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border bg-card p-2.5 text-left transition-[box-shadow,border-color,transform] duration-fast",
        active
          ? [
              // Amber selection frame — 1px border + 2px INSET ring,
              // both in --ink-accent. Drawn entirely inside the card
              // box so the sidebar's overflow-hidden + rounded corners
              // can't clip it (that was the "uneven stroke" bug). Same
              // tone on both layers so there's no double-banded halo.
              // Template/variant selection is a persistent state, not
              // a CTA — fine place for the brand accent to live.
              "border-[var(--ink-accent)]",
              "shadow-[inset_0_0_0_2px_var(--ink-accent),0_2px_4px_var(--shadow-drop-close),0_10px_24px_-10px_var(--shadow-drop-far)]",
            ].join(" ")
          : [
              "border-ink-border",
              "shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_2px_var(--shadow-drop-close),0_6px_16px_-8px_var(--shadow-drop-far)]",
              "hover:shadow-[inset_0_1px_0_var(--shadow-highlight),0_3px_6px_var(--shadow-drop-close),0_12px_28px_-8px_var(--shadow-drop-far)]",
            ].join(" "),
      )}
    >
      {children}
    </motion.button>
  );
}

// ── My Resumes tab ──────────────────────────────────────────────
function ResumesTab() {
  const activeId = useResumeStore((s) => s.currentVariantId);
  const order = useResumeStore((s) => s.variantOrder);
  const meta = useResumeStore((s) => s.variantMeta);
  const activeResume = useResumeStore((s) => s.resume);
  const variants = useResumeStore((s) => s.variants);
  const switchVariant = useResumeStore((s) => s.switchVariant);
  const createVariant = useResumeStore((s) => s.createVariant);
  const deleteVariant = useResumeStore((s) => s.deleteVariant);
  const renameVariant = useResumeStore((s) => s.renameVariant);
  const play = useSfx();

  const [renamingId, setRenamingId] = useState<string | null>(null);

  const handleSwitch = (id: string) => {
    if (id === activeId) return;
    switchVariant(id);
  };

  const handleDuplicate = () => {
    play("add");
    const id = createVariant();
    showToast({
      message: "New variant ready",
      duration: 1800,
      action: {
        label: "Undo",
        onClick: () => {
          deleteVariant(id);
        },
      },
    });
  };

  const handleDelete = (id: string, label: string) => {
    if (order.length <= 1) {
      showToast({ message: "Keep at least one resume around", duration: 2000 });
      return;
    }
    // Snapshot before deletion so Undo can re-inject the variant
    // at its original position with its original data intact. If
    // the deleted variant was the active one, Undo also promotes
    // it back to active (the user clearly wanted to keep editing
    // it — just restoring to the list and leaving them on a
    // different variant would feel broken).
    const snap = useResumeStore.getState();
    const snapMeta = snap.variantMeta[id];
    const snapResume =
      id === snap.currentVariantId ? snap.resume : snap.variants[id];
    const snapIndex = snap.variantOrder.indexOf(id);
    const wasActive = id === snap.currentVariantId;

    play("remove");
    deleteVariant(id);
    showToast({
      message: `"${label}" deleted`,
      duration: 3200,
      action: {
        label: "Undo",
        onClick: () => {
          if (!snapMeta || !snapResume) return;
          useResumeStore.setState((st) => {
            if (wasActive) {
              // Promote the restored variant back to active; snapshot
              // whichever variant is currently active into `variants`
              // so we don't lose unsaved edits on it.
              return {
                resume: snapResume,
                variants: {
                  ...st.variants,
                  [st.currentVariantId]: st.resume,
                },
                variantMeta: { ...st.variantMeta, [id]: snapMeta },
                variantOrder: [
                  ...st.variantOrder.slice(0, snapIndex),
                  id,
                  ...st.variantOrder.slice(snapIndex),
                ],
                currentVariantId: id,
                selection: { kind: "header" },
              };
            }
            return {
              variants: { ...st.variants, [id]: snapResume },
              variantMeta: { ...st.variantMeta, [id]: snapMeta },
              variantOrder: [
                ...st.variantOrder.slice(0, snapIndex),
                id,
                ...st.variantOrder.slice(snapIndex),
              ],
            };
          });
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {order.map((id) => {
        const vm = meta[id];
        const resume = id === activeId ? activeResume : variants[id];
        if (!vm || !resume) return null;
        const isActive = id === activeId;
        const template = templateById(vm.templateId);
        return (
          <div key={id} className="flex flex-col gap-1.5">
            <ThumbCard
              active={isActive}
              onClick={() => handleSwitch(id)}
              ariaLabel={`Switch to ${vm.label}`}
            >
              <ResumeThumb resume={resume} />
            </ThumbCard>
            <div className="flex items-center justify-between gap-1.5 px-1">
              <div className="min-w-0 flex-1">
                {renamingId === id ? (
                  <input
                    autoFocus
                    aria-label={`Rename ${vm.label}`}
                    defaultValue={vm.label}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={(e) => {
                      renameVariant(id, e.target.value);
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-6 w-full rounded-[4px] border border-[var(--input-focus-border)] bg-input px-1.5 text-[12px] text-ink-text shadow-well-t focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => setRenamingId(id)}
                    title="Double-click to rename"
                    className={cn(
                      "block max-w-full truncate text-left text-[12px] transition-colors duration-fast hover:text-ink-text",
                      isActive ? "font-semibold text-ink-text" : "text-ink-muted",
                    )}
                  >
                    {vm.label}
                  </button>
                )}
                <div className="truncate text-[10.5px] text-ink-subtle">
                  {template.label}
                </div>
              </div>
              <VariantActions
                onRename={() => setRenamingId(id)}
                onDelete={() => handleDelete(id, vm.label)}
                canDelete={order.length > 1}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleDuplicate}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-border bg-hatch px-3 py-3 text-[12px] font-medium text-ink-muted transition-colors duration-fast hover:text-ink-text"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        Duplicate this resume
      </button>
    </div>
  );
}

function VariantActions({
  onRename,
  onDelete,
  canDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  // On touch devices these always show (no hover); on desktop
  // they appear on group-hover / focus. Mobile tap targets are
  // h-8 (32px); desktop shrinks to h-6 (24px) where hover works.
  return (
    <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-fast sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
      <button
        type="button"
        onClick={onRename}
        aria-label="Rename"
        className="flex h-8 w-8 items-center justify-center rounded-[4px] text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text sm:h-6 sm:w-6"
      >
        <Pencil className="h-3 w-3" aria-hidden />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-ink-subtle transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-6 sm:w-6"
        >
          <Trash2 className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

// ── Templates tab ───────────────────────────────────────────────
// Each card renders the ACTIVE resume's CONTENT through each
// template's (layoutId + style) so users see their own data in the
// candidate template — not some fake Lorem Ipsum preview.
function TemplatesTab() {
  const resume = useResumeStore((s) => s.resume);
  const currentId = useResumeStore((s) => s.currentVariantId);
  const activeTemplateId = useResumeStore(
    (s) => s.variantMeta[s.currentVariantId]?.templateId,
  );
  const applyTemplate = useResumeStore((s) => s.applyTemplate);

  const handleApply = (tpl: Template) => {
    if (tpl.id === activeTemplateId) return;
    applyTemplate(tpl.id);
    showToast({ message: `“${tpl.label}” applied`, duration: 2000 });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {TEMPLATES.map((tpl) => {
        const previewResume: Resume = {
          ...resume,
          style: tpl.style,
          layoutId: tpl.layoutId,
        };
        const isActive = tpl.id === activeTemplateId;
        return (
          <div key={tpl.id} className="flex flex-col gap-1.5">
            <ThumbCard
              active={isActive}
              onClick={() => handleApply(tpl)}
              ariaLabel={`Apply ${tpl.label} template`}
            >
              <ResumeThumb
                resume={previewResume}
                key={`${tpl.id}-${currentId}`}
              />
            </ThumbCard>
            <div className="flex items-start justify-between gap-1.5 px-1">
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate text-[12px]",
                    isActive ? "font-semibold text-ink-text" : "text-ink-muted",
                  )}
                >
                  {tpl.label}
                </div>
                <div className="truncate text-[10.5px] text-ink-subtle">
                  {tpl.description}
                </div>
              </div>
              <AtsBadge badge={tpl.atsBadge} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AtsBadge({ badge }: { badge: Template["atsBadge"] }) {
  if (badge === "ats-safe") {
    return (
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-success)] shadow-chip-t">
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
        ATS
      </span>
    );
  }
  return (
    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-ink-border bg-ink-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-subtle shadow-chip-t">
      <Columns className="h-2.5 w-2.5" aria-hidden />
      Modern
    </span>
  );
}

