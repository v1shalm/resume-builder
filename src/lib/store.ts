"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import type {
  Contact,
  EducationItem,
  EditorSelection,
  ExperienceItem,
  Header,
  ID,
  LinkItem,
  Resume,
  SectionKind,
  SectionMeta,
  SkillGroup,
  Style,
} from "./types";
import { seedResume } from "./seed";
import { DEFAULT_TEMPLATE_ID, templateById } from "./templates";

// Collapse rapid consecutive `set()` calls (e.g. each keystroke while
// typing) into a single history entry. Without this, `⌘Z` would undo
// one character at a time — annoying. 500ms is the "I paused" window.
function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let latestArgs: A | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (latestArgs) fn(...latestArgs);
    latestArgs = null;
    timer = null;
  };
  return (...args: A) => {
    latestArgs = args;
    if (timer == null) timer = setTimeout(flush, wait);
  };
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

// ── Variants ──────────────────────────────────────────────────────
// Metadata per variant. Resume data for the ACTIVE variant lives at
// the top-level `resume` field (so all existing actions keep writing
// to one place). `variants` stores snapshots of the OTHER variants.
// Swap pattern on switch: snapshot current `resume` into
// `variants[currentVariantId]`, then load `variants[newId]` into
// `resume` and set `currentVariantId = newId`.
export type VariantMeta = {
  label: string;
  templateId: string;
  /** Per-variant JD for ATS Match. Each application gets its own. */
  jobDescription?: string;
  createdAt: number;
  updatedAt: number;
};

type State = {
  resume: Resume;
  selection: EditorSelection;
  variants: Record<string, Resume>;
  variantMeta: Record<string, VariantMeta>;
  variantOrder: string[];
  currentVariantId: string;
};

type Actions = {
  select: (selection: EditorSelection) => void;
  reset: () => void;

  // Variants
  switchVariant: (id: string) => void;
  createVariant: (opts?: { fromId?: string; label?: string; templateId?: string }) => string;
  renameVariant: (id: string, label: string) => void;
  deleteVariant: (id: string) => void;
  reorderVariants: (fromId: string, toId: string) => void;
  applyTemplate: (templateId: string) => void;
  setVariantJd: (id: string, jd: string) => void;

  // Header
  updateHeader: (patch: Partial<Header>) => void;
  addContact: () => void;
  updateContact: (id: ID, patch: Partial<Contact>) => void;
  removeContact: (id: ID) => void;
  reorderContacts: (fromId: ID, toId: ID) => void;

  // Sections
  reorderSections: (fromId: SectionKind, toId: SectionKind) => void;
  toggleSectionVisibility: (id: SectionKind) => void;
  renameSection: (id: SectionKind, title: string) => void;

  // Experience
  addExperience: () => ID;
  updateExperience: (id: ID, patch: Partial<ExperienceItem>) => void;
  removeExperience: (id: ID) => void;
  reorderExperience: (fromId: ID, toId: ID) => void;
  addBullet: (experienceId: ID) => ID;
  updateBullet: (experienceId: ID, bulletId: ID, text: string) => void;
  removeBullet: (experienceId: ID, bulletId: ID) => void;
  reorderBullets: (experienceId: ID, fromId: ID, toId: ID) => void;

  // Skills
  addSkillGroup: () => ID;
  updateSkillGroup: (id: ID, patch: Partial<SkillGroup>) => void;
  removeSkillGroup: (id: ID) => void;
  reorderSkillGroups: (fromId: ID, toId: ID) => void;

  // Education
  addEducation: () => ID;
  updateEducation: (id: ID, patch: Partial<EducationItem>) => void;
  removeEducation: (id: ID) => void;
  reorderEducation: (fromId: ID, toId: ID) => void;

  // Links
  addLink: () => ID;
  updateLink: (id: ID, patch: Partial<LinkItem>) => void;
  removeLink: (id: ID) => void;
  reorderLinks: (fromId: ID, toId: ID) => void;

  // Style
  updateStyle: (patch: Partial<Style>) => void;

  // Import/Export JSON
  importResume: (resume: Resume) => void;
};

type Store = State & Actions;

/** Produce a duplicate label like "Product Designer copy" or
 *  "Product Designer copy 2" so new variants don't silently collide
 *  with their source name. */
function deriveCopyLabel(
  sourceLabel: string,
  meta: Record<string, VariantMeta>,
): string {
  const base = sourceLabel.replace(/\s+copy(?:\s+\d+)?$/i, "").trim() || "Untitled";
  const existing = new Set(Object.values(meta).map((m) => m.label));
  const first = `${base} copy`;
  if (!existing.has(first)) return first;
  let n = 2;
  while (existing.has(`${base} copy ${n}`)) n += 1;
  return `${base} copy ${n}`;
}

const moveInArray = <T extends { id: string }>(
  arr: T[],
  fromId: string,
  toId: string,
): T[] => {
  const from = arr.findIndex((x) => x.id === fromId);
  const to = arr.findIndex((x) => x.id === toId);
  if (from === -1 || to === -1 || from === to) return arr;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export const useResumeStore = create<Store>()(
  persist(
    temporal(
      (set) => ({
      resume: seedResume,
      selection: { kind: "header" },
      variants: {},
      variantMeta: {
        default: {
          label: "Default",
          templateId: DEFAULT_TEMPLATE_ID,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      variantOrder: ["default"],
      currentVariantId: "default",

      select: (selection) => set({ selection }),
      reset: () =>
        set((s) => ({
          resume: seedResume,
          selection: { kind: "header" },
          variantMeta: {
            ...s.variantMeta,
            [s.currentVariantId]: {
              ...s.variantMeta[s.currentVariantId],
              updatedAt: Date.now(),
            },
          },
        })),

      // ── Variants ─────────────────────────────────────────────
      switchVariant: (id) =>
        set((s) => {
          if (id === s.currentVariantId) return {};
          const snapshot = s.resume;
          const incoming = s.variants[id];
          if (!incoming) return {};
          const { [id]: _loaded, ...remaining } = s.variants;
          void _loaded;
          return {
            resume: incoming,
            variants: { ...remaining, [s.currentVariantId]: snapshot },
            currentVariantId: id,
            // Reset selection so the editor doesn't show a stale id
            // from the previous variant.
            selection: { kind: "header" },
          };
        }),

      createVariant: (opts = {}) => {
        const newId = uid();
        set((s) => {
          const fromId = opts.fromId ?? s.currentVariantId;
          const sourceResume =
            fromId === s.currentVariantId ? s.resume : s.variants[fromId] ?? s.resume;
          const sourceMeta = s.variantMeta[fromId];
          const label =
            opts.label ?? deriveCopyLabel(sourceMeta?.label ?? "Untitled", s.variantMeta);
          const templateId = opts.templateId ?? sourceMeta?.templateId ?? DEFAULT_TEMPLATE_ID;

          // Snapshot current resume into variants so switching to the
          // new variant doesn't lose edits to the previous one.
          const snapshot = s.resume;
          // Deep-clone the source resume (structured clone) so the new
          // variant is genuinely independent of the one it's copied
          // from. JSON round-trip is fine for our schema.
          const newResume: Resume = JSON.parse(JSON.stringify(sourceResume));
          const now = Date.now();

          return {
            resume: newResume,
            variants: {
              ...s.variants,
              [s.currentVariantId]: snapshot,
            },
            variantMeta: {
              ...s.variantMeta,
              [newId]: {
                label,
                templateId,
                createdAt: now,
                updatedAt: now,
              },
            },
            variantOrder: [...s.variantOrder, newId],
            currentVariantId: newId,
            selection: { kind: "header" },
          };
        });
        return newId;
      },

      renameVariant: (id, label) =>
        set((s) => {
          const meta = s.variantMeta[id];
          if (!meta) return {};
          return {
            variantMeta: {
              ...s.variantMeta,
              [id]: { ...meta, label: label.trim() || meta.label, updatedAt: Date.now() },
            },
          };
        }),

      deleteVariant: (id) =>
        set((s) => {
          if (s.variantOrder.length <= 1) return {}; // keep at least one
          const nextOrder = s.variantOrder.filter((x) => x !== id);
          const { [id]: _removed, ...restMeta } = s.variantMeta;
          void _removed;
          const { [id]: _removedData, ...restData } = s.variants;
          void _removedData;

          if (id === s.currentVariantId) {
            // Pick the neighbour to switch to (previous, else next).
            const idx = s.variantOrder.indexOf(id);
            const newCurrent = s.variantOrder[idx - 1] ?? s.variantOrder[idx + 1];
            const incoming = restData[newCurrent];
            if (!incoming) return {};
            const { [newCurrent]: _consumed, ...remainingData } = restData;
            void _consumed;
            return {
              resume: incoming,
              variants: remainingData,
              variantMeta: restMeta,
              variantOrder: nextOrder,
              currentVariantId: newCurrent,
              selection: { kind: "header" },
            };
          }

          return {
            variants: restData,
            variantMeta: restMeta,
            variantOrder: nextOrder,
          };
        }),

      reorderVariants: (fromId, toId) =>
        set((s) => {
          const from = s.variantOrder.indexOf(fromId);
          const to = s.variantOrder.indexOf(toId);
          if (from === -1 || to === -1 || from === to) return {};
          const next = s.variantOrder.slice();
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return { variantOrder: next };
        }),

      applyTemplate: (templateId) =>
        set((s) => {
          const tpl = templateById(templateId);
          return {
            resume: { ...s.resume, style: tpl.style, layoutId: tpl.layoutId },
            variantMeta: {
              ...s.variantMeta,
              [s.currentVariantId]: {
                ...s.variantMeta[s.currentVariantId],
                templateId,
                updatedAt: Date.now(),
              },
            },
          };
        }),

      setVariantJd: (id, jd) =>
        set((s) => {
          const meta = s.variantMeta[id];
          if (!meta) return {};
          return {
            variantMeta: {
              ...s.variantMeta,
              [id]: { ...meta, jobDescription: jd, updatedAt: Date.now() },
            },
          };
        }),

      updateHeader: (patch) =>
        set((s) => ({ resume: { ...s.resume, header: { ...s.resume.header, ...patch } } })),

      addContact: () =>
        set((s) => {
          const c: Contact = { id: uid(), label: "label", value: "" };
          return {
            resume: {
              ...s.resume,
              header: { ...s.resume.header, contacts: [...s.resume.header.contacts, c] },
            },
          };
        }),

      updateContact: (id, patch) =>
        set((s) => ({
          resume: {
            ...s.resume,
            header: {
              ...s.resume.header,
              contacts: s.resume.header.contacts.map((c) =>
                c.id === id ? { ...c, ...patch } : c,
              ),
            },
          },
        })),

      removeContact: (id) =>
        set((s) => ({
          resume: {
            ...s.resume,
            header: {
              ...s.resume.header,
              contacts: s.resume.header.contacts.filter((c) => c.id !== id),
            },
          },
        })),

      reorderContacts: (fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            header: {
              ...s.resume.header,
              contacts: moveInArray(s.resume.header.contacts, fromId, toId),
            },
          },
        })),

      reorderSections: (fromId, toId) =>
        set((s) => {
          const from = s.resume.sectionOrder.indexOf(fromId);
          const to = s.resume.sectionOrder.indexOf(toId);
          if (from === -1 || to === -1 || from === to) return s;
          const next = s.resume.sectionOrder.slice();
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return { resume: { ...s.resume, sectionOrder: next } };
        }),

      toggleSectionVisibility: (id) =>
        set((s) => {
          const current = s.resume.sections[id];
          const next: SectionMeta = { ...current, visible: !current.visible };
          return {
            resume: {
              ...s.resume,
              sections: { ...s.resume.sections, [id]: next },
            },
          };
        }),

      renameSection: (id, title) =>
        set((s) => ({
          resume: {
            ...s.resume,
            sections: {
              ...s.resume.sections,
              [id]: { ...s.resume.sections[id], title },
            },
          },
        })),

      addExperience: () => {
        const id = uid();
        set((s) => ({
          resume: {
            ...s.resume,
            experience: [
              ...s.resume.experience,
              {
                id,
                company: "Company",
                role: "Role",
                startDate: "",
                endDate: "",
                bullets: [{ id: uid(), text: "" }],
              },
            ],
          },
          selection: { kind: "experience", id },
        }));
        return id;
      },

      updateExperience: (id, patch) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          },
        })),

      removeExperience: (id) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.filter((e) => e.id !== id),
          },
          selection:
            s.selection.kind === "experience" && s.selection.id === id
              ? { kind: "section", id: "experience" }
              : s.selection,
        })),

      reorderExperience: (fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: moveInArray(s.resume.experience, fromId, toId),
          },
        })),

      addBullet: (experienceId) => {
        const id = uid();
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.map((e) =>
              e.id === experienceId
                ? { ...e, bullets: [...e.bullets, { id, text: "" }] }
                : e,
            ),
          },
        }));
        return id;
      },

      updateBullet: (experienceId, bulletId, text) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.map((e) =>
              e.id === experienceId
                ? {
                    ...e,
                    bullets: e.bullets.map((b) =>
                      b.id === bulletId ? { ...b, text } : b,
                    ),
                  }
                : e,
            ),
          },
        })),

      removeBullet: (experienceId, bulletId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.map((e) =>
              e.id === experienceId
                ? { ...e, bullets: e.bullets.filter((b) => b.id !== bulletId) }
                : e,
            ),
          },
        })),

      reorderBullets: (experienceId, fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            experience: s.resume.experience.map((e) =>
              e.id === experienceId
                ? { ...e, bullets: moveInArray(e.bullets, fromId, toId) }
                : e,
            ),
          },
        })),

      addSkillGroup: () => {
        const id = uid();
        set((s) => ({
          resume: {
            ...s.resume,
            skillGroups: [...s.resume.skillGroups, { id, label: "Group", items: "" }],
          },
          selection: { kind: "skillGroup", id },
        }));
        return id;
      },

      updateSkillGroup: (id, patch) =>
        set((s) => ({
          resume: {
            ...s.resume,
            skillGroups: s.resume.skillGroups.map((g) =>
              g.id === id ? { ...g, ...patch } : g,
            ),
          },
        })),

      removeSkillGroup: (id) =>
        set((s) => ({
          resume: {
            ...s.resume,
            skillGroups: s.resume.skillGroups.filter((g) => g.id !== id),
          },
          selection:
            s.selection.kind === "skillGroup" && s.selection.id === id
              ? { kind: "section", id: "skills" }
              : s.selection,
        })),

      reorderSkillGroups: (fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            skillGroups: moveInArray(s.resume.skillGroups, fromId, toId),
          },
        })),

      addEducation: () => {
        const id = uid();
        set((s) => ({
          resume: {
            ...s.resume,
            education: [
              ...s.resume.education,
              { id, degree: "", field: "", institution: "", year: "" },
            ],
          },
          selection: { kind: "education", id },
        }));
        return id;
      },

      updateEducation: (id, patch) =>
        set((s) => ({
          resume: {
            ...s.resume,
            education: s.resume.education.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          },
        })),

      removeEducation: (id) =>
        set((s) => ({
          resume: {
            ...s.resume,
            education: s.resume.education.filter((e) => e.id !== id),
          },
          selection:
            s.selection.kind === "education" && s.selection.id === id
              ? { kind: "section", id: "education" }
              : s.selection,
        })),

      reorderEducation: (fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            education: moveInArray(s.resume.education, fromId, toId),
          },
        })),

      addLink: () => {
        const id = uid();
        set((s) => ({
          resume: {
            ...s.resume,
            links: [...s.resume.links, { id, label: "Label", url: "" }],
          },
          selection: { kind: "link", id },
        }));
        return id;
      },

      updateLink: (id, patch) =>
        set((s) => ({
          resume: {
            ...s.resume,
            links: s.resume.links.map((l) =>
              l.id === id ? { ...l, ...patch } : l,
            ),
          },
        })),

      removeLink: (id) =>
        set((s) => ({
          resume: {
            ...s.resume,
            links: s.resume.links.filter((l) => l.id !== id),
          },
          selection:
            s.selection.kind === "link" && s.selection.id === id
              ? { kind: "section", id: "links" }
              : s.selection,
        })),

      reorderLinks: (fromId, toId) =>
        set((s) => ({
          resume: {
            ...s.resume,
            links: moveInArray(s.resume.links, fromId, toId),
          },
        })),

      updateStyle: (patch) =>
        set((s) => ({
          resume: { ...s.resume, style: { ...s.resume.style, ...patch } },
        })),

      importResume: (resume) =>
        set({ resume, selection: { kind: "header" } }),
    }),
      {
        // Track resume content AND variant-level state so undo across
        // a variant switch restores both halves together (otherwise
        // `resume` reverts but `currentVariantId` stays on the new
        // variant, desyncing the UI). Selection changes are still
        // excluded from history — clicking a field isn't undoable.
        partialize: (state) => ({
          resume: state.resume,
          variants: state.variants,
          variantMeta: state.variantMeta,
          variantOrder: state.variantOrder,
          currentVariantId: state.currentVariantId,
        }),
        // Cap memory. 100 steps ≈ plenty for a session without
        // blowing up localStorage or RAM.
        limit: 100,
        // Throttle rapid sets (like typing) so "h-e-l-l-o" becomes
        // ONE history entry, not five.
        handleSet: (handleSet) => throttle(handleSet, 500),
        // Skip recording when none of the tracked fields changed —
        // reference equality since every action produces new objects.
        equality: (a, b) =>
          a.resume === b.resume &&
          a.variants === b.variants &&
          a.variantMeta === b.variantMeta &&
          a.variantOrder === b.variantOrder &&
          a.currentVariantId === b.currentVariantId,
      },
    ),
    {
      name: "resume-builder:v6",
      version: 6,
      // Persist variants + active resume + metadata. Undo history is
      // session-scoped (zundo's temporal state isn't in this slice).
      partialize: (s) => ({
        resume: s.resume,
        variants: s.variants,
        variantMeta: s.variantMeta,
        variantOrder: s.variantOrder,
        currentVariantId: s.currentVariantId,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const freshVariants = (): Pick<
          State,
          "variants" | "variantMeta" | "variantOrder" | "currentVariantId"
        > => {
          const now = Date.now();
          const meta: Record<string, VariantMeta> = {
            default: {
              label: "Default",
              templateId: DEFAULT_TEMPLATE_ID,
              createdAt: now,
              updatedAt: now,
            },
          };
          return {
            variants: {},
            variantMeta: meta,
            variantOrder: ["default"],
            currentVariantId: "default",
          };
        };
        // Pre-v5: unsupported shape, reseed.
        if (version < 5) {
          return { resume: seedResume, ...freshVariants() };
        }
        // v5 → v6: promote the single `resume` into the variants
        // scheme with a "Default" variant labelled Navy Classic.
        if (version < 6) {
          const old = persistedState as { resume?: Resume };
          return { resume: old.resume ?? seedResume, ...freshVariants() };
        }
        return persistedState as State;
      },
    },
  ),
);

// Imperative undo helper usable from anywhere (toast action handlers,
// delete buttons, etc.). zundo attaches `temporal` to the store via a
// type extension; we cast to reveal it.
type TemporalApi = {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};
export const temporalStore = () =>
  (useResumeStore as unknown as { temporal: { getState: () => TemporalApi } })
    .temporal.getState();
