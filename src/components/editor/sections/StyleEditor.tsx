"use client";

import * as React from "react";
import { motion } from "motion/react";
import { useResumeStore } from "@/lib/store";
import { FontSelect } from "@/components/ui/FontSelect";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { SliderField } from "@/components/ui/SliderField";
import { WeightPicker } from "@/components/ui/WeightPicker";
import { Field } from "./HeaderEditor";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

type Target = "name" | "section" | "subtitle" | "body";

const TARGETS: { id: Target; label: string; hint: string }[] = [
  { id: "name", label: "Name", hint: "Your biggest headline." },
  { id: "section", label: "Section", hint: "Your role, and Experience / Education / Skills / Links." },
  { id: "subtitle", label: "Subtitle", hint: "Entry titles, group labels, link labels." },
  { id: "body", label: "Body", hint: "Bullets, paragraphs, skill items." },
];

// Per-target line-height ranges — kept narrow around each level's
// sensible band (section titles need tighter leading than body copy).
const LH_RANGE: Record<Exclude<Target, "name">, { min: number; max: number; step: number }> = {
  section:  { min: 0.95, max: 1.4, step: 0.05 },
  subtitle: { min: 1.1,  max: 1.6, step: 0.05 },
  body:     { min: 1.2,  max: 1.9, step: 0.05 },
};

export function StyleEditor() {
  const style = useResumeStore((s) => s.resume.style);
  const update = useResumeStore((s) => s.updateStyle);
  const [target, setTarget] = React.useState<Target>("name");

  const weightByTarget: Record<Target, number> = {
    name: style.nameFontWeight,
    section: style.sectionTitleWeight,
    subtitle: style.subTitleWeight,
    body: style.bodyWeight,
  };
  const onWeightChange = (w: number) => {
    if (target === "name") update({ nameFontWeight: w });
    else if (target === "section") update({ sectionTitleWeight: w });
    else if (target === "subtitle") update({ subTitleWeight: w });
    else update({ bodyWeight: w });
  };

  const lhValue =
    target === "name"
      ? style.sectionTitleLineHeight // shown but disabled — render a plausible value
      : target === "section"
        ? style.sectionTitleLineHeight
        : target === "subtitle"
          ? style.subTitleLineHeight
          : style.bodyLineHeight;
  const onLhChange = (v: number) => {
    if (target === "section") update({ sectionTitleLineHeight: v });
    else if (target === "subtitle") update({ subTitleLineHeight: v });
    else if (target === "body") update({ bodyLineHeight: v });
  };
  const lhRange = target === "name" ? LH_RANGE.section : LH_RANGE[target];

  const currentTarget = TARGETS.find((t) => t.id === target)!;

  return (
    <section className="flex flex-col gap-8 border-t border-ink-border pt-7">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-ink-text">
          Typography &amp; theme
        </h3>
        <p className="text-[12px] leading-[1.5] text-ink-muted">
          Customize how your resume looks. Changes apply live.
        </p>
      </div>

      {/* FONTS */}
      <div className="flex flex-col gap-5">
        <Field label="Title font">
          <FontSelect
            value={style.titleFontId}
            onChange={(id) => update({ titleFontId: id })}
            aria-label="Title font"
          />
        </Field>

        <Field label="Body font">
          <FontSelect
            value={style.bodyFontId}
            onChange={(id) => update({ bodyFontId: id })}
            aria-label="Body font"
          />
        </Field>
      </div>

      {/* THEME */}
      <SubGroup
        title="Theme"
        hint="Accent (name + section titles) and sub-accent (subtitles)."
      >
        <ThemePicker
          value={style.themeId}
          onChange={(themeId, accent, sub) =>
            update({ themeId, accentColor: accent, subAccentColor: sub })
          }
          aria-label="Theme"
        />
      </SubGroup>

      {/* TYPOGRAPHY — target-focused panel */}
      <SubGroup title="Typography" hint={currentTarget.hint}>
        <TargetPills value={target} onChange={setTarget} />

        <Field label="Weight">
          <WeightPicker
            value={weightByTarget[target]}
            onChange={onWeightChange}
            aria-label={`${currentTarget.label} weight`}
          />
        </Field>

        <Field
          label="Tracking"
          hint={
            target === "name"
              ? "Negative tightens, positive opens."
              : "Only applies to the name."
          }
        >
          <SliderField
            value={style.nameLetterSpacing}
            onChange={(v) => update({ nameLetterSpacing: v })}
            min={-0.06}
            max={0.06}
            step={0.002}
            precision={3}
            suffix="em"
            disabled={target !== "name"}
            aria-label="Name letter spacing"
          />
        </Field>

        <Field
          label="Line height"
          hint={
            target === "name"
              ? "The name uses a fixed line height for heading spacing."
              : "Space between lines within this level."
          }
        >
          <SliderField
            value={lhValue}
            onChange={onLhChange}
            min={lhRange.min}
            max={lhRange.max}
            step={lhRange.step}
            precision={2}
            disabled={target === "name"}
            aria-label={`${currentTarget.label} line height`}
          />
        </Field>
      </SubGroup>
    </section>
  );
}

function TargetPills({
  value,
  onChange,
}: {
  value: Target;
  onChange: (t: Target) => void;
}) {
  const play = useSfx();
  return (
    <div
      role="radiogroup"
      aria-label="Edit target"
      className={cn(
        "relative flex items-center rounded-lg border border-ink-border bg-input p-[3px]",
        "shadow-[inset_0_1px_2px_var(--shadow-drop-mid),inset_0_0_0_1px_var(--shadow-edge-dark)]",
      )}
    >
      {TARGETS.map((t) => {
        const isActive = value === t.id;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => {
              if (!isActive) play("select");
              onChange(t.id);
            }}
            className={cn(
              "relative z-10 flex-1 rounded-md px-2 py-[5px] text-[11.5px] font-medium transition-colors duration-base",
              isActive ? "text-ink-text" : "text-ink-muted hover:text-ink-text",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="type-target-selector"
                transition={spring.soft}
                aria-hidden
                className={cn(
                  "absolute inset-0 -z-10 rounded-md border border-ink-border bg-card",
                  "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_1px_2px_var(--shadow-drop-close)]",
                )}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SubGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[11.5px] font-semibold text-ink-muted">
          {title}
        </h4>
        {hint ? (
          <span className="text-[11px] leading-[1.4] text-ink-subtle">{hint}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}
