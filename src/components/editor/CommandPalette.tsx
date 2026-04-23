"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  FileUp,
  FileJson,
  FileInput,
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  User,
  Briefcase,
  GraduationCap,
  Link2,
  Sparkles,
  CornerDownLeft,
  Search,
  Target,
  FileStack,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useResumeStore } from "@/lib/store";
import { useMatchStore } from "@/lib/match-store";
import { useSidebarStore } from "@/lib/sidebar-store";
import { useTheme } from "@/lib/theme";
import { useThemeSwap } from "@/lib/useThemeSwap";
import { useSoundSettings } from "@/lib/soundSettings";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { spring } from "@/lib/motion";

type CommandGroup = "navigate" | "actions" | "settings";

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  icon: React.ComponentType<{ className?: string }>;
  group: CommandGroup;
  run: () => void;
};

const GROUP_LABEL: Record<CommandGroup, string> = {
  navigate: "Navigate",
  actions: "Actions",
  settings: "Settings",
};
const GROUP_ORDER: CommandGroup[] = ["navigate", "actions", "settings"];

// Topbar listens for this to pop the ExportDialog.
export const OPEN_EXPORT_EVENT = "open-export-dialog";
// Topbar dispatches this to open the palette from a click (keeps the
// palette self-contained — no prop drilling of an "open" setter).
export const OPEN_PALETTE_EVENT = "open-command-palette";
// Editor.tsx listens for this to mount/open the ImportDialog.
export const OPEN_IMPORT_EVENT = "open-import-dialog";

type TemporalApi = {
  undo: () => void;
  redo: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const select = useResumeStore((s) => s.select);
  const theme = useTheme((s) => s.theme);
  const swapTheme = useThemeSwap();
  const soundEnabled = useSoundSettings((s) => s.enabled);
  const toggleSound = useSoundSettings((s) => s.toggle);
  const play = useSfx();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onExternalOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onExternalOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onExternalOpen);
    };
  }, []);

  // Sound cues on open/close. `prevOpenRef` guards against the initial
  // render firing a spurious close.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (prevOpenRef.current === open) return;
    play(open ? "modalOpen" : "modalClose");
    prevOpenRef.current = open;
  }, [open, play]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const downloadJSON = () => {
      const resume = useResumeStore.getState().resume;
      const blob = new Blob([JSON.stringify(resume, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.header.name.replace(/\s+/g, "_")}_resume.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const uploadJSON = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result));
            useResumeStore.getState().importResume(data);
          } catch {
            alert(
              "Couldn't read that file. Make sure it's a JSON saved from this builder.",
            );
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };

    const openExport = () =>
      window.dispatchEvent(new CustomEvent(OPEN_EXPORT_EVENT));

    const temporal = (
      useResumeStore as unknown as { temporal: { getState: () => TemporalApi } }
    ).temporal;

    return [
      {
        id: "nav-header",
        label: "Jump to Header",
        icon: User,
        group: "navigate",
        keywords: ["goto", "name", "tagline"],
        run: () => select({ kind: "header" }),
      },
      {
        id: "nav-experience",
        label: "Jump to Experience",
        icon: Briefcase,
        group: "navigate",
        keywords: ["work", "role", "job"],
        run: () => select({ kind: "section", id: "experience" }),
      },
      {
        id: "nav-skills",
        label: "Jump to Skills",
        icon: Sparkles,
        group: "navigate",
        keywords: ["tools", "stack"],
        run: () => select({ kind: "section", id: "skills" }),
      },
      {
        id: "nav-education",
        label: "Jump to Education",
        icon: GraduationCap,
        group: "navigate",
        keywords: ["school", "degree"],
        run: () => select({ kind: "section", id: "education" }),
      },
      {
        id: "nav-links",
        label: "Jump to Links",
        icon: Link2,
        group: "navigate",
        keywords: ["portfolio", "social"],
        run: () => select({ kind: "section", id: "links" }),
      },

      {
        id: "ats-match",
        label: "ATS Match — check vs a job description",
        icon: Target,
        group: "actions",
        keywords: ["ats", "match", "keywords", "jd", "job", "tailor", "score", "check"],
        run: () => useMatchStore.getState().setDrawerOpen(true),
      },
      {
        id: "variants-toggle",
        label: "Resumes & templates",
        hint: "⌘O",
        icon: FileStack,
        group: "actions",
        keywords: ["variants", "resumes", "templates", "sidebar", "switch"],
        run: () => useSidebarStore.getState().setCollapsed(false),
      },
      {
        id: "variants-new",
        label: "Duplicate this resume as a new variant",
        icon: Copy,
        group: "actions",
        keywords: ["duplicate", "copy", "new", "variant", "fork"],
        run: () => useResumeStore.getState().createVariant(),
      },

      {
        id: "export",
        label: "Export PDF",
        hint: "⌘E",
        icon: Download,
        group: "actions",
        keywords: ["download", "pdf", "save"],
        run: openExport,
      },
      {
        id: "import-text",
        label: "Import from text…",
        icon: FileInput,
        group: "actions",
        keywords: ["paste", "parse", "import", "resume", "linkedin"],
        run: () => window.dispatchEvent(new CustomEvent(OPEN_IMPORT_EVENT)),
      },
      {
        id: "import",
        label: "Import JSON backup",
        icon: FileUp,
        group: "actions",
        keywords: ["upload", "load", "open", "restore"],
        run: uploadJSON,
      },
      {
        id: "save-json",
        label: "Save JSON backup",
        icon: FileJson,
        group: "actions",
        keywords: ["download", "backup", "export"],
        run: downloadJSON,
      },
      {
        id: "reset",
        label: "Reset to starter",
        icon: RotateCcw,
        group: "actions",
        keywords: ["clear", "delete", "new"],
        run: () => {
          if (
            confirm(
              "Reset to the starter resume?\n\nYour current edits will be replaced and can't be recovered. Save a JSON backup first if you want to keep them.",
            )
          ) {
            useResumeStore.getState().reset();
          }
        },
      },

      {
        id: "undo",
        label: "Undo",
        hint: "⌘Z",
        icon: Undo2,
        group: "actions",
        run: () => {
          const t = temporal.getState();
          if (t.pastStates.length > 0) {
            t.undo();
            showToast({ message: "Undone", duration: 1600 });
          }
        },
      },
      {
        id: "redo",
        label: "Redo",
        hint: "⌘⇧Z",
        icon: Redo2,
        group: "actions",
        run: () => {
          const t = temporal.getState();
          if (t.futureStates.length > 0) {
            t.redo();
            showToast({ message: "Redone", duration: 1600 });
          }
        },
      },

      {
        id: "theme",
        label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        icon: theme === "dark" ? Sun : Moon,
        group: "settings",
        keywords: ["theme", "dark", "light", "appearance"],
        run: swapTheme,
      },
      {
        id: "sound",
        label: soundEnabled ? "Mute interface sounds" : "Unmute interface sounds",
        icon: soundEnabled ? VolumeX : Volume2,
        group: "settings",
        keywords: ["sfx", "audio", "volume"],
        run: () => {
          if (soundEnabled) play("toggleOff");
          toggleSound();
        },
      },
    ];
  }, [select, swapTheme, theme, soundEnabled, toggleSound, play]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${(c.keywords ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  // When no query is active, render with visible group headers so the
  // palette reads as an index of capabilities. When filtering, collapse
  // to a flat list — headers would just add noise.
  const showGroups = query.trim().length === 0;
  const groupedRows = useMemo(() => {
    if (!showGroups) return null;
    type Row =
      | { kind: "header"; group: CommandGroup }
      | { kind: "command"; cmd: Command; index: number };
    const rows: Row[] = [];
    let idx = 0;
    for (const g of GROUP_ORDER) {
      const members = filtered.filter((c) => c.group === g);
      if (members.length === 0) continue;
      rows.push({ kind: "header", group: g });
      for (const cmd of members) {
        rows.push({ kind: "command", cmd, index: idx++ });
      }
    }
    return rows;
  }, [filtered, showGroups]);

  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const runAt = (idx: number) => {
    const cmd = filtered[idx];
    if (!cmd) return;
    play("click");
    setOpen(false);
    requestAnimationFrame(() => cmd.run());
  };

  // Move without a sound — hover-tick was too chatty. Commit (Enter)
  // still plays via runAt, which is the meaningful moment.
  const moveActive = (next: number) => {
    if (next === activeIdx) return;
    setActiveIdx(next);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(Math.min(activeIdx + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(Math.max(activeIdx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(activeIdx);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveActive(filtered.length - 1);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{
                  opacity: 1,
                  backdropFilter: "blur(4px)",
                  transition: { duration: 0.18 },
                }}
                exit={{
                  opacity: 0,
                  backdropFilter: "blur(0px)",
                  transition: { duration: 0.14 },
                }}
                className="fixed inset-0 z-50 bg-black/60"
              />
            </DialogPrimitive.Overlay>
            {/* Flex container handles centering robustly across nested
                transform/filter/contain ancestors — `fixed left-1/2
                -translate-x-1/2` can drift when a parent is a containing
                block. The pointer-events-none wrapper lets the overlay
                still catch outside clicks; the card itself opts back in. */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh] sm:pt-[20vh]">
              <DialogPrimitive.Content forceMount asChild>
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    y: -4,
                    scale: 0.98,
                    filter: "blur(4px)",
                    transition: { duration: 0.14 },
                  }}
                  transition={spring.soft}
                  // Matches the editor tool-panel chrome: same gradient
                  // (bg-panel), the panel-top inset highlight, plus a
                  // full elevation stack (close + far drops) so it
                  // reads as a floating version of the same surface.
                  className={cn(
                    "pointer-events-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-ink-border bg-panel",
                    "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_2px_4px_var(--shadow-drop-close),0_24px_64px_-16px_var(--shadow-drop-far),0_10px_24px_-8px_var(--shadow-drop-mid)]",
                  )}
                >
                  <DialogPrimitive.Title className="sr-only">
                    Command palette
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Search and run builder actions
                  </DialogPrimitive.Description>

                  {/* Search row — styled like an editor input well:
                      recessed bg-input gradient, inner top shadow,
                      1px bottom border so it reads as its own section
                      inside the panel. */}
                  <div
                    className={cn(
                      "flex items-center gap-2 border-b border-ink-border bg-input px-3.5 transition-colors duration-fast",
                      "shadow-[inset_0_1.5px_2px_var(--input-shadow-top)]",
                      query.trim() &&
                        "bg-[linear-gradient(180deg,oklch(0.855_0.165_85_/_0.05)_0%,var(--grad-input-bot)_100%)]",
                    )}
                  >
                    <Search
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors duration-fast",
                        query.trim()
                          ? "text-[oklch(0.62_0.14_78)]"
                          : "text-ink-subtle",
                      )}
                      aria-hidden
                    />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onInputKey}
                      placeholder="Search commands…"
                      className="h-11 flex-1 bg-transparent text-[13px] text-ink-text placeholder:text-ink-subtle focus:outline-none"
                    />
                    <kbd
                      aria-hidden
                      className="hidden h-[20px] items-center justify-center rounded-[5px] border border-ink-border bg-ink-surface px-1.5 font-mono text-[10.5px] font-semibold leading-none text-ink-subtle sm:inline-flex"
                    >
                      ESC
                    </kbd>
                  </div>

                  <ul
                    className="max-h-[360px] overflow-auto px-1.5 py-2"
                    role="listbox"
                    aria-label="Commands"
                  >
                    {filtered.length === 0 ? (
                      <li className="px-4 py-10 text-center text-[12px] text-ink-subtle">
                        No matches for &ldquo;{query}&rdquo;
                      </li>
                    ) : showGroups && groupedRows ? (
                      groupedRows.map((row) =>
                        row.kind === "header" ? (
                          <li
                            key={`h-${row.group}`}
                            className="mt-3 px-2 pb-1.5 pt-1 first:mt-1"
                            aria-hidden
                          >
                            <SectionLabel size="xs">
                              {GROUP_LABEL[row.group]}
                            </SectionLabel>
                          </li>
                        ) : (
                          <CommandRow
                            key={row.cmd.id}
                            cmd={row.cmd}
                            active={row.index === activeIdx}
                            onHover={() => moveActive(row.index)}
                            onSelect={() => runAt(row.index)}
                          />
                        ),
                      )
                    ) : (
                      filtered.map((cmd, i) => (
                        <CommandRow
                          key={cmd.id}
                          cmd={cmd}
                          active={i === activeIdx}
                          onHover={() => moveActive(i)}
                          onSelect={() => runAt(i)}
                        />
                      ))
                    )}
                  </ul>

                  <div className="flex items-center justify-between gap-3 border-t border-ink-border bg-tabs px-4 py-2.5 text-[10.5px] text-ink-subtle">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Kbd size="xs">↑↓</Kbd>
                        <span>navigate</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Kbd size="xs">↵</Kbd>
                        <span>run</span>
                      </span>
                    </div>
                    <span className="flex items-center gap-1.5">
                      <Kbd size="xs">⌘K</Kbd>
                      <span>to toggle</span>
                    </span>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function CommandRow({
  cmd,
  active,
  onHover,
  onSelect,
}: {
  cmd: Command;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = cmd.icon;
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onHover}
        onClick={onSelect}
        role="option"
        aria-selected={active}
        // Active state mirrors the tool panel's "selected" pill
        // (e.g. the "Name" tab in Typography) — inset top highlight,
        // inset bottom edge, and a hairline ring so it reads as a
        // raised button nested inside the panel surface.
        className={cn(
          "relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-[background,color,box-shadow] duration-fast",
          active
            ? [
                "bg-card text-ink-text",
                "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_0_0_1px_var(--ink-border),0_1px_2px_var(--shadow-drop-close)]",
              ].join(" ")
            : "text-ink-muted hover:bg-ink-hover hover:text-ink-text",
        )}
      >
        {/* Amber left indicator on the active row — subtle, matches the
            CTA/slider accent. Only the active row gets it so the rest
            of the list stays quiet. */}
        {active && (
          <span
            aria-hidden
            className="absolute inset-y-[6px] left-0 w-[2px] rounded-r-full bg-[linear-gradient(180deg,oklch(0.895_0.158_85)_0%,oklch(0.815_0.172_82)_100%)] shadow-[0_0_0_0.5px_oklch(0.55_0.12_75_/_0.5)]"
          />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors duration-fast",
            active ? "text-[oklch(0.62_0.14_78)]" : "text-ink-subtle",
          )}
          aria-hidden
        />
        <span className="flex-1 truncate text-[12.5px]">{cmd.label}</span>
        {cmd.hint && (
          <Kbd
            size="md"
            tone={active ? "active" : "muted"}
            className="hidden sm:inline-flex"
          >
            {cmd.hint}
          </Kbd>
        )}
        {active && (
          <CornerDownLeft
            className="h-3.5 w-3.5 shrink-0 text-[oklch(0.62_0.14_78)]"
            aria-hidden
          />
        )}
      </button>
    </li>
  );
}

