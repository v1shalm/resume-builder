"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
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

  // Two independent AnimatePresences so the pill and panel can
  // overlap during transition. `mode="wait"` would introduce a
  // 140ms gap where neither element is mounted — users perceived
  // that as the pill "disappearing randomly." This way the outgoing
  // one fades out while the incoming one fades in, and at any given
  // frame at least one is on screen.
  return (
    <>
      <AnimatePresence>
        {collapsed && <CollapsedPill key="pill" onExpand={expand} />}
      </AnimatePresence>
      <AnimatePresence>
        {!collapsed && (
          <motion.aside
            key="panel"
            role="complementary"
            aria-label="Resumes and templates"
            initial={{ opacity: 0, x: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -8, filter: "blur(4px)", transition: { duration: 0.14 } }}
            transition={spring.soft}
            style={{ width: SIDEBAR_WIDTH }}
            className={cn(
              "fixed bottom-3 left-3 top-[4.5rem] z-30 flex flex-col overflow-hidden rounded-xl border border-ink-border bg-panel",
              // Raised floating card (Figma-style) — distinct from the
              // editor chrome, reads as a detachable panel above canvas.
              "shadow-[inset_0_1px_0_var(--shadow-highlight),0_2px_4px_var(--shadow-drop-close),0_18px_44px_-10px_var(--shadow-drop-far),0_8px_20px_-8px_var(--shadow-drop-mid)]",
            )}
          >
            <Header onCollapse={collapse} />
            <Tabs tab={tab} onChange={setTab} />
            <div className="flex-1 overflow-auto">
              {tab === "resumes" ? <ResumesTab /> : <TemplatesTab />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Collapsed floating pill ─────────────────────────────────────
// When tucked away, the sidebar becomes a small floating button at
// the top-left corner below the Topbar. Shows the panel title +
// chevron affordance; a tooltip surfaces the ⌘O shortcut for power
// users without crowding the pill itself. Same raised chrome as a
// white CTA — consistent with variant + template cards.
function CollapsedPill({ onExpand }: { onExpand: () => void }) {
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
        key="pill"
        type="button"
        onClick={onExpand}
        initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: -6, filter: "blur(4px)", transition: { duration: 0.12 } }}
        transition={spring.soft}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Expand resumes sidebar"
        className={cn(
          "group fixed left-3 top-[4.5rem] z-30 flex h-9 items-center gap-2 rounded-lg border border-ink-border bg-card pl-2.5 pr-2.5 text-[12px] font-medium text-ink-text",
          "shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_2px_var(--shadow-drop-close),0_10px_24px_-8px_var(--shadow-drop-far)]",
          "hover:shadow-[inset_0_1px_0_var(--shadow-highlight),0_3px_6px_var(--shadow-drop-close),0_14px_30px_-8px_var(--shadow-drop-far)]",
          "transition-[box-shadow,transform] duration-fast",
        )}
      >
        <FileStack className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
        <span>Resumes</span>
        <ChevronRight
          className="h-3.5 w-3.5 text-ink-subtle transition-[color,transform] duration-fast group-hover:translate-x-0.5 group-hover:text-ink-muted"
          aria-hidden
        />
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
        className="flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
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
  const play = useSfx();
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
            onClick={() => {
              if (!active) play("tabSwap");
              onChange(t.id);
            }}
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
              "border-[oklch(0.55_0.12_75_/_0.55)]",
              "shadow-[inset_0_1px_0_var(--shadow-highlight),0_0_0_2px_oklch(0.855_0.165_85_/_0.45),0_2px_4px_var(--shadow-drop-close),0_10px_24px_-10px_var(--shadow-drop-far)]",
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
    play("tabSwap");
    switchVariant(id);
  };

  const handleDuplicate = () => {
    play("add");
    const id = createVariant();
    showToast({
      message: "Duplicated",
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
      showToast({ message: "Can't delete the last variant", duration: 2000 });
      return;
    }
    // Snapshot before deletion so Undo can re-inject the variant
    // at its original position with its original data intact.
    const snap = useResumeStore.getState();
    const snapMeta = snap.variantMeta[id];
    const snapResume =
      id === snap.currentVariantId ? snap.resume : snap.variants[id];
    const snapIndex = snap.variantOrder.indexOf(id);

    play("remove");
    deleteVariant(id);
    showToast({
      message: `"${label}" deleted`,
      duration: 3200,
      action: {
        label: "Undo",
        onClick: () => {
          if (!snapMeta || !snapResume) return;
          useResumeStore.setState((st) => ({
            variants: { ...st.variants, [id]: snapResume },
            variantMeta: { ...st.variantMeta, [id]: snapMeta },
            variantOrder: [
              ...st.variantOrder.slice(0, snapIndex),
              id,
              ...st.variantOrder.slice(snapIndex),
            ],
          }));
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
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        onClick={onRename}
        aria-label="Rename"
        className="flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text"
      >
        <Pencil className="h-3 w-3" aria-hidden />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-subtle transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger"
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
  const play = useSfx();

  const handleApply = (tpl: Template) => {
    if (tpl.id === activeTemplateId) return;
    play("select");
    applyTemplate(tpl.id);
    showToast({ message: `Applied “${tpl.label}”`, duration: 2000 });
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
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-success)]">
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
        ATS
      </span>
    );
  }
  return (
    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-ink-border bg-ink-surface px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
      <Columns className="h-2.5 w-2.5" aria-hidden />
      Modern
    </span>
  );
}

