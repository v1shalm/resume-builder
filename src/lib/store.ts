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

type State = {
  resume: Resume;
  selection: EditorSelection;
};

type Actions = {
  select: (selection: EditorSelection) => void;
  reset: () => void;

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

      select: (selection) => set({ selection }),
      reset: () => set({ resume: seedResume, selection: { kind: "header" } }),

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
        // Only track `resume` for undo history. Selection changes
        // (clicking a tab, picking a row) are not undoable.
        partialize: (state) => ({ resume: state.resume }),
        // Cap memory. 100 steps ≈ plenty for a session without
        // blowing up localStorage or RAM.
        limit: 100,
        // Throttle rapid sets (like typing) so "h-e-l-l-o" becomes
        // ONE history entry, not five.
        handleSet: (handleSet) => throttle(handleSet, 500),
        // Skip recording when nothing changed (e.g. clicking the
        // same field) — compare by top-level identity.
        equality: (a, b) => a.resume === b.resume,
      },
    ),
    {
      name: "resume-builder:v5",
      version: 5,
      // Only persist `resume` — undo history is intentionally
      // session-scoped. Reload = clean slate, keeping localStorage
      // predictable.
      partialize: (s) => ({ resume: s.resume }),
      migrate: (persistedState: unknown, version: number) => {
        if (version < 5) return { resume: seedResume };
        return persistedState as { resume: Resume };
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
