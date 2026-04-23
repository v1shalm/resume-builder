import type {
  Bullet,
  Contact,
  EducationItem,
  ExperienceItem,
  LinkItem,
  Resume,
  SkillGroup,
} from "./types";
import { seedResume } from "./seed";

/**
 * Rule-based parser that turns a pasted-in resume (or LinkedIn export,
 * or plain-text CV) into our Resume schema. Deterministic, no LLM,
 * runs client-side.
 *
 * Philosophy: never lose content. If we can't confidently assign a line,
 * it still lands in the structure (usually as a bullet under the
 * current role or as an untitled entry) so the user can re-home it in
 * the review step rather than hunt for missing text.
 *
 * The review step is the safety net — callers should ALWAYS render it
 * before committing `result.resume` into the store.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE =
  /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/;
const URL_RE = /(?:https?:\/\/|www\.)[^\s)\]]+/gi;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i;
const DRIBBBLE_RE = /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/[\w-]+/i;
const TWITTER_RE = /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[\w-]+/i;

// Month–year date token (with optional month + range). Matches things
// like "Dec 2023 – Present", "Jul 2022 - Nov 2023", "2018 – 2022".
const DATE_RE =
  /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\s*(?:[–—\-‐]\s*(?:Present|Now|Current|Today|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}))?/i;

// Bullet markers — covers common Unicode dots users paste from Word,
// LinkedIn, Notion, etc.
const BULLET_RE = /^\s*(?:[•*·‣▪▫►∙⁃\-–—])\s+(.+)$/;

// Normalised section heading → our internal section key.
const SECTION_HEADINGS: Record<string, Section> = {
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "work history": "experience",
  employment: "experience",
  "employment history": "experience",
  projects: "experience",
  "selected projects": "experience",
  education: "education",
  "academic background": "education",
  qualifications: "education",
  skills: "skills",
  "skills and tools": "skills",
  "skills & tools": "skills",
  "technical skills": "skills",
  "tools and technologies": "skills",
  "tools & technologies": "skills",
  competencies: "skills",
  links: "links",
  "online presence": "links",
  "social links": "links",
  profiles: "links",
  summary: "tagline",
  about: "tagline",
  profile: "tagline",
  "about me": "tagline",
};

type Section = "experience" | "education" | "skills" | "links" | "tagline";

export type ParseWarning = {
  id: string;
  message: string;
  severity: "info" | "warning";
};

export type ParseResult = {
  resume: Resume;
  warnings: ParseWarning[];
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

function ensureHttps(url: string): string {
  const trimmed = url.trim().replace(/[),.;]+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function stripHttp(url: string): string {
  return url.replace(/^https?:\/\/(?:www\.)?/i, "").replace(/\/$/, "");
}

function normalizeHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelySectionHeading(line: string): Section | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 40) return null;
  // Section headings are usually on their own line and often all-caps or
  // Title Case. Look them up in the table regardless of case.
  const key = normalizeHeading(trimmed);
  return SECTION_HEADINGS[key] ?? null;
}

// ────────────────────────────────────────────────────────────────────

export function parseResumeText(input: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const text = input.replace(/\r\n/g, "\n").trim();

  if (!text) {
    return {
      resume: makeEmptyResume(),
      warnings: [{ id: "empty", message: "Nothing to parse.", severity: "warning" }],
    };
  }

  const lines = text.split("\n").map((l) => l.replace(/\s+$/g, ""));

  // ── 1. Extract contacts + URLs from the whole document ──
  const email = (text.match(EMAIL_RE) ?? [])[0];
  const phone = (text.match(PHONE_RE) ?? [])[0];
  const urls = Array.from(text.matchAll(URL_RE)).map((m) =>
    m[0].replace(/[),.;]+$/, ""),
  );
  const uniqueUrls = Array.from(new Set(urls));
  const linkedin = uniqueUrls.find((u) => LINKEDIN_RE.test(u));
  const github = uniqueUrls.find((u) => GITHUB_RE.test(u));
  const dribbble = uniqueUrls.find((u) => DRIBBBLE_RE.test(u));
  const twitter = uniqueUrls.find((u) => TWITTER_RE.test(u));
  const portfolio = uniqueUrls.find(
    (u) =>
      u !== linkedin &&
      u !== github &&
      u !== dribbble &&
      u !== twitter &&
      !u.startsWith("mailto:"),
  );

  // ── 2. Header block: name (first non-empty line), title (next) ──
  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0);
  const name =
    firstNonEmptyIdx >= 0 ? lines[firstNonEmptyIdx].trim() : "";

  let title = "";
  let cursor = firstNonEmptyIdx + 1;
  while (cursor < lines.length && lines[cursor].trim().length === 0) cursor++;
  if (cursor < lines.length) {
    const candidate = lines[cursor].trim();
    const looksLikeContactLine =
      EMAIL_RE.test(candidate) ||
      PHONE_RE.test(candidate) ||
      URL_RE.test(candidate);
    if (!looksLikeContactLine && candidate.length <= 80) {
      title = candidate;
      cursor++;
    }
  }

  // ── 3. Locate every section boundary ──
  type SectionHit = { section: Section; lineIdx: number };
  const sectionHits: SectionHit[] = [];
  lines.forEach((l, i) => {
    const hit = isLikelySectionHeading(l);
    if (hit) sectionHits.push({ section: hit, lineIdx: i });
  });

  // ── 4. Tagline: from end of title line to first section (or to end
  // if there are no sections), minus contact-ish lines. ──
  const bodyStart = cursor;
  const bodyEnd =
    sectionHits.length > 0 ? sectionHits[0].lineIdx : lines.length;
  const taglineLines = lines
    .slice(bodyStart, bodyEnd)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !EMAIL_RE.test(l) &&
        !PHONE_RE.test(l) &&
        !URL_RE.test(l) &&
        !isLikelySectionHeading(l),
    );
  const tagline = taglineLines.join(" ").replace(/\s+/g, " ").trim();

  // ── 5. Per-section content ──
  const experience: ExperienceItem[] = [];
  const education: EducationItem[] = [];
  const skillGroups: SkillGroup[] = [];
  const extraLinks: LinkItem[] = [];
  let taglineFromSection = "";

  for (let i = 0; i < sectionHits.length; i++) {
    const hit = sectionHits[i];
    const nextHit = sectionHits[i + 1];
    const bodyLines = lines.slice(
      hit.lineIdx + 1,
      nextHit ? nextHit.lineIdx : lines.length,
    );

    if (hit.section === "experience") {
      experience.push(...parseExperienceBlock(bodyLines));
    } else if (hit.section === "education") {
      education.push(...parseEducationBlock(bodyLines));
    } else if (hit.section === "skills") {
      skillGroups.push(...parseSkillsBlock(bodyLines));
    } else if (hit.section === "links") {
      extraLinks.push(...parseLinksBlock(bodyLines));
    } else if (hit.section === "tagline") {
      taglineFromSection = bodyLines
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ");
    }
  }

  // ── 6. Build final resume ──
  const contacts: Contact[] = [];
  if (email) {
    contacts.push({
      id: uid(),
      label: "email",
      value: email,
      href: `mailto:${email}`,
    });
  }
  if (phone) contacts.push({ id: uid(), label: "phone", value: phone.trim() });
  if (portfolio) {
    contacts.push({
      id: uid(),
      label: "site",
      value: stripHttp(portfolio),
      href: ensureHttps(portfolio),
    });
  }

  const links: LinkItem[] = [];
  if (portfolio)
    links.push({ id: uid(), label: "Portfolio", url: ensureHttps(portfolio) });
  if (linkedin)
    links.push({ id: uid(), label: "LinkedIn", url: ensureHttps(linkedin) });
  if (github)
    links.push({ id: uid(), label: "GitHub", url: ensureHttps(github) });
  if (dribbble)
    links.push({ id: uid(), label: "Dribbble", url: ensureHttps(dribbble) });
  if (twitter)
    links.push({ id: uid(), label: "Twitter", url: ensureHttps(twitter) });
  for (const l of extraLinks) {
    if (!links.some((existing) => existing.url === l.url)) links.push(l);
  }

  // ── 7. Warnings — flag things the user should double-check ──
  if (!name) warnings.push({ id: "no-name", message: "No name detected — first line looks empty.", severity: "warning" });
  if (!email) warnings.push({ id: "no-email", message: "No email detected.", severity: "info" });
  if (experience.length === 0)
    warnings.push({ id: "no-experience", message: "No experience entries detected.", severity: "warning" });
  if (skillGroups.length === 0)
    warnings.push({ id: "no-skills", message: "No skills section detected.", severity: "info" });

  const resume: Resume = {
    header: {
      name,
      title,
      tagline: taglineFromSection || tagline,
      contacts,
    },
    sectionOrder: seedResume.sectionOrder,
    sections: seedResume.sections,
    experience,
    skillGroups,
    education,
    links,
    style: seedResume.style,
  };

  return { resume, warnings };
}

// ── Section parsers ────────────────────────────────────────────────

function parseExperienceBlock(lines: string[]): ExperienceItem[] {
  const items: ExperienceItem[] = [];
  let cur: ExperienceItem | null = null;

  const flush = () => {
    if (cur) items.push(cur);
    cur = null;
  };

  for (const raw of lines) {
    const l = raw.trim();
    if (l.length === 0) continue;

    const bulletMatch = l.match(BULLET_RE);
    if (bulletMatch) {
      if (!cur) {
        cur = { id: uid(), company: "", role: "", startDate: "", endDate: "", bullets: [] };
      }
      cur.bullets.push({ id: uid(), text: bulletMatch[1].trim() });
      continue;
    }

    const dateMatch = l.match(DATE_RE);
    const hasSeparator = /[—–·|]/.test(l);

    // A line is likely a role heading if it contains a separator
    // (em/en dash, middle dot, pipe), OR carries a date inline.
    const likelyHeading = hasSeparator || dateMatch;

    if (likelyHeading) {
      flush();
      cur = parseRoleHeading(l);
      continue;
    }

    // If we already have a current role but no dates yet, and this
    // line looks like a dates-only line, attach to the current role.
    if (cur && !cur.startDate && dateMatch) {
      const { startDate, endDate } = splitDateRange(dateMatch[0]);
      cur.startDate = startDate;
      cur.endDate = endDate;
      continue;
    }

    // Otherwise: if we have a current role, treat this line as a
    // bullet (paragraph description). If not, treat as a role heading
    // with just the text in `role`.
    if (cur) {
      cur.bullets.push({ id: uid(), text: l });
    } else {
      cur = { id: uid(), company: "", role: l, startDate: "", endDate: "", bullets: [] };
    }
  }

  flush();
  return items;
}

function parseRoleHeading(line: string): ExperienceItem {
  const dateMatch = line.match(DATE_RE);
  const withoutDate = dateMatch ? line.replace(dateMatch[0], "").trim() : line;
  // Strip trailing separators left over from date removal
  const cleaned = withoutDate.replace(/[—–·|,\s]+$/, "").trim();
  const parts = cleaned.split(/\s[—–·|]\s|\s{2,}/).map((s) => s.trim()).filter(Boolean);

  let role = "";
  let company = "";
  if (parts.length >= 2) {
    [role, company] = parts;
  } else if (parts.length === 1) {
    role = parts[0];
  }

  const { startDate, endDate } = dateMatch
    ? splitDateRange(dateMatch[0])
    : { startDate: "", endDate: "" };

  return {
    id: uid(),
    company,
    role,
    startDate,
    endDate,
    bullets: [],
  };
}

function splitDateRange(range: string): { startDate: string; endDate: string } {
  const parts = range.split(/[–—\-‐]/).map((s) => s.trim());
  if (parts.length >= 2) return { startDate: parts[0], endDate: parts[1] };
  return { startDate: parts[0] ?? "", endDate: "" };
}

function parseEducationBlock(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  // Group contiguous non-empty lines into one entry.
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const joined = buffer.join(" | ");
    const yearMatch = joined.match(DATE_RE)?.[0] ?? "";
    const withoutYear = joined.replace(DATE_RE, "").trim();
    const parts = withoutYear
      .split(/[—–·|,]|(?:\s\|\s)/)
      .map((s) => s.trim())
      .filter(Boolean);
    const degree = parts[0] ?? "";
    const field = parts[1] ?? "";
    const institution = parts[2] ?? parts[1] ?? "";
    items.push({
      id: uid(),
      degree,
      field: parts.length >= 3 ? field : "",
      institution,
      year: yearMatch,
    });
    buffer = [];
  };

  for (const raw of lines) {
    const l = raw.trim();
    if (l.length === 0) flush();
    else buffer.push(l);
  }
  flush();
  return items;
}

function parseSkillsBlock(lines: string[]): SkillGroup[] {
  const groups: SkillGroup[] = [];
  let currentLabel = "";
  let currentItems: string[] = [];

  const flush = () => {
    if (currentItems.length === 0 && !currentLabel) return;
    groups.push({
      id: uid(),
      label: currentLabel || "Skills",
      items: currentItems.join(", "),
    });
    currentLabel = "";
    currentItems = [];
  };

  for (const raw of lines) {
    const l = raw.trim();
    if (l.length === 0) {
      flush();
      continue;
    }
    // "Label: item, item, item" → split on first colon
    const colonIdx = l.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      flush();
      currentLabel = l.slice(0, colonIdx).trim();
      const body = l.slice(colonIdx + 1).trim();
      if (body) currentItems.push(...body.split(/,\s*/).map((s) => s.trim()).filter(Boolean));
    } else {
      currentItems.push(...l.split(/,\s*/).map((s) => s.trim()).filter(Boolean));
    }
  }
  flush();
  return groups;
}

function parseLinksBlock(lines: string[]): LinkItem[] {
  const items: LinkItem[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const urlMatch = l.match(URL_RE);
    if (!urlMatch) continue;
    const url = ensureHttps(urlMatch[0].replace(/[),.;]+$/, ""));
    // Label is the text before the URL if any; else guess from the URL.
    const beforeUrl = l.slice(0, l.indexOf(urlMatch[0])).trim().replace(/[:\-–—·]+$/, "").trim();
    const label = beforeUrl || guessLinkLabel(url);
    items.push({ id: uid(), label, url });
  }
  return items;
}

function guessLinkLabel(url: string): string {
  if (LINKEDIN_RE.test(url)) return "LinkedIn";
  if (GITHUB_RE.test(url)) return "GitHub";
  if (DRIBBBLE_RE.test(url)) return "Dribbble";
  if (TWITTER_RE.test(url)) return "Twitter";
  return "Website";
}

function makeEmptyResume(): Resume {
  return {
    header: { name: "", title: "", tagline: "", contacts: [] },
    sectionOrder: seedResume.sectionOrder,
    sections: seedResume.sections,
    experience: [],
    skillGroups: [],
    education: [],
    links: [],
    style: seedResume.style,
  };
}

// Re-export for tests / callers wanting to spread Bullet / ExperienceItem etc.
export type { Bullet, Contact, EducationItem, ExperienceItem, LinkItem, SkillGroup };
