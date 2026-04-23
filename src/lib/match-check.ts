import type { Resume } from "./types";

// ── Match Check ────────────────────────────────────────────────────
// Rule-based keyword extraction + coverage scoring. Deterministic,
// client-side, no LLM. We're honest that this isn't a real "ATS
// score" — ATS systems don't publish their algorithms. What we
// actually do: extract the salient terms from a job description,
// check which ones appear in the resume, and report coverage.
//
// Good enough for v1; LLM-assisted synonym grouping can slot in
// later behind the same `matchCheck()` interface.

// English stopwords + resume-specific noise. Kept tight so we don't
// filter out genuinely meaningful short words like "UX", "QA", "API".
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at",
  "for", "with", "by", "from", "as", "is", "are", "was", "were", "be",
  "been", "being", "has", "have", "had", "do", "does", "did", "will",
  "would", "should", "could", "may", "might", "can", "shall", "must",
  "this", "that", "these", "those", "it", "its", "they", "them", "we",
  "you", "your", "our", "their", "who", "what", "which", "when", "where",
  "how", "why", "all", "any", "some", "such", "only", "also", "not",
  "no", "yes", "about", "into", "through", "during", "before", "after",
  "above", "below", "up", "down", "out", "over", "under", "again",
  "further", "then", "once", "here", "there", "so", "than", "too",
  "very", "just", "more", "most", "other", "own", "same", "if",
  "because", "while", "even",
  // resume-speak noise
  "role", "roles", "work", "working", "team", "teams", "teamwork",
  "responsibilities", "responsibility", "duties", "strong", "great",
  "excellent", "passionate", "motivated", "ability", "able", "years",
  "year", "experience", "experienced", "required", "requirements",
  "must", "plus", "nice", "bonus", "including", "includes", "etc",
  // pronouns already above but add ones like
  "e.g", "i.e", "per", "via",
]);

// Short tokens that are legitimately meaningful — keep them even
// though they'd normally be filtered by length.
const SHORT_KEEP = new Set(["ux", "ui", "qa", "ai", "ml", "db", "go", "r"]);

type WeightedToken = {
  key: string;       // lowercase form, used for matching
  display: string;   // preferred-case form, shown to user
  weight: number;    // relative salience, higher = more important
};

export type MatchCheckResult = {
  /** Coverage score 0–100, rounded. `null` if we couldn't extract
   *  enough keywords (JD too short or empty). */
  coverage: number | null;
  /** Raw keyword counts — handy for summary copy. */
  totals: {
    matched: number;
    missing: number;
    extracted: number;
  };
  /** Keywords found in the resume, highest-weight first. */
  matched: string[];
  /** Keywords NOT found in the resume, highest-weight first — the
   *  actionable list. */
  missing: string[];
};

/**
 * Score a resume against a pasted job description.
 *
 * Algorithm:
 *   1. Tokenize the JD, filter stopwords/punctuation.
 *   2. Weight tokens by frequency + capitalization (proper nouns,
 *      acronyms) + position (first 500 chars gets a boost — job
 *      titles and lead skills are usually up top).
 *   3. Take the top ~30 by weight.
 *   4. Flatten the resume to a searchable lowercase string.
 *   5. For each keyword, test substring presence.
 */
export function matchCheck(resume: Resume, jdRaw: string): MatchCheckResult {
  const jd = jdRaw.trim();

  if (jd.length < 40) {
    return {
      coverage: null,
      totals: { matched: 0, missing: 0, extracted: 0 },
      matched: [],
      missing: [],
    };
  }

  const keywords = extractKeywords(jd);
  if (keywords.length === 0) {
    return {
      coverage: null,
      totals: { matched: 0, missing: 0, extracted: 0 },
      matched: [],
      missing: [],
    };
  }

  const haystack = flattenResume(resume).toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const k of keywords) {
    if (haystack.includes(k.key)) matched.push(k.display);
    else missing.push(k.display);
  }

  const coverage = Math.round((matched.length / keywords.length) * 100);

  return {
    coverage,
    totals: {
      matched: matched.length,
      missing: missing.length,
      extracted: keywords.length,
    },
    matched,
    missing,
  };
}

function extractKeywords(jd: string): WeightedToken[] {
  // Tokenize — split on any non-word char, preserving case for the
  // weighting step. We treat things like "TypeScript" and "ML-Ops"
  // by keeping alphanumerics and stripping the rest.
  const raw = jd.match(/[A-Za-z][A-Za-z0-9+#./-]*/g) ?? [];

  // Aggregate by lowercase key, recording the first-seen index
  // (used for position weighting) and preferring "proper case" /
  // all-caps forms for the display string.
  const counts = new Map<string, { count: number; firstIdx: number; display: string }>();
  let charsSeen = 0;
  for (const token of raw) {
    const key = token.toLowerCase();
    if (STOPWORDS.has(key)) {
      charsSeen += token.length;
      continue;
    }
    if (key.length < 3 && !SHORT_KEEP.has(key)) {
      charsSeen += token.length;
      continue;
    }
    const entry = counts.get(key);
    if (!entry) {
      counts.set(key, { count: 1, firstIdx: charsSeen, display: token });
    } else {
      entry.count += 1;
      // Prefer a more "proper" casing for display — an all-caps form
      // beats a lowercase one ("SQL" > "sql"), and anything with a
      // capital beats all-lowercase ("Kubernetes" > "kubernetes").
      if (preferCasing(token, entry.display)) entry.display = token;
    }
    charsSeen += token.length;
  }

  const jdLen = Math.max(1, jd.length);

  const weighted: WeightedToken[] = [];
  for (const [key, { count, firstIdx, display }] of counts) {
    // Frequency: log-scaled so 2 occurrences don't dominate over 5
    const fw = Math.log2(count + 1);

    // Capitalization: proper noun / acronym = more salient
    const capsW =
      /^[A-Z][A-Z0-9+#/.-]+$/.test(display) ? 1.4 // ALL CAPS / acronym-y
      : /^[A-Z]/.test(display)              ? 1.15 // Proper noun
      : 1.0;

    // Position: appearing in the first 25% of the JD is almost
    // always more important (titles, lead skills up top).
    const posFrac = firstIdx / jdLen;
    const posW = posFrac < 0.25 ? 1.25 : posFrac < 0.5 ? 1.1 : 1.0;

    weighted.push({
      key,
      display,
      weight: fw * capsW * posW,
    });
  }

  weighted.sort((a, b) => b.weight - a.weight);

  // Cap at ~30 — more than that and the drawer becomes a wall of
  // chips; less and we miss meaningful terms.
  return weighted.slice(0, 30);
}

function preferCasing(a: string, b: string): boolean {
  // Returns true iff `a` is a better display than `b`.
  const aAllCaps = /^[A-Z][A-Z0-9+#/.-]+$/.test(a);
  const bAllCaps = /^[A-Z][A-Z0-9+#/.-]+$/.test(b);
  if (aAllCaps && !bAllCaps) return true;
  if (bAllCaps && !aAllCaps) return false;
  const aProper = /^[A-Z]/.test(a);
  const bProper = /^[A-Z]/.test(b);
  return aProper && !bProper;
}

function flattenResume(resume: Resume): string {
  const parts: string[] = [
    resume.header.name,
    resume.header.title,
    resume.header.tagline,
    ...resume.header.contacts.flatMap((c) => [c.label, c.value]),
    ...resume.experience.flatMap((e) => [
      e.company,
      e.role,
      e.startDate,
      e.endDate,
      ...e.bullets.map((b) => b.text),
    ]),
    ...resume.skillGroups.flatMap((g) => [g.label, g.items]),
    ...resume.education.flatMap((e) => [e.degree, e.field, e.institution, e.year]),
    ...resume.links.flatMap((l) => [l.label, l.url]),
  ];
  return parts.join(" ");
}
