"use client";

import { Document, Page, View, Text, Link, StyleSheet, Font } from "@react-pdf/renderer";
import type { Resume, SectionKind } from "@/lib/types";

// PDF uses the built-in Helvetica face — zero bytes embedded, always
// renders, and ATS-compatible. Font choice in the UI only affects the
// on-screen preview.
Font.registerHyphenationCallback((w) => [w]);

const C = {
  ink: "#262833",
  inkStrong: "#15171e",
  body: "#34363f",
  muted: "#6c6f7a",
  rule: "#d3d5dc",
  paper: "#fbfaf7",
  linkUrl: "#4552a0",
  bulletDot: "#5a5c67",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    color: C.ink,
    fontSize: 9.5,
    paddingTop: 44,
    paddingBottom: 48,
    paddingLeft: 46,
    paddingRight: 46,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 32,
  },
  headerLeft: { flexDirection: "column", flexShrink: 1 },
  name: {
    fontSize: 41,
    fontWeight: 500,
    letterSpacing: -1,
    lineHeight: 0.96,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: C.inkStrong,
    lineHeight: 1.2,
    letterSpacing: -0.05,
    marginTop: 6,
  },
  tagline: {
    fontSize: 10,
    color: C.body,
    lineHeight: 1.55,
    marginTop: 10,
    maxWidth: 360,
  },
  contactCol: {
    flexDirection: "column",
    alignItems: "flex-end",
    paddingTop: 10,
    gap: 2,
  },
  contact: { fontSize: 9.5, color: C.ink, lineHeight: 1.55 },
  contactLink: {
    fontSize: 9.5,
    color: C.ink,
    textDecoration: "underline",
    textDecorationColor: C.rule,
    lineHeight: 1.55,
  },

  dashDivider: {
    marginTop: 14,
    flexDirection: "row",
    gap: 3,
    height: 1,
    overflow: "hidden",
  },
  dash: {
    width: 4,
    height: 1,
    backgroundColor: C.rule,
  },

  body: {
    flexDirection: "row",
    marginTop: 14,
    gap: 28,
  },
  leftCol: { flexDirection: "column", flex: 1.55, gap: 22 },
  rightCol: { flexDirection: "column", flex: 1, gap: 22 },
  section: { flexDirection: "column", gap: 11 },
  sectionTitle: {
    fontSize: 21,
    fontWeight: 600,
    letterSpacing: -0.4,
    lineHeight: 1.1,
  },
  expItem: { flexDirection: "column" },
  expTitle: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: -0.1,
  },
  dates: { fontSize: 9, color: C.muted, marginTop: 3 },
  bullets: { flexDirection: "column", marginTop: 6, gap: 4, paddingLeft: 12 },
  bulletRow: { flexDirection: "row", gap: 6 },
  bulletDot: { fontSize: 9, color: C.bulletDot, lineHeight: 1.55, width: 4 },
  bulletText: { fontSize: 9.5, color: C.body, lineHeight: 1.55, flex: 1 },

  subLabel: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: -0.05,
  },
  skillGroup: { flexDirection: "column", gap: 3, marginBottom: 12 },
  skillItems: { fontSize: 9.5, color: C.body, lineHeight: 1.55 },

  edItem: { flexDirection: "column", gap: 2 },
  edTitle: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: -0.05,
  },
  edMeta: { fontSize: 9, color: C.muted, lineHeight: 1.4 },

  linkGroup: { flexDirection: "column", gap: 3, marginBottom: 12 },
  linkLabel: { fontSize: 11, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.05 },
  linkUrl: {
    fontSize: 8.5,
    color: C.linkUrl,
    textDecoration: "underline",
    textDecorationColor: C.linkUrl,
    lineHeight: 1.4,
  },
});

export function ResumeDocument({
  resume,
  metadata,
}: {
  resume: Resume;
  metadata: { title: string; author: string; includeMetadata: boolean };
}) {
  const { header, sectionOrder, sections, style } = resume;

  const titleFamily = "Helvetica";
  const bodyFamily = "Helvetica";
  const accent = style.accentColor;
  const subAccent = style.subAccentColor;

  const hasItems = (id: SectionKind) => {
    if (id === "experience") return resume.experience.length > 0;
    if (id === "skills") return resume.skillGroups.length > 0;
    if (id === "education") return resume.education.length > 0;
    if (id === "links") return resume.links.length > 0;
    return false;
  };

  const showExperience =
    sections.experience.visible && hasItems("experience");
  const rightIds = sectionOrder.filter(
    (id) => id !== "experience" && sections[id].visible && hasItems(id),
  );

  // A4 width 595pt − 92pt horizontal padding = 503pt content. Each dash unit
  // is width:4 + gap:3 = 7pt. 503/7 ≈ 72 dashes for a clean edge-to-edge run.
  const DASH_COUNT = 72;

  const pageStyle = { ...styles.page, fontFamily: bodyFamily };

  return (
    <Document
      title={metadata.includeMetadata ? metadata.title : undefined}
      author={metadata.includeMetadata ? metadata.author : undefined}
      creator={metadata.includeMetadata ? "Resume Builder" : undefined}
      producer={metadata.includeMetadata ? "Resume Builder" : undefined}
    >
      <Page size="A4" style={pageStyle}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={{
                ...styles.name,
                color: accent,
                fontFamily: titleFamily,
                fontWeight: style.nameFontWeight,
                letterSpacing: style.nameLetterSpacing * 41,
              }}
            >
              {header.name}
            </Text>
            {header.title ? (
              <Text
                style={{
                  ...styles.title,
                  fontFamily: titleFamily,
                  color: accent,
                  fontWeight: style.sectionTitleWeight,
                  lineHeight: style.sectionTitleLineHeight,
                }}
              >
                {header.title}
              </Text>
            ) : null}
            {header.tagline ? (
              <Text
                style={{
                  ...styles.tagline,
                  lineHeight: style.bodyLineHeight,
                  fontWeight: style.bodyWeight,
                }}
              >
                {header.tagline}
              </Text>
            ) : null}
          </View>
          <View style={styles.contactCol}>
            {header.contacts.map((c) => (
              <View key={c.id}>
                {c.href ? (
                  <Link src={c.href} style={styles.contactLink}>
                    {c.value}
                  </Link>
                ) : (
                  <Text style={styles.contact}>{c.value}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Dashed divider */}
        <View style={styles.dashDivider}>
          {Array.from({ length: DASH_COUNT }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.leftCol}>
            {showExperience && (
              <View style={styles.section}>
                <Text
                  style={{
                    ...styles.sectionTitle,
                    color: accent,
                    fontFamily: titleFamily,
                    fontWeight: style.sectionTitleWeight,
                    lineHeight: style.sectionTitleLineHeight,
                  }}
                >
                  {sections.experience.title}
                </Text>
                <ExperienceBlock
                  resume={resume}
                  bodyFamily={bodyFamily}
                  bodyLH={style.bodyLineHeight}
                  subAccent={subAccent}
                  subWeight={style.subTitleWeight}
                  subLH={style.subTitleLineHeight}
                  bodyWeight={style.bodyWeight}
                />
              </View>
            )}
          </View>

          <View style={styles.rightCol}>
            {rightIds.map((id) => (
              <View key={id} style={styles.section}>
                <Text
                  style={{
                    ...styles.sectionTitle,
                    color: accent,
                    fontFamily: titleFamily,
                    fontWeight: style.sectionTitleWeight,
                    lineHeight: style.sectionTitleLineHeight,
                  }}
                >
                  {sections[id].title}
                </Text>
                {renderRight(id, resume, {
                  bodyFamily,
                  bodyLH: style.bodyLineHeight,
                  subAccent,
                  subWeight: style.subTitleWeight,
                  subLH: style.subTitleLineHeight,
                  bodyWeight: style.bodyWeight,
                })}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

type PdfBodyCtx = {
  bodyFamily: string;
  bodyLH: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight: number;
};

function renderRight(id: SectionKind, resume: Resume, ctx: PdfBodyCtx) {
  if (id === "skills") return <SkillsBlock resume={resume} {...ctx} />;
  if (id === "education") return <EducationBlock resume={resume} {...ctx} />;
  if (id === "links") return <LinksBlock resume={resume} {...ctx} />;
  return null;
}

function ExperienceBlock({
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
    <View style={{ flexDirection: "column", gap: 16 }}>
      {resume.experience.map((e) => (
        <View key={e.id} style={styles.expItem}>
          <Text
            style={{
              ...styles.expTitle,
              color: subAccent,
              fontFamily: bodyFamily,
              fontWeight: subWeight,
              lineHeight: subLH,
            }}
          >
            {e.role}
            {e.role && e.company ? " — " : ""}
            {e.company}
          </Text>
          {(e.startDate || e.endDate) && (
            <Text style={styles.dates}>
              {e.startDate}
              {e.startDate && e.endDate ? " – " : ""}
              {e.endDate}
            </Text>
          )}
          {e.bullets.filter((b) => b.text.trim()).length > 0 && (
            <View style={styles.bullets}>
              {e.bullets
                .filter((b) => b.text.trim())
                .map((b) => (
                  <View key={b.id} style={styles.bulletRow}>
                    <Text style={{ ...styles.bulletDot, lineHeight: bodyLH }}>•</Text>
                    <Text
                      style={{
                        ...styles.bulletText,
                        lineHeight: bodyLH,
                        fontWeight: bodyWeight,
                      }}
                    >
                      {b.text}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function SkillsBlock({
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
    <View>
      {resume.skillGroups.map((g) => (
        <View key={g.id} style={styles.skillGroup}>
          <Text
            style={{
              ...styles.subLabel,
              color: subAccent,
              fontFamily: bodyFamily,
              fontWeight: subWeight,
              lineHeight: subLH,
            }}
          >
            {g.label}
          </Text>
          <Text
            style={{
              ...styles.skillItems,
              lineHeight: bodyLH,
              fontWeight: bodyWeight,
            }}
          >
            {g.items}
          </Text>
        </View>
      ))}
    </View>
  );
}

function EducationBlock({
  resume,
  bodyFamily,
  subAccent,
  subWeight,
  subLH,
}: {
  resume: Resume;
  bodyFamily: string;
  bodyLH?: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight?: number;
}) {
  return (
    <View style={{ flexDirection: "column", gap: 6 }}>
      {resume.education.map((ed) => (
        <View key={ed.id} style={styles.edItem}>
          <View>
            <Text
              style={{
                ...styles.edTitle,
                color: subAccent,
                fontFamily: bodyFamily,
                fontWeight: subWeight,
                lineHeight: subLH,
              }}
            >
              {ed.degree}
            </Text>
            {ed.field ? (
              <Text
                style={{
                  ...styles.edTitle,
                  color: subAccent,
                  fontFamily: bodyFamily,
                  fontWeight: subWeight,
                  lineHeight: subLH,
                }}
              >
                {ed.field}
              </Text>
            ) : null}
          </View>
          {(ed.institution || ed.year) && (
            <Text style={styles.edMeta}>
              {ed.institution}
              {ed.institution && ed.year ? " • " : ""}
              {ed.year}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function LinksBlock({
  resume,
  bodyFamily,
  subAccent,
  subWeight,
  subLH,
}: {
  resume: Resume;
  bodyFamily: string;
  bodyLH?: number;
  subAccent: string;
  subWeight: number;
  subLH: number;
  bodyWeight?: number;
}) {
  return (
    <View>
      {resume.links.map((l) => (
        <View key={l.id} style={styles.linkGroup}>
          <Text
            style={{
              ...styles.linkLabel,
              color: subAccent,
              fontFamily: bodyFamily,
              fontWeight: subWeight,
              lineHeight: subLH,
            }}
          >
            {l.label}
          </Text>
          {l.url ? (
            <Link src={l.url} style={styles.linkUrl}>
              {l.url}
            </Link>
          ) : null}
        </View>
      ))}
    </View>
  );
}
