import type { Style } from "./types";
import { themeById } from "./themes";

// ── Template registry ─────────────────────────────────────────────
// A template is a preset pairing of a LAYOUT (which render path
// ResumePreview uses) and a STYLE payload (fonts / theme / weights /
// spacing). Applying a template overwrites both on the active
// variant — content stays, chrome swaps.
//
// v2.0 ships 2 layouts (two-column, single-column). v2.1 will add
// sidebar-left and executive. Keeping `layoutId` as a string means
// older saved variants referencing a layout we haven't rebuilt yet
// fall back gracefully to two-column in ResumePreview.

export type TemplateLayoutId = "two-column" | "single-column";

export type Template = {
  id: string;
  label: string;
  /** One-line ATS-honesty description shown under the template card. */
  description: string;
  /** "ats-safe" = single-column, universally parsed. "modern" = looks
   *  great in newer ATSes (Workday / Greenhouse / Lever) but can
   *  confuse older ones (Taleo / iCIMS). We show this as a small pill
   *  on each card so users pick with eyes open. */
  atsBadge: "ats-safe" | "modern";
  layoutId: TemplateLayoutId;
  style: Style;
};

// Style helpers — keep template defs readable by composing from the
// theme registry + sensible font / weight defaults per template.
function buildStyle(overrides: Partial<Style>): Style {
  const base: Style = {
    titleFontId: "source-serif",
    bodyFontId: "geist",
    themeId: "navy",
    accentColor: themeById("navy").accent,
    subAccentColor: themeById("navy").sub,
    nameFontWeight: 500,
    sectionTitleWeight: 600,
    subTitleWeight: 700,
    bodyWeight: 400,
    nameLetterSpacing: -0.024,
    bodyLineHeight: 1.55,
    sectionTitleLineHeight: 1.1,
    subTitleLineHeight: 1.3,
  };
  return { ...base, ...overrides };
}

function styleForTheme(themeId: string, overrides: Partial<Style> = {}): Style {
  const t = themeById(themeId);
  return buildStyle({
    themeId,
    accentColor: t.accent,
    subAccentColor: t.sub,
    ...overrides,
  });
}

export const TEMPLATES: Template[] = [
  {
    id: "navy-classic",
    label: "Navy Classic",
    description: "Two-column · serif headings · navy accent",
    atsBadge: "modern",
    layoutId: "two-column",
    style: styleForTheme("navy"),
  },
  {
    id: "ats-safe",
    label: "ATS Safe",
    description: "Single column · sans throughout · parses cleanly in every ATS",
    atsBadge: "ats-safe",
    layoutId: "single-column",
    style: styleForTheme("ink", {
      titleFontId: "geist",
      bodyFontId: "geist",
    }),
  },
];

export const DEFAULT_TEMPLATE_ID = "navy-classic";

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
