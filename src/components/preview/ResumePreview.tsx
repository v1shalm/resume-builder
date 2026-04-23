"use client";

import { forwardRef, memo } from "react";
import type { Resume, SectionKind } from "@/lib/types";
import { fontById } from "@/lib/fonts";

type Props = { resume: Resume };

// A4 page at 96 dpi (210mm × 297mm) — international resume standard.
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const T = {
  name: 54,
  title: 17,
  tagline: 13,
  contact: 12.5,

  sectionHeader: 28,

  entryTitle: 16,
  entryMeta: 12,

  subLabel: 14.5,

  body: 12.5,

  linkLabel: 15,
  linkUrl: 11.5,
} as const;

const COLOR = {
  inkStrong: "oklch(0.14 0.008 260)",
  ink: "oklch(0.2 0.008 260)",
  body: "oklch(0.24 0.008 260)",
  muted: "oklch(0.48 0.008 260)",
  subtle: "oklch(0.62 0.008 260)",
  rule: "oklch(0.82 0.006 260)",
  bulletDot: "oklch(0.38 0.008 260)",
  linkUrl: "oklch(0.48 0.15 260)",
} as const;

const ResumePreviewInner = forwardRef<HTMLDivElement, Props>(function ResumePreviewInner(
  { resume },
  ref,
) {
  const { header, sectionOrder, sections, style } = resume;
  const titleFamily = `'${fontById(style.titleFontId).family}', var(--font-sans)`;
  const bodyFamily = `'${fontById(style.bodyFontId).family}', var(--font-sans)`;
  const accent = style.accentColor;
  const subAccent = style.subAccentColor;
  const bodyLH = style.bodyLineHeight;

  const hasItems = (id: SectionKind) => {
    if (id === "experience") return resume.experience.length > 0;
    if (id === "skills") return resume.skillGroups.length > 0;
    if (id === "education") return resume.education.length > 0;
    if (id === "links") return resume.links.length > 0;
    return false;
  };

  const leftVisible = sections.experience.visible && hasItems("experience");
  const rightSections = sectionOrder.filter(
    (id) => id !== "experience" && sections[id].visible && hasItems(id),
  );

  return (
    <div
      ref={ref}
      className="paper"
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        padding: "56px 60px 60px",
        fontFamily: bodyFamily,
      }}
    >
      {/* Header band */}
      <header className="flex items-start justify-between gap-12">
        <div className="flex flex-col">
          <h1
            style={{
              color: accent,
              fontFamily: titleFamily,
              fontSize: T.name,
              fontWeight: style.nameFontWeight,
              letterSpacing: `${style.nameLetterSpacing}em`,
              lineHeight: 0.96,
            }}
          >
            {header.name}
          </h1>
          {header.title && (
            <p
              className="mt-3"
              style={{
                // Role under the name shares the Section-title treatment:
                // theme font, theme accent color, section-title weight + lh.
                fontFamily: titleFamily,
                fontSize: T.title,
                fontWeight: style.sectionTitleWeight,
                color: accent,
                lineHeight: style.sectionTitleLineHeight,
                letterSpacing: "-0.005em",
              }}
            >
              {header.title}
            </p>
          )}
          {header.tagline && (
            <p
              className="mt-4 max-w-[62ch]"
              style={{
                fontSize: T.tagline,
                color: COLOR.body,
                fontWeight: style.bodyWeight,
                lineHeight: bodyLH,
              }}
            >
              {header.tagline}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-[10px]">
          {header.contacts.map((c) => (
            <div
              key={c.id}
              style={{ fontSize: T.contact, color: COLOR.ink, lineHeight: 1.6 }}
            >
              {c.href ? (
                <a
                  href={c.href}
                  className="underline decoration-1 underline-offset-[3px]"
                  style={{ textDecorationColor: COLOR.rule }}
                >
                  {c.value}
                </a>
              ) : (
                c.value
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Dashed divider */}
      <div
        className="mt-5"
        style={{
          borderTop: `1px dashed ${COLOR.rule}`,
          height: 0,
        }}
        aria-hidden
      />

      {/* Body grid */}
      <div
        className="mt-5 grid gap-x-12"
        style={{ gridTemplateColumns: "1.55fr 1fr" }}
      >
        <div className="flex flex-col gap-9">
          {leftVisible && (
            <Section
              title={sections.experience.title}
              titleFamily={titleFamily}
              accent={accent}
              weight={style.sectionTitleWeight}
              lineHeight={style.sectionTitleLineHeight}
            >
              <ExperienceList
                resume={resume}
                bodyFamily={bodyFamily}
                bodyLH={bodyLH}
                subAccent={subAccent}
                subWeight={style.subTitleWeight}
                subLH={style.subTitleLineHeight}
                bodyWeight={style.bodyWeight}
              />
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-9">
          {rightSections.map((id) => (
            <Section
              key={id}
              title={sections[id].title}
              titleFamily={titleFamily}
              accent={accent}
              weight={style.sectionTitleWeight}
              lineHeight={style.sectionTitleLineHeight}
            >
              {renderSection(id, resume, {
                bodyFamily,
                bodyLH,
                subAccent,
                subWeight: style.subTitleWeight,
                subLH: style.subTitleLineHeight,
                bodyWeight: style.bodyWeight,
              })}
            </Section>
          ))}
        </div>
      </div>
    </div>
  );
});

// Memoised on `resume` reference. Since zustand produces a new resume
// object only when the resume actually changes, this skips re-renders
// caused by unrelated PreviewPane state (zoom, fitMode, toolbar anims).
export const ResumePreview = memo(ResumePreviewInner);
export const PREVIEW_PAGE_HEIGHT = PAGE_HEIGHT;
export const PREVIEW_PAGE_WIDTH = PAGE_WIDTH;

type BodyCtx = {
  bodyFamily: string;
  bodyLH: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight: number;
};

function renderSection(id: SectionKind, resume: Resume, ctx: BodyCtx) {
  if (id === "skills")
    return (
      <SkillsList
        resume={resume}
        bodyFamily={ctx.bodyFamily}
        bodyLH={ctx.bodyLH}
        subAccent={ctx.subAccent}
        subWeight={ctx.subWeight}
        subLH={ctx.subLH}
        bodyWeight={ctx.bodyWeight}
      />
    );
  if (id === "education")
    return (
      <EducationList
        resume={resume}
        bodyFamily={ctx.bodyFamily}
        subAccent={ctx.subAccent}
        subWeight={ctx.subWeight}
        subLH={ctx.subLH}
      />
    );
  if (id === "links")
    return (
      <LinksList
        resume={resume}
        bodyFamily={ctx.bodyFamily}
        subAccent={ctx.subAccent}
        subWeight={ctx.subWeight}
        subLH={ctx.subLH}
      />
    );
  return null;
}

function Section({
  title,
  children,
  titleFamily,
  accent,
  weight,
  lineHeight,
}: {
  title: string;
  children: React.ReactNode;
  titleFamily: string;
  accent: string;
  weight: number;
  lineHeight: number;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        style={{
          fontFamily: titleFamily,
          fontSize: T.sectionHeader,
          fontWeight: weight,
          letterSpacing: "-0.012em",
          color: accent,
          lineHeight,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExperienceList({
  resume,
  bodyFamily,
  bodyLH,
  subAccent,
  subWeight,
  subLH,
  bodyWeight,
}: {
  resume: Resume;
  bodyFamily: string;
  bodyLH: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight: number;
}) {
  return (
    <div className="flex flex-col gap-[22px]">
      {resume.experience.map((e) => (
        <article key={e.id} className="flex flex-col">
          <h3
            style={{
              fontFamily: bodyFamily,
              fontSize: T.entryTitle,
              fontWeight: subWeight,
              color: subAccent,
              lineHeight: subLH,
              letterSpacing: "-0.005em",
            }}
          >
            {e.role}
            {e.role && e.company ? " — " : ""}
            {e.company}
          </h3>
          {(e.startDate || e.endDate) && (
            <div
              className="mt-1"
              style={{
                fontSize: T.entryMeta,
                color: COLOR.muted,
                lineHeight: 1.4,
              }}
            >
              {e.startDate}
              {e.startDate && e.endDate ? " – " : ""}
              {e.endDate}
            </div>
          )}
          {e.bullets.filter((b) => b.text.trim()).length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-[8px] pl-[16px]">
              {e.bullets
                .filter((b) => b.text.trim())
                .map((b) => (
                  <li
                    key={b.id}
                    className="relative"
                    style={{
                      fontSize: T.body,
                      color: COLOR.body,
                      lineHeight: bodyLH,
                      fontWeight: bodyWeight,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-[-12px] top-[9px] h-[3px] w-[3px] rounded-full"
                      style={{ background: COLOR.bulletDot }}
                    />
                    {b.text}
                  </li>
                ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

function SkillsList({
  resume,
  bodyFamily,
  bodyLH,
  subAccent,
  subWeight,
  subLH,
  bodyWeight,
}: {
  resume: Resume;
  bodyFamily: string;
  bodyLH: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {resume.skillGroups.map((g) => (
        <div key={g.id} className="flex flex-col gap-1.5">
          <h3
            style={{
              fontFamily: bodyFamily,
              fontSize: T.subLabel,
              fontWeight: subWeight,
              color: subAccent,
              lineHeight: subLH,
              letterSpacing: "-0.005em",
            }}
          >
            {g.label}
          </h3>
          <p
            style={{
              fontSize: T.body,
              color: COLOR.body,
              lineHeight: bodyLH,
              fontWeight: bodyWeight,
            }}
          >
            {g.items}
          </p>
        </div>
      ))}
    </div>
  );
}

function EducationList({
  resume,
  bodyFamily,
  subAccent,
  subWeight,
  subLH,
}: {
  resume: Resume;
  bodyFamily: string;
  subAccent: string;
  subWeight: number;
  subLH: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {resume.education.map((ed) => (
        <div key={ed.id} className="flex flex-col gap-1">
          <div
            style={{
              fontFamily: bodyFamily,
              fontSize: T.subLabel,
              fontWeight: subWeight,
              color: subAccent,
              lineHeight: subLH,
              letterSpacing: "-0.005em",
            }}
          >
            <div>{ed.degree}</div>
            {ed.field ? <div>{ed.field}</div> : null}
          </div>
          {(ed.institution || ed.year) && (
            <div
              style={{
                fontSize: T.entryMeta,
                color: COLOR.muted,
                lineHeight: 1.4,
              }}
            >
              {ed.institution}
              {ed.institution && ed.year ? " • " : ""}
              {ed.year}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LinksList({
  resume,
  bodyFamily,
  subAccent,
  subWeight,
  subLH,
}: {
  resume: Resume;
  bodyFamily: string;
  subAccent: string;
  subWeight: number;
  subLH: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {resume.links.map((l) => (
        <div key={l.id} className="flex flex-col gap-1.5">
          <div
            style={{
              fontFamily: bodyFamily,
              fontSize: T.linkLabel,
              fontWeight: subWeight,
              color: subAccent,
              lineHeight: subLH,
              letterSpacing: "-0.005em",
            }}
          >
            {l.label}
          </div>
          {l.url && (
            <a
              href={l.url}
              className="underline decoration-1 underline-offset-[3px] break-all"
              style={{
                fontSize: T.linkUrl,
                color: COLOR.linkUrl,
                textDecorationColor: COLOR.linkUrl,
                lineHeight: 1.4,
              }}
            >
              {l.url}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
