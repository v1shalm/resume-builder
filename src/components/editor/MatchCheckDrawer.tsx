"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion } from "motion/react";
import { Target, X, Plus, Check, Eraser, Lightbulb } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";
import { spring, stagger, rowFadeUp } from "@/lib/motion";
import { useResumeStore } from "@/lib/store";
import { useMatchStore } from "@/lib/match-store";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { matchCheck, type Keyword, type Tone } from "@/lib/match-check";

/**
 * ATS Match drawer — lives in the slot normally held by EditorPanel.
 * Paste a JD, get a weighted score + missing/matched keyword lists.
 * The panel replaces the editor (not overlay) so the preview stays
 * visible — users can read their resume while iterating on coverage.
 *
 * Score calc runs with a 400ms debounce on the JD input, but no
 * debounce on the resume — so edits to bullets update the score
 * live while the user fixes gaps.
 */
export function MatchCheckDrawer() {
  const resume = useResumeStore((s) => s.resume);
  const currentVariantId = useResumeStore((s) => s.currentVariantId);
  const jd = useResumeStore(
    (s) => s.variantMeta[s.currentVariantId]?.jobDescription ?? "",
  );
  const setVariantJd = useResumeStore((s) => s.setVariantJd);
  const setJd = (next: string) => setVariantJd(currentVariantId, next);
  const clearJd = () => setVariantJd(currentVariantId, "");
  const setDrawerOpen = useMatchStore((s) => s.setDrawerOpen);
  const play = useSfx();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Debounce JD → the full algorithm runs 400ms after the user stops
  // typing in the textarea. Resume edits skip the debounce so the
  // score updates in real-time as the user fixes gaps.
  const [debouncedJd, setDebouncedJd] = useState(jd);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedJd(jd), 400);
    return () => clearTimeout(t);
  }, [jd]);

  const result = useMemo(
    () => matchCheck(resume, debouncedJd),
    [resume, debouncedJd],
  );

  // Flip to the score section the moment the JD crosses the threshold,
  // not after the debounce — feels more responsive on paste.
  const hasJd = jd.trim().length >= 40;

  useEffect(() => {
    if (!jd.trim()) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    play("modalClose");
    setDrawerOpen(false);
  };

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
      showToast({ message: "Couldn't copy — select and copy manually.", duration: 2200 });
    }
  };

  const handleClear = () => {
    if (!jd.trim()) return;
    play("remove");
    clearJd();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

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
      {/* Header */}
      <motion.header
        variants={rowFadeUp}
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-ink-border bg-tabs px-4 shadow-[inset_0_1px_0_var(--shadow-highlight),0_1px_0_0_var(--shadow-edge-dark)]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-border bg-card shadow-raised-t"
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

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
          {/* JD textarea — sans-serif, subtle border, no monospace. */}
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
                e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
              }}
              placeholder="Paste the full job description here — responsibilities + requirements…"
              spellCheck={false}
              rows={6}
              className={cn(
                "min-h-[120px] resize-y rounded-lg border border-ink-border bg-input px-3 py-2.5 text-[12.5px] leading-[1.55] text-ink-text placeholder:text-ink-subtle",
                "transition-[border-color,box-shadow] duration-fast",
                "focus:border-[var(--input-focus-border)] focus:shadow-[0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none",
              )}
            />
          </motion.section>

          {!hasJd ? (
            <motion.section
              variants={rowFadeUp}
              className="flex flex-col gap-1.5 rounded-xl border border-dashed border-ink-border bg-hatch p-5"
            >
              <span className="text-[12.5px] font-medium text-ink-text">
                Paste a job description to see your score
              </span>
              <span className="text-[11.5px] leading-[1.5] text-ink-muted">
                Responsibilities and requirements give the keyword extractor the clearest signal.
              </span>
            </motion.section>
          ) : (
            <AnimatePresence mode="wait">
              <motion.section
                key="results"
                variants={rowFadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-4"
              >
                <ScoreCard result={result} />

                {result.missing.highImpact.length > 0 && (
                  <KeywordGroup
                    title="Missing · high impact"
                    keywords={result.missing.highImpact}
                    badge={{ label: "Add these first", tone: "danger" }}
                    tone="missing"
                    onChipClick={handleCopyKeyword}
                  />
                )}

                {result.missing.lowPriority.length > 0 && (
                  <KeywordGroup
                    title="Missing · lower priority"
                    keywords={result.missing.lowPriority}
                    badge={{ label: "Nice to have", tone: "warn" }}
                    tone="missing"
                    onChipClick={handleCopyKeyword}
                  />
                )}

                {result.matched.length > 0 && (
                  <>
                    {(result.missing.highImpact.length > 0 ||
                      result.missing.lowPriority.length > 0) && (
                      <div className="h-px bg-ink-border" aria-hidden />
                    )}
                    <KeywordGroup
                      title="Already matched"
                      keywords={result.matched}
                      tone="matched"
                    />
                  </>
                )}

                <TipLine />
              </motion.section>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

// ── Score card ───────────────────────────────────────────────────
// Ring + grade + message · tier bar with marker · 3-col sub-scores.

function ScoreCard({
  result,
}: {
  result: ReturnType<typeof matchCheck>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ScoreHeroCard result={result} />
      <div className="flex flex-col gap-2">
        <SubScoreCard
          label="Skills"
          matched={result.subScores.skills.matched}
          total={result.subScores.skills.total}
        />
        <SubScoreCard
          label="Soft skills"
          matched={result.subScores.softSkills.matched}
          total={result.subScores.softSkills.total}
        />
        <SubScoreCard
          label="Role terms"
          matched={result.subScores.roleTerms.matched}
          total={result.subScores.roleTerms.total}
        />
      </div>
    </div>
  );
}

// ── Hero score card ──────────────────────────────────────────────
// Full 360° donut gauge with a dim-to-vivid gradient fade along the
// filled arc, tiny square tick marks distributed on the track, a
// soft outer glow, and a recessed neumorphic cavity at the center
// holding the score + label. Below the ring: grade pill + message.

function ScoreHeroCard({
  result,
}: {
  result: ReturnType<typeof matchCheck>;
}) {
  const { score, grade } = result;
  const flashColor = scoreToRingColor(score);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-border bg-card p-6 shadow-raised-t">
      <div className="relative">
        <ArcGauge score={score} size={220} stroke={20} variant="hero" />
        {/* Recessed cavity: sits inside the ring with a neumorphic
            inset shadow so the ring reads as an overhang casting
            shadow into a sunken well. */}
        <div
          aria-hidden
          className="pointer-events-none absolute flex flex-col items-center justify-center rounded-full bg-card"
          style={{
            top: 34,
            right: 34,
            bottom: 34,
            left: 34,
            boxShadow:
              "inset 0 5px 12px -3px var(--shadow-drop-mid), inset 0 -2px 4px -2px var(--shadow-highlight), inset 0 0 0 1px var(--ink-border)",
          }}
        >
          <span className="flex items-baseline font-mono font-bold leading-none tabular-nums text-ink-text">
            <span className="text-[42px]">
              <CountingNumber value={score} />
            </span>
            <span className="ml-0.5 text-[18px] font-semibold text-ink-muted">
              %
            </span>
          </span>
          <span className="mt-1.5 text-[10.5px] font-medium tracking-wide text-ink-muted">
            ATS score
          </span>
        </div>
        {/* Amber flash: a single overlay keyed on score, fading 0.8 → 0
            over 300 ms so each update pulses a soft warm glow on the
            ring. `initial={false}` skips the flash on first mount so
            the score entrance is clean. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={`flash-${score}`}
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 28px 2px color-mix(in oklch, ${flashColor} 60%, transparent)`,
            }}
            aria-hidden
          />
        </AnimatePresence>
      </div>

      {/* Grade pill + message — re-keyed on the grade tier so crossing
          a threshold (e.g. Fair → Strong) fades in the new label and
          message over 200 ms. Within-tier message updates piggyback on
          the same key, which is fine: message deltas inside a tier are
          minor number swaps the eye absorbs without a transition. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={grade.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-3"
        >
          <GradePill tone={grade.tone} label={grade.label} />
          {grade.message && (
            <p className="max-w-[280px] text-center text-[12px] leading-[1.5] text-ink-muted">
              {grade.message}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Counting number ──────────────────────────────────────────────
// Animates from the previous value to the current value over 0.4 s.
// Fires a slider-tick SFX whenever the rounded display crosses an
// 8-point boundary — gives the ramp a tactile "slider hitting
// detents" feel. First mount ramps from 0 → value.

function CountingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const play = useSfx();

  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;

    const TICK_STEP = 18;
    let lastBucket = Math.floor(from / TICK_STEP);

    const controls = animate(from, to, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const rounded = Math.round(latest);
        const bucket = Math.floor(rounded / TICK_STEP);
        if (bucket !== lastBucket) {
          lastBucket = bucket;
          play("sliderTick");
        }
        setDisplay(rounded);
      },
    });
    return () => controls.stop();
  }, [value, play]);

  return <>{display}</>;
}

// ── Sub-score card ───────────────────────────────────────────────
// Compact row: mini gauge · title + count · impact pill.

function SubScoreCard({
  label,
  matched,
  total,
}: {
  label: string;
  matched: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
  // Empty buckets suppress the impact pill — a bucket with 0 keywords
  // has no "impact" to report.
  const impact: ImpactTone | null =
    total === 0 ? null : pct >= 70 ? "low" : pct >= 40 ? "moderate" : "high";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-border bg-card p-3 shadow-raised-t">
      <div className="relative shrink-0">
        <ArcGauge score={pct} size={44} stroke={3.5} variant="mini" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-text">
            {pct}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-ink-text">{label}</span>
        <span className="text-[11px] text-ink-muted tabular-nums">
          {total === 0 ? "—" : `${matched} of ${total} matched`}
        </span>
      </div>
      {impact && <ImpactPill tone={impact} />}
    </div>
  );
}

// ── Arc gauge SVG ────────────────────────────────────────────────
// Full 360° donut. Background is a subtle track with tiny square
// tick marks distributed at even intervals. The filled arc starts
// from 12 o'clock and sweeps clockwise to the leading edge. Fill is
// drawn as N contiguous sub-arcs, each with a slightly higher
// opacity than the last — this produces a smooth dim-to-vivid fade
// that follows the curve (a linear-gradient stroke can't, since it
// doesn't track the path). A colored CSS drop-shadow sits beneath
// the filled group for a soft outer glow. The mini variant skips
// ticks + glow for the sub-score cards.

function ArcGauge({
  score,
  size,
  stroke,
  variant = "hero",
}: {
  score: number;
  size: number;
  stroke: number;
  variant?: "hero" | "mini";
}) {
  const pct = Math.max(0, Math.min(100, score));
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - stroke;
  const color = scoreToRingColor(pct);
  const isHero = variant === "hero";

  const toRad = (d: number) => (d * Math.PI) / 180;
  const startDeg = -90; // 12 o'clock

  // Segment count. Higher = smoother fade. Heros get a denser fade
  // (4.5° per segment); minis stay at 10° each so small gauges
  // don't render dozens of near-identical paths.
  const N_TOTAL = isHero ? 80 : 36;
  const filledSegments = Math.max(
    0,
    Math.min(N_TOTAL, Math.round((pct / 100) * N_TOTAL)),
  );

  const segArc = (a: number, b: number) => {
    const x1 = cx + r * Math.cos(toRad(a));
    const y1 = cy + r * Math.sin(toRad(a));
    const x2 = cx + r * Math.cos(toRad(b));
    const y2 = cy + r * Math.sin(toRad(b));
    // Small segments are always < 180°, so largeArc is always 0.
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const segments = Array.from({ length: filledSegments }, (_, i) => {
    const a = startDeg + (i / N_TOTAL) * 360;
    const b = startDeg + ((i + 1) / N_TOTAL) * 360;
    // Opacity ramp: ease-in pow curve concentrates color near the
    // leading edge — the trail fades from zero, the head is vivid.
    const t = filledSegments > 1 ? i / (filledSegments - 1) : 1;
    const opacity = Math.pow(t, 1.6);
    return { a, b, opacity };
  });

  // Ticks: tiny squares on the stroke centerline, 24 around the ring.
  const tickCount = isHero ? 24 : 0;
  const tickSize = isHero ? 2 : 0;

  // Glow composited in CSS — two layered drop-shadows give a soft
  // bloom that's strongest where the stroke opacity is highest.
  const glowFilter = isHero
    ? `drop-shadow(0 0 10px color-mix(in oklch, ${color} 45%, transparent)) drop-shadow(0 0 3px color-mix(in oklch, ${color} 55%, transparent))`
    : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      {/* Background track — a full, very muted circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--ink-border)"
        strokeWidth={stroke}
        opacity={isHero ? 0.4 : 0.55}
      />

      {/* Tiny tick marks riding the track centerline */}
      {tickCount > 0 &&
        Array.from({ length: tickCount }).map((_, i) => {
          const angle = startDeg + (i / tickCount) * 360;
          const tx = cx + r * Math.cos(toRad(angle));
          const ty = cy + r * Math.sin(toRad(angle));
          return (
            <rect
              key={i}
              x={tx - tickSize / 2}
              y={ty - tickSize / 2}
              width={tickSize}
              height={tickSize}
              rx={0.3}
              fill="var(--ink-muted)"
              opacity={0.4}
            />
          );
        })}

      {/* Filled arc: segmented opacity fade + outer glow */}
      {filledSegments > 0 && (
        <g style={glowFilter ? { filter: glowFilter } : undefined}>
          {segments.map((s, i) => {
            const isLast = i === segments.length - 1 && pct < 100;
            return (
              <path
                key={i}
                d={segArc(s.a, s.b)}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap={isLast ? "round" : "butt"}
                opacity={s.opacity}
                style={{
                  transition: "opacity 360ms ease-out, stroke 220ms",
                }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

// ── Pills ────────────────────────────────────────────────────────

type ImpactTone = "high" | "moderate" | "low";

function ImpactPill({ tone }: { tone: ImpactTone }) {
  const label =
    tone === "high"
      ? "High impact"
      : tone === "moderate"
        ? "Moderate impact"
        : "Low impact";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
        tone === "high" &&
          "border-[color-mix(in_oklch,var(--ink-danger)_45%,transparent)] bg-[var(--ink-hover-danger)] text-[var(--ink-danger)]",
        tone === "moderate" &&
          "border-[var(--ats-miss-border)] bg-[var(--ats-miss-bg)] text-[var(--ats-miss-text)]",
        tone === "low" &&
          "border-[var(--ats-match-border)] bg-[var(--ats-match-bg)] text-[var(--ats-match-text)]",
      )}
    >
      {label}
    </span>
  );
}

function GradePill({ tone, label }: { tone: Tone; label: string }) {
  // Map our 5-tier grades onto the 3-tier pill palette.
  const impact: ImpactTone =
    tone === "excellent" || tone === "strong"
      ? "low"
      : tone === "fair"
        ? "moderate"
        : "high";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold shadow-chip-t",
        impact === "high" &&
          "border-[color-mix(in_oklch,var(--ink-danger)_45%,transparent)] bg-[var(--ink-hover-danger)] text-[var(--ink-danger)]",
        impact === "moderate" &&
          "border-[var(--ats-miss-border)] bg-[var(--ats-miss-bg)] text-[var(--ats-miss-text)]",
        impact === "low" &&
          "border-[var(--ats-match-border)] bg-[var(--ats-match-bg)] text-[var(--ats-match-text)]",
      )}
    >
      {label}
    </span>
  );
}

// ── Keyword group ─────────────────────────────────────────────────

function KeywordGroup({
  title,
  keywords,
  badge,
  tone,
  onChipClick,
}: {
  title: string;
  keywords: Keyword[];
  badge?: { label: string; tone: "danger" | "warn" };
  tone: "missing" | "matched";
  onChipClick?: (kw: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionLabel size="sm" tone="muted">
            {title}
            <span className="ml-1.5 tabular-nums text-ink-subtle">· {keywords.length}</span>
          </SectionLabel>
        </div>
        {badge && <GroupBadge {...badge} />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <KeywordChip
            key={kw.text}
            label={kw.display}
            tone={tone}
            onClick={onChipClick ? () => onChipClick(kw.display) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function GroupBadge({
  label,
  tone,
}: {
  label: string;
  tone: "danger" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold",
        tone === "danger" &&
          "border-[color-mix(in_oklch,var(--ink-danger)_45%,transparent)] bg-[var(--ink-hover-danger)] text-[var(--ink-danger)]",
        tone === "warn" &&
          "border-[var(--ats-miss-border)] bg-[var(--ats-miss-bg)] text-[var(--ats-miss-text)]",
      )}
    >
      {label}
    </span>
  );
}

// ── Keyword chip ──────────────────────────────────────────────────

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
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] leading-none shadow-chip-t transition-colors duration-fast",
    tone === "missing"
      ? "border-[var(--ats-miss-border)] bg-[var(--ats-miss-bg)] text-[var(--ats-miss-text)]"
      : "border-[var(--ats-match-border)] bg-[var(--ats-match-bg)] text-[var(--ats-match-text)]",
    interactive &&
      "cursor-pointer hover:bg-[var(--ats-miss-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ats-miss-border)]",
  );

  if (interactive) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.96 }}
        transition={spring.press}
        className={base}
        aria-label={`Copy "${label}" to clipboard`}
      >
        <Plus className="h-3 w-3" aria-hidden strokeWidth={2.5} />
        <span>{label}</span>
      </motion.button>
    );
  }
  return (
    <span className={base}>
      <Check className="h-3 w-3" aria-hidden strokeWidth={2.5} />
      <span>{label}</span>
    </span>
  );
}

// ── Tip line ─────────────────────────────────────────────────────
// Spec called for a left-border accent stripe; substituted with a
// leading icon + muted background per the impeccable skill's ban on
// side-stripe borders. Same informational-callout intent without
// the #1 AI design tell.
function TipLine() {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-ink-border bg-ink-surface px-3 py-2 text-[11px] leading-[1.5] text-ink-muted"
    >
      <Lightbulb
        className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink-subtle"
        aria-hidden
        strokeWidth={2.25}
      />
      <span>
        <span className="font-medium text-ink-text">Tip:</span> click any missing
        keyword to copy it, then paste where it fits naturally.
      </span>
    </div>
  );
}

// ── Color helpers ─────────────────────────────────────────────────

function scoreToRingColor(score: number): string {
  if (score >= 80) return "var(--ink-success)";
  if (score >= 50) return "var(--ink-warn)";
  return "var(--ink-danger)";
}
