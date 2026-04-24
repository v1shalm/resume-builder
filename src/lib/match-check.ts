import type { Resume } from "./types";

// ── Match Check v2 ────────────────────────────────────────────────
// Weighted, zone-aware keyword extraction + cascade matcher.
// Deterministic, client-side, no LLM. Not a real "ATS score" — ATS
// systems are opaque — but a reasonable proxy for how well a résumé
// echoes the vocabulary of a job description.
//
// Pipeline:
//   splitZones(jd) → { required, preferred }
//   extractKeywords(jd) → Keyword[] (phrases first, then singles)
//   dedupByStem(keywords) → canonical forms only
//   for each kw: isMatched(kw, resume) via cascade:
//     exact → stem → synonym → partial-phrase
//   weighted score + per-bucket sub-scores + grade

export type Zone = "required" | "preferred";
export type Bucket = "skills" | "softSkills" | "roleTerms";

export type Keyword = {
  /** Canonical lowercase form — what we match against. */
  text: string;
  /** Preferred casing for display in the UI. */
  display: string;
  weight: number;
  zone: Zone;
  bucket: Bucket;
};

export type Tone = "excellent" | "strong" | "fair" | "weak" | "poor";

export type Grade = {
  min: number;
  label: string;
  tone: Tone;
  message: string;
};

export type SubScore = { matched: number; total: number };

export type MatchCheckResult = {
  /** 0–100 integer score. 0 if JD is too short / empty. */
  score: number;
  /** True once the JD is long enough to run the algorithm. */
  hasJd: boolean;
  grade: Grade;
  matched: Keyword[];
  missing: { highImpact: Keyword[]; lowPriority: Keyword[] };
  subScores: {
    skills: SubScore;
    softSkills: SubScore;
    roleTerms: SubScore;
  };
  totals: { matched: number; extracted: number };
};

// ── Constants ──────────────────────────────────────────────────────

const MIN_JD_LENGTH = 40;

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for",
  "of","with","by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "that","this","these","those","it","its","as","up","out","our","your","their",
  "they","them","we","you","i","me","us","he","she","him","her","his",
  "who","what","which","when","where","how","why","than","then","also","only",
  "about","into","through","during","before","after","over","under","again",
]);

// Words that would otherwise slip past STOP_WORDS filtering but add
// no signal in a JD. Kept separate so STOP_WORDS stays standard.
const GENERIC_VERBS = new Set([
  "get","got","gets","getting","make","makes","made","making",
  "take","takes","took","taking","use","uses","used","using",
  "go","goes","went","going","come","came","coming",
  "say","said","saying","see","sees","saw","seeing",
  "know","knew","known","knowing","help","helps","helped","helping",
  "work","works","worked","working","want","wants","wanted","wanting",
  "manage","manages","managed","managing",
]);

// Resume-speak nouns/adjectives that appear in nearly every JD and
// carry no differentiating signal. Filtered from Phase 3 (bigrams)
// and Phase 4 (singles) — but curated lists still win if a term
// also happens to be a real skill (e.g. "lead" → leadership).
const GENERIC_NOUNS = new Set([
  "role","roles","work","job","jobs","team","teams","teamwork",
  "responsibilities","responsibility","duties","strong","great",
  "excellent","passionate","motivated","ability","able","years","year",
  "experience","experienced","required","requirements","must","plus",
  "nice","bonus","including","includes","etc",
  "across","digital","website","websites","final","finals",
  "closely","skills","skill","time","times","position","positions",
  "company","companies","candidate","candidates","opportunity","opportunities",
  "day","days","week","weeks","month","months",
  "client","clients","customer","customers","user","users",
  "people","person","someone","anyone","everyone","thing","things",
  "project","projects","task","tasks","feature","features",
  "full-time","part-time","remote","hybrid","onsite","on-site",
  "senior","junior","mid","lead","principal","staff","entry",
  "company","startup","enterprise",
]);

// 2-letter acronyms that carry real signal. Exempted from the "drop
// tokens under 3 chars" rule so we don't lose "UX", "UI", "QA", etc.
const ACRONYM_KEEP = new Set([
  "ux","ui","qa","ai","ml","ar","vr","xr","ci","cd","db","seo","sem",
]);

const PREFERRED_MARKERS = [
  /\bnice to have\b/i,
  /\bnice-to-have\b/i,
  /\bpreferred qualifications?\b/i,
  /\bbonus (?:points|skills|if)?\b/i,
  /\bplus(?:es)?\b(?!\s+sign)/i,
  /\bideally\b/i,
  /\bnot required\b/i,
];

// Tool names — always classify as skills, extract verbatim. Multi-word
// entries are matched as exact phrases in the normalized JD text.
const TOOL_NAMES = [
  "figma","figjam","sketch","adobe xd","framer","principle","invision",
  "zeplin","notion","jira","slack","linear","asana","miro","confluence",
  "photoshop","illustrator","after effects","lottie","webflow","protopie",
  "blender","cinema 4d","spline","rive",
  "react","vue","angular","svelte","next","tailwind","css","html",
  "typescript","javascript","python","node","graphql","sql","postgres",
  "mongodb","aws","gcp","azure","docker","kubernetes","git","github",
];

// Design/tech skill terms. Always classify as "skills". Multi-word
// entries are matched as phrases before singles (phase-2 ordering).
const SKILL_TERMS = [
  "prototyping","wireframing","wireframe","prototype","prototypes",
  "typography","motion","accessibility","a11y","responsive","mobile","web",
  "illustration","iconography","branding","animation",
  "design system","design systems","design tokens","component library",
  "user research","usability testing","user testing","user interviews",
  "interaction design","visual design","information architecture",
  "data visualization","data viz","micro-interactions","micro interaction",
  "ux research","ui design","ux design","product design","service design",
  "ui/ux","ux/ui","ui ux",
  "qualitative research","quantitative research","a/b testing","ab testing",
  "heuristic evaluation","customer journey","journey mapping",
];

// Soft-skill vocabulary — classify separately so we can break the
// score down into Skills / Soft skills / Role terms.
const SOFT_SKILL_TERMS = [
  "communication","communicator","collaboration","collaborative","collaborate",
  "leadership","lead","led","stakeholder","stakeholders","cross-functional",
  "empathy","empathetic","storytelling","presentation","presenting",
  "client-facing","agency","ownership","owning","autonomous","self-directed",
  "proactive","mentoring","mentorship","feedback",
  "stakeholder management","problem solving","critical thinking","decision making",
];

// Synonyms — if a JD keyword is any of these forms, a resume
// containing any OTHER form counts as a match.
const SYNONYMS: Record<string, string[]> = {
  "ui": ["user interface", "interface design", "visual design"],
  "ux": ["user experience", "experience design", "usability"],
  "ui/ux": ["ui ux", "ux/ui", "product design", "interface design"],
  "product design": ["product designer", "end-to-end design"],
  "design system": ["design systems", "component library", "token system"],
  "stakeholder": ["stakeholders", "stakeholder management"],
  "wireframe": ["wireframing", "wireframes", "lo-fi"],
  "prototype": ["prototyping", "prototypes", "interactive mockup"],
  "figma": ["fig ma"],
  "user research": ["ux research", "usability testing", "user testing", "user interviews"],
  "agile": ["scrum", "sprint", "kanban"],
  "communication": ["communicator", "communicate"],
  "collaboration": ["collaborate", "collaborative", "cross-functional"],
  "leadership": ["lead", "leading", "team lead", "led"],
  "mobile": ["mobile app", "ios", "android", "responsive"],
  "web": ["website", "web app", "web design", "web-based"],
  "motion": ["motion design", "animation", "micro-interaction", "lottie", "after effects"],
  // Long-form ↔ canonical technology aliases. Short aliases (js, ts,
  // k8s) are intentionally omitted — isMatched's cascade uses
  // substring checks, and 2-char tokens risk false positives in
  // unrelated resume text.
  "postgres": ["postgresql"],
  "postgresql": ["postgres"],
  "mongodb": ["mongo"],
  "kubernetes": ["k8s"],
  "terraform": ["tf", "iac"],
  "github actions": ["gh actions"],
  "aws": ["amazon web services"],
  "gcp": ["google cloud", "google cloud platform"],
  "azure": ["microsoft azure"],
  "node": ["node.js", "nodejs"],
  "next": ["next.js", "nextjs"],
  "machine learning": ["ml", "deep learning"],
};

// Category pools — loose equivalence groupings for tools that
// recruiters treat as interchangeable ("any modern PM tool", "any
// cloud provider"). When the JD names one member and the resume has
// a different member of the same pool, the cascade awards partial
// credit (0.7 confidence) at step 5. Separate from SYNONYMS because
// Jira/Linear aren't synonyms — they're same-category alternatives.
const CATEGORY_POOLS: Record<string, string[]> = {
  projectManagement: [
    "jira", "linear", "asana", "trello", "notion", "monday",
    "clickup", "airtable", "basecamp",
  ],
  designTools: [
    "figma", "sketch", "adobe xd", "invision", "framer",
    "principle", "axure",
  ],
  versionControl: ["git", "github", "gitlab", "bitbucket"],
  frontendFrameworks: [
    "react", "vue", "angular", "svelte", "next",
    "remix", "solid", "astro",
  ],
  databases: [
    "postgres", "postgresql", "mysql", "mongodb", "redis",
    "sqlite", "dynamodb",
  ],
  cloud: [
    "aws", "gcp", "azure", "vercel", "netlify",
    "cloudflare", "heroku",
  ],
  devops: [
    "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "github actions", "circleci",
  ],
  testing: [
    "jest", "vitest", "cypress", "playwright", "selenium",
    "pytest", "rspec", "junit",
  ],
};

// Reverse lookup — member → list of pools it belongs to. Built once
// at module load; O(1) lookup inside the match cascade.
const MEMBER_TO_POOLS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const [pool, members] of Object.entries(CATEGORY_POOLS)) {
    for (const m of members) {
      const existing = map.get(m);
      if (existing) existing.push(pool);
      else map.set(m, [pool]);
    }
  }
  return map;
})();

const GRADES: readonly Grade[] = [
  { min: 85, label: "Excellent match", tone: "excellent",
    message: "Your resume is well-optimised for this role." },
  { min: 70, label: "Strong match", tone: "strong",
    message: "A few tweaks and this could be excellent." },
  { min: 50, label: "Fair match", tone: "fair", message: "" /* filled at runtime */ },
  { min: 30, label: "Weak match", tone: "weak", message: "" /* filled at runtime */ },
  { min: 0,  label: "Poor match", tone: "poor",
    message: "This JD may not align well with your current resume." },
] as const;

// ── Text normalization ────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    // Keep hyphens and slashes; everything else that isn't
    // alphanumeric becomes whitespace. "client-facing" stays intact;
    // "UI/UX" stays intact.
    .replace(/[^a-z0-9\s\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Naïve suffix stemmer. Covers the most common design/tech cases —
// not a Porter stemmer, but enough to unify "manage/management" and
// "prototyp/prototyping/prototypes" for substring-based matching.
function stem(word: string): string {
  const hadIng = /ing$/.test(word);
  let s = word
    .replace(/ization$/, "ize")
    .replace(/isation$/, "ize")
    .replace(/ational$/, "ate")
    .replace(/tional$/, "tion")
    .replace(/ness$/, "")
    .replace(/ments$/, "")
    .replace(/ment$/, "")
    .replace(/ings$/, "")
    .replace(/ing$/, "")
    .replace(/tion$/, "te")
    .replace(/sion$/, "se")
    .replace(/ies$/, "y")
    .replace(/ied$/, "y")
    .replace(/ed$/, "")
    .replace(/er$/, "")
    .replace(/ly$/, "")
    .replace(/s$/, "");
  // English drops a trailing `e` before `-ing` ("manage" → "managing").
  // Restore it when a consonant-ending stem came from a `-ing` form,
  // so "managing"/"manage"/"management" all collapse to "manage".
  if (hadIng && s.length >= 3 && /[bdgmnprstvz]$/.test(s) && !s.endsWith("ee")) {
    s = s + "e";
  }
  return s;
}

function stemPhrase(phrase: string): string {
  return phrase.split(" ").map(stem).join(" ");
}

// ── JD zone split ─────────────────────────────────────────────────

function splitZones(jd: string): { required: string; preferred: string } {
  const lower = jd.toLowerCase();
  let splitIdx = -1;
  for (const p of PREFERRED_MARKERS) {
    const m = lower.match(p);
    if (m && m.index !== undefined) {
      if (splitIdx < 0 || m.index < splitIdx) splitIdx = m.index;
    }
  }
  if (splitIdx < 0) return { required: jd, preferred: "" };
  return {
    required: jd.slice(0, splitIdx),
    preferred: jd.slice(splitIdx),
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  // Word-boundary match so "age" doesn't fire inside "management",
  // and numeric tokens don't get caught.
  const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, "g");
  return (haystack.match(re) || []).length;
}

function classify(text: string): Bucket {
  const t = text.toLowerCase();
  if (SOFT_SKILL_TERMS.includes(t)) return "softSkills";
  if (SKILL_TERMS.includes(t) || TOOL_NAMES.includes(t)) return "skills";
  return "roleTerms";
}

// ── Keyword extraction ────────────────────────────────────────────

function extractKeywords(jd: string): Keyword[] {
  const zones = splitZones(jd);
  const reqNorm = normalize(zones.required);
  const prefNorm = normalize(zones.preferred);
  const fullNorm = normalize(jd);
  const first20 = fullNorm.slice(0, Math.floor(fullNorm.length * 0.2));

  const keywords = new Map<string, Keyword>();

  const register = (phrase: string) => {
    const key = phrase.toLowerCase();
    if (keywords.has(key)) return;

    const reqCount = countOccurrences(reqNorm, key);
    const prefCount = countOccurrences(prefNorm, key);
    if (reqCount === 0 && prefCount === 0) return;

    const zone: Zone = reqCount > 0 ? "required" : "preferred";
    let weight = zone === "required" ? 2 : 1;

    const totalCount = countOccurrences(fullNorm, key);
    if (totalCount >= 3) weight += 1;

    if (first20.includes(key)) weight += 0.5;
    if (TOOL_NAMES.includes(key)) weight += 0.5;

    keywords.set(key, {
      text: key,
      display: key, // UI layer can title-case if it wants
      weight,
      zone,
      bucket: classify(key),
    });
  };

  // Phase 1: tool names — longest first so "adobe xd" wins over "adobe".
  const sortedTools = [...TOOL_NAMES].sort((a, b) => b.length - a.length);
  for (const tool of sortedTools) {
    if (countOccurrences(fullNorm, tool) > 0) register(tool);
  }

  // Phase 2: curated skill + soft-skill phrases, longest first so
  // multi-word phrases land before their constituent singles. For
  // single-word curated terms, skip if the word is already part of
  // a captured multi-word phrase — avoids "stakeholder" showing up
  // as its own missing chip when "stakeholder management" is already
  // on the list.
  const curated = [...SKILL_TERMS, ...SOFT_SKILL_TERMS]
    .filter((t) => !TOOL_NAMES.includes(t))
    .sort((a, b) => b.length - a.length);
  for (const term of curated) {
    if (!term.includes(" ")) {
      const inPhrase = Array.from(keywords.keys()).some(
        (k) =>
          k.includes(" ") &&
          (k.startsWith(`${term} `) ||
            k.endsWith(` ${term}`) ||
            k.includes(` ${term} `)),
      );
      if (inPhrase) continue;
    }
    if (countOccurrences(fullNorm, term) > 0) register(term);
  }

  // Phase 3: unknown bigrams that repeat ≥ 2 times — catches domain
  // vocabulary we don't have in the curated lists (e.g. "taxonomy
  // management", "service blueprint").
  const tokens = fullNorm.split(/\s+/).filter(Boolean);
  const bigrams = new Map<string, number>();
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;
    if (GENERIC_VERBS.has(a) || GENERIC_VERBS.has(b)) continue;
    if (GENERIC_NOUNS.has(a) || GENERIC_NOUNS.has(b)) continue;
    if (a.length < 3 && !ACRONYM_KEEP.has(a)) continue;
    if (b.length < 3 && !ACRONYM_KEEP.has(b)) continue;
    if (/^\d/.test(a) || /^\d/.test(b)) continue;
    const phrase = `${a} ${b}`;
    bigrams.set(phrase, (bigrams.get(phrase) ?? 0) + 1);
  }
  for (const [phrase, count] of bigrams) {
    if (count < 2) continue;
    if (keywords.has(phrase)) continue;
    // Skip if either word is already captured as a curated single —
    // avoids double-weighting (e.g. "design" + "design system").
    const [w1, w2] = phrase.split(" ");
    if (keywords.has(w1) || keywords.has(w2)) continue;
    register(phrase);
  }

  // Phase 4: meaningful single words — known, or repeated. Generic
  // resume-speak (years, excellent, closely, skills, digital, …) is
  // filtered unless the word is in a curated list.
  const wordCounts = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token) || GENERIC_VERBS.has(token)) continue;
    if (token.length < 3 && !ACRONYM_KEEP.has(token)) continue;
    if (/^\d/.test(token)) continue;
    wordCounts.set(token, (wordCounts.get(token) ?? 0) + 1);
  }
  for (const [word, count] of wordCounts) {
    if (keywords.has(word)) continue;
    // Skip if the word is part of a multi-word phrase already captured.
    const inPhrase = Array.from(keywords.keys()).some(
      (k) =>
        k.includes(" ") &&
        (k.startsWith(`${word} `) ||
          k.endsWith(` ${word}`) ||
          k.includes(` ${word} `)),
    );
    if (inPhrase) continue;

    const isKnown =
      SKILL_TERMS.includes(word) ||
      SOFT_SKILL_TERMS.includes(word) ||
      TOOL_NAMES.includes(word) ||
      ACRONYM_KEEP.has(word);
    // Curated terms always pass. Otherwise drop generic nouns even if
    // repeated — "years" / "skills" / "digital" repeat often but add
    // no matching signal.
    if (!isKnown && GENERIC_NOUNS.has(word)) continue;
    if (isKnown || count >= 2) register(word);
  }

  return Array.from(keywords.values());
}

// ── Dedup by stem ──────────────────────────────────────────────────

function dedupByStem(keywords: Keyword[]): Keyword[] {
  const byStem = new Map<string, Keyword>();
  for (const kw of keywords) {
    const stemKey = stemPhrase(kw.text);
    const existing = byStem.get(stemKey);
    if (!existing) {
      byStem.set(stemKey, kw);
      continue;
    }
    // Prefer the longer canonical form; weight breaks ties.
    const replace =
      kw.text.length > existing.text.length ||
      (kw.text.length === existing.text.length && kw.weight > existing.weight);
    if (replace) byStem.set(stemKey, kw);
  }
  return Array.from(byStem.values());
}

// ── Resume text extraction ────────────────────────────────────────

function flattenResume(resume: Resume): string {
  const parts: string[] = [
    resume.header.name,
    resume.header.title,
    resume.header.tagline,
    ...resume.header.contacts.flatMap((c) => [c.label, c.value]),
    ...resume.experience.flatMap((e) => [
      e.company, e.role, e.startDate, e.endDate,
      ...e.bullets.map((b) => b.text),
    ]),
    ...resume.skillGroups.flatMap((g) => [g.label, g.items]),
    ...resume.education.flatMap((e) => [e.degree, e.field, e.institution, e.year]),
    ...resume.links.flatMap((l) => [l.label, l.url]),
  ];
  return parts.filter(Boolean).join(" ");
}

// ── Match cascade ─────────────────────────────────────────────────

type MatchInfo = { matched: boolean; confidence: number };

function isMatched(
  keyword: string,
  resumeNorm: string,
  resumeStemmed: string,
): MatchInfo {
  const kNorm = normalize(keyword);

  // 1. Exact phrase match — highest confidence.
  if (resumeNorm.includes(kNorm)) return { matched: true, confidence: 1.0 };

  // 2. Stem match — handles manage/managing/management drift.
  const kStemmed = stemPhrase(kNorm);
  if (resumeStemmed.includes(kStemmed)) return { matched: true, confidence: 0.9 };

  // 3. Synonym match — "ui" matches "user interface", etc.
  for (const [canonical, syns] of Object.entries(SYNONYMS)) {
    const allForms = [canonical, ...syns];
    const kIsForm = allForms.some((f) => {
      const n = normalize(f);
      return n === kNorm || (kNorm.length > 2 && n.includes(kNorm));
    });
    if (kIsForm) {
      const resumeHasAny = allForms.some((f) => resumeNorm.includes(normalize(f)));
      if (resumeHasAny) return { matched: true, confidence: 0.8 };
    }
  }

  // 4. Partial phrase — all content words present (any order / location).
  const words = kNorm.split(" ").filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
  if (words.length > 1) {
    const allPresent = words.every(
      (w) => resumeNorm.includes(w) || resumeStemmed.includes(stem(w)),
    );
    if (allPresent) return { matched: true, confidence: 0.7 };
  }

  // 5. Categorical match — JD names a specific tool (Jira) and the
  // resume has a different member of the same pool (Linear). The
  // category is covered even if the exact tool isn't, so award 0.7.
  const pools = MEMBER_TO_POOLS.get(kNorm);
  if (pools) {
    for (const poolName of pools) {
      const members = CATEGORY_POOLS[poolName];
      const altPresent = members.some(
        (m) => m !== kNorm && resumeNorm.includes(m),
      );
      if (altPresent) return { matched: true, confidence: 0.7 };
    }
  }

  return { matched: false, confidence: 0 };
}

// ── Grade selection ───────────────────────────────────────────────

function selectGrade(score: number, missingHighImpact: number): Grade {
  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;
  for (const g of GRADES) {
    if (score >= g.min) {
      if (g.tone === "fair") {
        const n = Math.max(1, missingHighImpact);
        return { ...g, message: `Add ${plural(n, "high-impact keyword")} to cross 70% and pass most ATS filters.` };
      }
      if (g.tone === "weak") {
        const n = Math.max(1, missingHighImpact);
        return { ...g, message: `Missing ${plural(n, "critical keyword")}. Significant gaps vs this JD.` };
      }
      return g;
    }
  }
  return GRADES[GRADES.length - 1];
}

// ── Public entrypoint ─────────────────────────────────────────────

const EMPTY_RESULT: MatchCheckResult = {
  score: 0,
  hasJd: false,
  grade: GRADES[GRADES.length - 1],
  matched: [],
  missing: { highImpact: [], lowPriority: [] },
  subScores: {
    skills: { matched: 0, total: 0 },
    softSkills: { matched: 0, total: 0 },
    roleTerms: { matched: 0, total: 0 },
  },
  totals: { matched: 0, extracted: 0 },
};

export function matchCheck(resume: Resume, jdRaw: string): MatchCheckResult {
  const jd = jdRaw.trim();
  if (jd.length < MIN_JD_LENGTH) return EMPTY_RESULT;

  const keywordsRaw = extractKeywords(jd);
  const keywords = dedupByStem(keywordsRaw);
  if (keywords.length === 0) return { ...EMPTY_RESULT, hasJd: true };

  const resumeText = flattenResume(resume);
  const resumeNorm = normalize(resumeText);
  const resumeStemmed = stemPhrase(resumeNorm);

  let totalWeight = 0;
  let matchedWeight = 0;
  const matched: Keyword[] = [];
  const highImpact: Keyword[] = [];
  const lowPriority: Keyword[] = [];

  const subScores = {
    skills: { matched: 0, total: 0 },
    softSkills: { matched: 0, total: 0 },
    roleTerms: { matched: 0, total: 0 },
  };

  for (const kw of keywords) {
    totalWeight += kw.weight;
    subScores[kw.bucket].total += 1;

    const result = isMatched(kw.text, resumeNorm, resumeStemmed);
    if (result.matched) {
      matchedWeight += kw.weight * result.confidence;
      matched.push(kw);
      subScores[kw.bucket].matched += 1;
    } else {
      if (kw.weight >= 2) highImpact.push(kw);
      else lowPriority.push(kw);
    }
  }

  const rawScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  const score = Math.min(100, Math.round(rawScore));

  const byWeight = (a: Keyword, b: Keyword) => b.weight - a.weight;
  matched.sort(byWeight);
  highImpact.sort(byWeight);
  lowPriority.sort(byWeight);

  return {
    score,
    hasJd: true,
    grade: selectGrade(score, highImpact.length),
    matched,
    missing: { highImpact, lowPriority },
    subScores,
    totals: { matched: matched.length, extracted: keywords.length },
  };
}
