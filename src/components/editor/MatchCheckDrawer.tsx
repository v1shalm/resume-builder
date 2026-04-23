"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Target, X, Copy, Check, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";
import { spring, stagger, rowFadeUp } from "@/lib/motion";
import { useResumeStore } from "@/lib/store";
import { useMatchStore } from "@/lib/match-store";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { matchCheck } from "@/lib/match-check";

/**
 * Match Check drawer — right-side panel that lives in the slot
 * normally held by EditorPanel. Paste a JD, get a coverage score
 * + actionable missing-keyword list. Persists JD to localStorage
 * so iteration across edits feels continuous.
 *
 * Layout decision: drawer REPLACES the editor panel when open
 * (rather than overlaying it). Keeps the preview fully visible so
 * users can spot the resume in real time as they edit in the
 * textarea, and doesn't cover the artifact — which is the point of
 * the app per brand principle #4.
 */
export function MatchCheckDrawer() {
  const resume = useResumeStore((s) => s.resume);
  const currentVariantId = useResumeStore((s) => s.currentVariantId);
  // Read the JD from the active variant's metadata — each resume
  // variant has its own JD so tailoring one application doesn't
  // affect another.
  const jd = useResumeStore(
    (s) => s.variantMeta[s.currentVariantId]?.jobDescription ?? "",
  );
  const setVariantJd = useResumeStore((s) => s.setVariantJd);
  const setJd = (next: string) => setVariantJd(currentVariantId, next);
  const clearJd = () => setVariantJd(currentVariantId, "");
  const setDrawerOpen = useMatchStore((s) => s.setDrawerOpen);
  const play = useSfx();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Recompute on every resume/JD change — cheap, synchronous,
  // user expects live feedback as they edit.
  const result = useMemo(() => matchCheck(resume, jd), [resume, jd]);

  useEffect(() => {
    // Focus the textarea when the drawer first mounts IF there's no
    // existing JD. With persisted content the user probably wants to
    // scan the results first, not edit the paste.
    if (!jd.trim()) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    play("modalClose");
    setDrawerOpen(false);
  };

  // Esc anywhere in the drawer closes it — same grammar as Dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyKeyword = async (kw: string) => {
    try {
      await navigator.clipboard.writeText(kw);
      play("click");
      showToast({
        message: `Copied "${kw}" — paste into a bullet`,
        duration: 2200,
      });
    } catch {
      showToast({ message: "Couldn't copy. Select and ⌘C manually.", duration: 2200 });
    }
  };

  const handleClear = () => {
    if (!jd.trim()) return;
    play("remove");
    clearJd();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const hasJd = jd.trim().length >= 40;
  const coverage = result.coverage;

  return (
    <motion.aside
      role="complementary"
      aria-label="ATS Match"
      variants={stagger(0.04, 0.05)}
      initial="hidden"
      animate="show"
      exit="hidden"
      className="relative flex min-w-0 flex-col overflow-hidden border-l border-ink-border bg-panel shadow-panel-t"
    >
      {/* Header ─────────────────────────────────────────────────── */}
      <motion.header
        variants={rowFadeUp}
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-ink-border bg-tabs px-4 shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_0_0_var(--shadow-edge-dark)]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-ink-border bg-gradient-to-b from-ink-raised to-ink-surface shadow-raised-t"
          >
            <Target className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[12.5px] font-semibold leading-tight text-ink-text">
              ATS Match
            </span>
            <span className="truncate text-[10.5px] leading-tight text-ink-subtle">
              Keyword coverage vs a job description
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close ATS match"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text sm:h-7 sm:w-7"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </motion.header>

      {/* Body — scrolls on overflow */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
          {/* JD textarea block */}
          <motion.section variants={rowFadeUp} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SectionLabel size="sm" tone="muted">Job description</SectionLabel>
              {jd.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-[10.5px] text-ink-subtle transition-colors duration-fast hover:text-ink-text"
                >
                  <Eraser className="h-3 w-3" aria-hidden />
                  Clear
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              onFocus={(e) => {
                // Scroll the textarea into view when the mobile
                // keyboard opens so it doesn't hide the paste target.
                e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
              }}
              placeholder="Paste a job description here. We'll pull out the salient terms and show what's missing from your resume."
              spellCheck={false}
              rows={6}
              className={cn(
                "min-h-[120px] resize-y rounded-lg border border-[var(--input-border)] bg-input px-3 py-2.5 font-mono text-[11.5px] leading-[1.55] text-ink-text placeholder:text-ink-subtle shadow-well-t",
                "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none",
              )}
            />
          </motion.section>

          {/* Results */}
          {!hasJd ? (
            <motion.section
              variants={rowFadeUp}
              className="flex flex-col gap-2 rounded-xl border border-dashed border-ink-border bg-hatch p-5"
            >
              <span className="text-[12.5px] font-medium text-ink-text">
                Paste at least 40 characters to see a score
              </span>
              <span className="text-[11.5px] leading-[1.5] text-ink-muted">
                Tip: paste the full JD — responsibilities + requirements — so the keyword extractor has enough signal.
              </span>
            </motion.section>
          ) : (
            <AnimatePresence mode="wait">
              <motion.section
                key="results"
                variants={rowFadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-5"
              >
                {/* Coverage readout */}
                <CoverageReadout
                  coverage={coverage ?? 0}
                  matched={result.totals.matched}
                  extracted={result.totals.extracted}
                />

                {/* Missing list */}
                {result.missing.length > 0 && (
                  <KeywordList
                    label={`Missing from resume`}
                    count={result.missing.length}
                    tone="missing"
                    keywords={result.missing}
                    onChipClick={handleCopyKeyword}
                    chipHint="Click any to copy"
                  />
                )}

                {/* Matched list */}
                {result.matched.length > 0 && (
                  <KeywordList
                    label="Already in resume"
                    count={result.matched.length}
                    tone="matched"
                    keywords={result.matched}
                  />
                )}
              </motion.section>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

// ── Coverage readout ─────────────────────────────────────────────
// Big number + a thin track so the score lands immediately. The
// track uses the amber accent for the filled portion (the one place
// in this view that earns the brand accent) and a muted well for
// the rest.

function CoverageReadout({
  coverage,
  matched,
  extracted,
}: {
  coverage: number;
  matched: number;
  extracted: number;
}) {
  const label = coverageLabel(coverage);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-border bg-card p-4 shadow-raised-t">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold tabular-nums leading-none text-ink-text">
            {coverage}%
          </span>
          <SectionLabel size="sm" tone="muted">{label}</SectionLabel>
        </div>
        <span className="text-[11px] tabular-nums text-ink-subtle">
          {matched} / {extracted} keywords
        </span>
      </div>

      <div
        className="relative h-1.5 overflow-hidden rounded-full bg-input shadow-well-t"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={coverage}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${coverage}%` }}
          transition={spring.soft}
          style={{
            background: `linear-gradient(90deg, oklch(0.895 0.158 85) 0%, oklch(0.815 0.172 82) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

function coverageLabel(cov: number): string {
  if (cov >= 80) return "Strong match";
  if (cov >= 60) return "Decent match";
  if (cov >= 40) return "Thin match";
  return "Weak match";
}

// ── Keyword list ─────────────────────────────────────────────────
// Chip row with click-to-copy behaviour on the "missing" variant.
// Matched chips are display-only.

function KeywordList({
  label,
  count,
  tone,
  keywords,
  onChipClick,
  chipHint,
}: {
  label: string;
  count: number;
  tone: "missing" | "matched";
  keywords: string[];
  onChipClick?: (kw: string) => void;
  chipHint?: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel size="sm" tone="muted">
          {label}
          <span className="ml-1.5 tabular-nums text-ink-subtle">· {count}</span>
        </SectionLabel>
        {chipHint && (
          <span className="text-[10.5px] text-ink-subtle">{chipHint}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <KeywordChip
            key={kw}
            label={kw}
            tone={tone}
            onClick={onChipClick ? () => onChipClick(kw) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function KeywordChip({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "missing" | "matched";
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Comp = interactive ? motion.button : motion.span;
  const commonClass = cn(
    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11.5px] leading-none transition-colors duration-fast",
    tone === "missing"
      ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]"
      : "border-ink-border bg-ink-surface text-ink-muted",
    interactive &&
      "cursor-pointer hover:bg-[var(--warn-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warn-ring)]",
  );

  if (interactive) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.96 }}
        transition={spring.press}
        className={commonClass}
        aria-label={`Copy "${label}" to clipboard`}
      >
        <Copy className="h-3 w-3" aria-hidden />
        <span className="font-mono tabular-nums">{label}</span>
      </motion.button>
    );
  }
  return (
    <Comp className={commonClass}>
      <Check className="h-3 w-3 text-[var(--ink-success)]" aria-hidden />
      <span className="font-mono tabular-nums">{label}</span>
    </Comp>
  );
}
