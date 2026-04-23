"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ResumePreview } from "../preview/ResumePreview";
import { FontLoader } from "../preview/FontLoader";
import { useResumeStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import type { Resume, SectionKind } from "@/lib/types";
import {
  Minus,
  Plus,
  Maximize2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

type ReviewTip = {
  id: string;
  title: string;
  body: string;
  target: "header" | SectionKind;
};

// Heuristics over the current resume — deterministic, no measurement.
// Returns up to four tips, ordered by likely-impact. Every signal is a
// back-of-envelope guess at what's chewing vertical space; the user
// stays in charge of whether to act on any of them.
function getOverflowTips(resume: Resume): ReviewTip[] {
  const tips: ReviewTip[] = [];

  const taglineChars = resume.header.tagline?.length ?? 0;
  if (taglineChars > 180) {
    tips.push({
      id: "tagline",
      title: "Shorten your tagline",
      body: `It's ${taglineChars} characters. Keep under 180 to fit on 2 lines.`,
      target: "header",
    });
  }

  const longestRole = resume.experience
    .slice()
    .sort((a, b) => b.bullets.length - a.bullets.length)[0];
  if (longestRole && longestRole.bullets.length > 3) {
    tips.push({
      id: "bullets",
      title: `Shorten bullets in "${longestRole.company}"`,
      body: `${longestRole.bullets.length} bullets — 3 per role is usually plenty.`,
      target: "experience",
    });
  }

  if (resume.experience.length >= 3) {
    const oldest = resume.experience[resume.experience.length - 1];
    if (oldest.bullets.length >= 2) {
      tips.push({
        id: "oldest",
        title: "Shorten your oldest role",
        body: `Keep "${oldest.role}" as title and dates — drop the bullets.`,
        target: "experience",
      });
    }
  }

  const skillChars = resume.skillGroups.reduce((n, g) => n + g.items.length, 0);
  if (skillChars > 350) {
    tips.push({
      id: "skills",
      title: "Shorten the skills section",
      body: "Merge groups or drop items you use less often.",
      target: "skills",
    });
  }

  if (resume.experience.length > 4) {
    tips.push({
      id: "exp-count",
      title: "Drop your oldest role",
      body: `${resume.experience.length} roles listed — recruiters rarely read past 3–4.`,
      target: "experience",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "style",
      title: "Tighten the layout",
      body: "Reduce line height to ~1.4, or drop the body font size a step.",
      target: "header",
    });
  }

  return tips.slice(0, 4);
}

// Content-quality heuristics. "Hard" issues are definite problems
// (empty fields, missing core content). "Soft" issues are quality
// nudges that a recruiter might flag. High-precision by design —
// false positives burn trust faster than false negatives.
const WEAK_VERB_RE =
  /^(was|is|were|are|been|being|helped|assisted|worked|work|responsible|involved|participated)\b/i;

function getContentTips(resume: Resume): ReviewTip[] {
  const tips: ReviewTip[] = [];

  // --- Hard issues ---
  if (!resume.header.name?.trim()) {
    tips.push({
      id: "name-missing",
      title: "Add your name",
      body: "The header is missing a name.",
      target: "header",
    });
  }

  if (!resume.header.tagline?.trim()) {
    tips.push({
      id: "tagline-missing",
      title: "Add a tagline",
      body: "A one-line summary under the name helps recruiters place you in seconds.",
      target: "header",
    });
  }

  const emptyContact = resume.header.contacts.find((c) => !c.value?.trim());
  if (emptyContact) {
    tips.push({
      id: "contact-empty",
      title: "Fill in empty contact",
      body: `"${emptyContact.label}" has no value.`,
      target: "header",
    });
  }

  const roleMissing = resume.experience.find(
    (e) => !e.company?.trim() || !e.role?.trim(),
  );
  if (roleMissing) {
    tips.push({
      id: "role-missing",
      title: "Complete a role",
      body: "An experience entry is missing a company or role.",
      target: "experience",
    });
  }

  const emptyBulletRole = resume.experience.find((e) =>
    e.bullets.some((b) => !b.text?.trim()),
  );
  if (emptyBulletRole) {
    tips.push({
      id: "bullet-empty",
      title: `Empty bullet in "${emptyBulletRole.company || "a role"}"`,
      body: "Either write a line of impact or remove the bullet.",
      target: "experience",
    });
  }

  const roleWithNoBullets = resume.experience.find((e) => e.bullets.length === 0);
  if (roleWithNoBullets) {
    tips.push({
      id: "no-bullets",
      title: `"${roleWithNoBullets.company || "A role"}" has no bullets`,
      body: "Add 2–3 lines of what you shipped or owned.",
      target: "experience",
    });
  }

  const emptyLink = resume.links.find((l) => !l.url?.trim());
  if (emptyLink) {
    tips.push({
      id: "link-empty",
      title: "Empty link URL",
      body: `"${emptyLink.label || "A link"}" is missing a URL.`,
      target: "links",
    });
  }

  // --- Soft issues (only if no hard ones above, to avoid stacking noise) ---
  if (tips.length === 0) {
    const taglineChars = resume.header.tagline?.length ?? 0;
    if (taglineChars > 0 && taglineChars < 40) {
      tips.push({
        id: "tagline-short",
        title: "Expand your tagline",
        body: `Only ${taglineChars} characters — aim for a complete one-line pitch.`,
        target: "header",
      });
    }

    const allBullets = resume.experience.flatMap((e) => e.bullets);
    const hasDigit = allBullets.some((b) => /\d/.test(b.text));
    if (allBullets.length >= 3 && !hasDigit) {
      tips.push({
        id: "no-metrics",
        title: "Quantify your impact",
        body: "None of your bullets include numbers. Metrics (%, $, users, time) make impact land.",
        target: "experience",
      });
    }

    const weakVerbRole = resume.experience.find((e) =>
      e.bullets.some((b) => WEAK_VERB_RE.test(b.text.trim())),
    );
    if (weakVerbRole) {
      tips.push({
        id: "weak-verbs",
        title: "Strengthen bullet verbs",
        body: `A bullet in "${weakVerbRole.company}" starts with a soft verb (was, helped, worked…). Lead with action: "Shipped", "Led", "Designed".`,
        target: "experience",
      });
    }
  }

  return tips.slice(0, 4);
}

// A4 at 96 dpi — kept in sync with ResumePreview.
const PAGE_W = 794;
const PAGE_H = 1123;

export function PreviewPane() {
  const resume = useResumeStore((s) => s.resume);
  const select = useResumeStore((s) => s.select);
  const play = useSfx();
  const [zoom, setZoom] = useState(0.82);
  const [fitMode, setFitMode] = useState(true);
  // Which review popover is open. Only one at a time so the two pills
  // don't fight for space, and clicking outside either closes.
  const [openPanel, setOpenPanel] = useState<"overflow" | "quality" | null>(null);
  const reviewAnchorRef = useRef<HTMLDivElement | null>(null);

  // Measure the actual content height of the paper so we can render
  // page-break indicators and warn when a resume spills past one A4.
  // ResizeObserver only fires when the paper's size changes, so this
  // is near-zero cost during typing (the paper height is stable until
  // a newline lands).
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(PAGE_H);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContentHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil(contentHeight / PAGE_H));
  const overflows = pageCount > 1;
  const overflowTips = useMemo(
    () => (overflows ? getOverflowTips(resume) : []),
    [overflows, resume],
  );
  const contentTips = useMemo(() => getContentTips(resume), [resume]);
  const hasContentIssues = contentTips.length > 0;

  // Close whichever panel is open if its source condition disappears.
  useEffect(() => {
    if (openPanel === "overflow" && !overflows) setOpenPanel(null);
    if (openPanel === "quality" && !hasContentIssues) setOpenPanel(null);
  }, [openPanel, overflows, hasContentIssues]);

  useEffect(() => {
    if (!openPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPanel(null);
    };
    const onClick = (e: MouseEvent) => {
      const anchor = reviewAnchorRef.current;
      if (anchor && !anchor.contains(e.target as Node)) setOpenPanel(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [openPanel]);

  const togglePanel = (id: "overflow" | "quality") => {
    setOpenPanel((prev) => {
      const next = prev === id ? null : id;
      play(next ? "dropdownOpen" : "dropdownClose");
      return next;
    });
  };

  const handleTipClick = (tip: ReviewTip) => {
    play("tap");
    select(
      tip.target === "header"
        ? { kind: "header" }
        : { kind: "section", id: tip.target },
    );
    setOpenPanel(null);
    // On mobile the editor sits below the preview — bring its tabpanel
    // into view so the user lands on the section they asked to jump to.
    requestAnimationFrame(() => {
      document
        .getElementById("editor-panel-content")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!fitMode) return;
    const fit = () => {
      const container = document.getElementById("preview-scroll");
      if (!container) return;
      // Padding ring around the paper varies by breakpoint (16/32/48 px).
      const pad = container.clientWidth < 640 ? 32 : container.clientWidth < 768 ? 64 : 96;
      const availableW = container.clientWidth - pad;
      const availableH = container.clientHeight - pad;
      const scale = Math.min(availableW / PAGE_W, availableH / PAGE_H, 1);
      setZoom(Math.max(0.3, scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fitMode]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      className="relative flex min-w-0 flex-col overflow-hidden border-b border-ink-border md:border-b-0"
      style={{ background: "var(--canvas-bg)" }}
    >
      <FontLoader
        titleFontId={resume.style.titleFontId}
        bodyFontId={resume.style.bodyFontId}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-dot-grid bg-grid-sm opacity-60"
        aria-hidden
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 40%, var(--canvas-vignette) 100%)",
        }}
      />

      {/* Review pills — overflow (amber, warning) and content-quality
          (neutral, informational). Stacked vertically when both present;
          click opens a popover with actionable tips that jump the editor
          to the relevant section. */}
      {(overflows || hasContentIssues) && (
        <div
          ref={reviewAnchorRef}
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 sm:top-5"
        >
          <AnimatePresence>
            {overflows && (
              <motion.div
                key="overflow"
                initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.14 } }}
                transition={spring.soft}
                className="flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => togglePanel("overflow")}
                  aria-expanded={openPanel === "overflow"}
                  aria-haspopup="dialog"
                  aria-controls="overflow-tips"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium backdrop-blur-md transition-colors duration-fast",
                    "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]",
                    "shadow-[0_1px_2px_var(--shadow-drop-close),0_6px_16px_-4px_var(--shadow-drop-far)]",
                    "hover:bg-[var(--warn-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warn-ring)]",
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular-nums">
                    Runs to {pageCount} pages
                  </span>
                  <motion.span
                    aria-hidden
                    animate={{ rotate: openPanel === "overflow" ? 180 : 0 }}
                    transition={spring.snap}
                    className="flex"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openPanel === "overflow" && (
                    <TipsPopover
                      id="overflow-tips"
                      ariaLabel="Suggestions to fit on one page"
                      heading="A few places to trim"
                      subheading="Jump to any section to edit. Two pages is fine for senior roles."
                      tips={overflowTips}
                      onTipClick={handleTipClick}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hasContentIssues && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -4, filter: "blur(4px)", transition: { duration: 0.14 } }}
                transition={spring.soft}
                className="flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() => togglePanel("quality")}
                  aria-expanded={openPanel === "quality"}
                  aria-haspopup="dialog"
                  aria-controls="quality-tips"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border border-ink-border bg-overlay px-3 py-1 text-[11.5px] font-medium text-ink-text backdrop-blur-md transition-colors duration-fast",
                    "shadow-[0_1px_2px_var(--shadow-drop-close),0_6px_16px_-4px_var(--shadow-drop-far)]",
                    "hover:bg-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-border-strong",
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                  <span className="tabular-nums">
                    {contentTips.length} {contentTips.length === 1 ? "thing" : "things"} to review
                  </span>
                  <motion.span
                    aria-hidden
                    animate={{ rotate: openPanel === "quality" ? 180 : 0 }}
                    transition={spring.snap}
                    className="flex text-ink-muted"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openPanel === "quality" && (
                    <TipsPopover
                      id="quality-tips"
                      ariaLabel="Content quality suggestions"
                      heading="Things to review"
                      subheading="Small fixes that make a resume read stronger."
                      tips={contentTips}
                      onTipClick={handleTipClick}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div id="preview-scroll" className="relative z-10 flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-8 md:p-12">
          {/*
            Zoom is a paint-only `transform: scale()` — no layout change —
            so a Framer `layout` animation can't see it and only ends up
            re-measuring the huge preview subtree on every state change.
            Plain div is materially cheaper.

            `contain: layout paint style` seals the preview subtree as a
            containment boundary — the browser is told that nothing
            inside affects anything outside (and vice versa), so edits in
            the editor pane don't invalidate paint work on the preview's
            ancestors. Noticeable on slow devices.
          */}
          <div
            className="relative origin-top shadow-paper-t transition-transform duration-base ease-out-quart"
            style={{
              transform: `scale(${zoom})`,
              contain: "layout paint style",
            }}
          >
            <ResumePreview ref={paperRef} resume={resume} />

            {/* Page-break markers — rendered inside the scaled wrapper
                so they move with the paper's zoom. A thin dashed rule
                sits exactly on the 1123px boundary with a "PAGE N" tag
                on the right. Purely informational; content flows
                through them (print/PDF will actually break there). */}
            {overflows &&
              Array.from({ length: pageCount - 1 }, (_, i) => {
                const top = (i + 1) * PAGE_H;
                return (
                  <div
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 flex items-center"
                    style={{ top }}
                  >
                    <div
                      className="flex-1"
                      style={{ borderTop: "1px dashed var(--warn-rule)" }}
                    />
                    <span
                      className="ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.06em] text-[var(--warn-badge-text)]"
                      style={{
                        background: "var(--warn-badge-bg)",
                        boxShadow:
                          "0 0 0 1px var(--warn-badge-ring), 0 1px 2px var(--shadow-drop-close)",
                      }}
                    >
                      PAGE {i + 2}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 rule-fade-v"
        aria-hidden
      />

      {/* Floating zoom toolbar with primary-CTA-level depth (black/gray) */}
      <motion.div
        role="toolbar"
        aria-label="Preview zoom"
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...spring.soft, delay: 0.1 }}
        className={cn(
          "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 p-1 backdrop-blur-md sm:bottom-5 sm:gap-1 sm:p-1.5",
          "rounded-full border border-ink-border bg-overlay",
          "shadow-[inset_0_1px_0_var(--shadow-highlight),0_2px_4px_var(--shadow-drop-close),0_12px_28px_-8px_var(--shadow-drop-far)]",
        )}
      >
        <ToolbarIconButton
          label="Zoom out"
          disabled={zoom <= 0.4}
          onClick={() => {
            setFitMode(false);
            setZoom((z) => Math.max(0.4, z - 0.1));
          }}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </ToolbarIconButton>

        <div className="relative flex h-8 min-w-[50px] items-center justify-center overflow-hidden px-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={zoomPct}
              initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -10, opacity: 0, filter: "blur(4px)" }}
              transition={spring.snap}
              className="text-[12px] font-semibold tabular-nums text-ink-text"
            >
              {zoomPct}%
            </motion.span>
          </AnimatePresence>
        </div>

        <ToolbarIconButton
          label="Zoom in"
          disabled={zoom >= 1.5}
          onClick={() => {
            setFitMode(false);
            setZoom((z) => Math.min(1.5, z + 0.1));
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </ToolbarIconButton>

        <div className="mx-0.5 h-4 w-px bg-ink-border" aria-hidden />

        <motion.button
          onClick={() => setFitMode(true)}
          whileTap={{ scale: 0.96, y: 0.5 }}
          transition={spring.press}
          aria-pressed={fitMode}
          aria-label="Fit to window"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors duration-fast",
            fitMode
              ? [
                  "text-ink-text bg-card",
                  "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_0_0_1px_var(--ink-border),0_1px_2px_var(--shadow-drop-close)]",
                ].join(" ")
              : "text-ink-muted hover:bg-ink-hover hover:text-ink-text",
          )}
        >
          <Maximize2 className="h-3 w-3" aria-hidden />
          Fit
        </motion.button>
      </motion.div>
    </div>
  );
}

function TipsPopover({
  id,
  ariaLabel,
  heading,
  subheading,
  tips,
  onTipClick,
}: {
  id: string;
  ariaLabel: string;
  heading: string;
  subheading: string;
  tips: ReviewTip[];
  onTipClick: (tip: ReviewTip) => void;
}) {
  return (
    <motion.div
      id={id}
      role="dialog"
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -4, scale: 0.98, filter: "blur(4px)", transition: { duration: 0.12 } }}
      transition={spring.soft}
      className={cn(
        "mt-2 w-[320px] overflow-hidden rounded-xl border border-ink-border bg-overlay backdrop-blur-md",
        "shadow-[0_2px_4px_var(--shadow-drop-close),0_18px_40px_-12px_var(--shadow-drop-far)]",
      )}
    >
      <div className="border-b border-ink-border px-3.5 py-2.5">
        <div className="text-[12px] font-semibold text-ink-text">{heading}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-ink-muted">
          {subheading}
        </div>
      </div>
      <ul className="flex flex-col py-1">
        {tips.map((tip) => (
          <li key={tip.id}>
            <button
              type="button"
              onClick={() => onTipClick(tip)}
              className={cn(
                "group flex w-full items-start gap-2 px-3.5 py-2 text-left transition-colors duration-fast",
                "hover:bg-ink-hover focus-visible:bg-ink-hover focus-visible:outline-none",
              )}
            >
              <div className="flex-1">
                <div className="text-[12px] font-medium text-ink-text">
                  {tip.title}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                  {tip.body}
                </div>
              </div>
              <ChevronRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-muted"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={spring.press}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
    >
      {children}
    </motion.button>
  );
}
