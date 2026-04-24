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
  Search,
  Target,
  FileStack,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/Kbd";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
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

// Raycast-voice palette: flat rows, single hover tint, no accent
// stripes, no amber anywhere. Hierarchy comes from group headers and
// spacing — not from decoration on the active row.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

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
        label: "ATS Match",
        hint: "⌘J",
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
        label: "Duplicate as new variant",
        hint: "⌘⇧N",
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
        id: "reset",
        label: "Reset to starter",
        icon: RotateCcw,
        group: "actions",
        keywords: ["clear", "delete", "new"],
        run: () => setResetOpen(true),
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

  // Render with group headers when the query is empty so the palette
  // reads as an index of capabilities. Filtering collapses to a flat
  // list — headers would just add noise.
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

  // Scroll the active row into view as keyboard navigation moves
  // past the visible slice of the list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

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
    <>
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.14 } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh] sm:pt-[18vh]">
              <DialogPrimitive.Content forceMount asChild>
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.985, transition: { duration: 0.12 } }}
                  transition={spring.soft}
                  className={cn(
                    "pointer-events-auto w-full max-w-[640px] overflow-hidden rounded-xl border border-ink-border bg-panel",
                    "shadow-[0_24px_64px_-16px_var(--shadow-drop-far),0_10px_24px_-8px_var(--shadow-drop-mid)]",
                  )}
                >
                  <DialogPrimitive.Title className="sr-only">
                    Command palette
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Search and run builder actions
                  </DialogPrimitive.Description>

                  {/* Search — flat row, no gradient-on-query, no inner
                      shadow. The input and the list share one surface
                      tone; a single 1px divider separates them. */}
                  <div className="flex h-14 items-center gap-3 border-b border-ink-border px-4">
                    <Search
                      className="h-4 w-4 shrink-0 text-ink-subtle"
                      aria-hidden
                    />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onInputKey}
                      placeholder="Search commands…"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-full flex-1 bg-transparent text-[14px] text-ink-text placeholder:text-ink-subtle focus:outline-none"
                    />
                  </div>

                  <ul
                    ref={listRef}
                    className="max-h-[420px] overflow-auto py-1.5"
                    role="listbox"
                    aria-label="Commands"
                  >
                    {filtered.length === 0 ? (
                      <li className="px-4 py-12 text-center text-[12.5px] text-ink-subtle">
                        No matches for &ldquo;{query}&rdquo;
                      </li>
                    ) : showGroups && groupedRows ? (
                      groupedRows.map((row) =>
                        row.kind === "header" ? (
                          <li
                            key={`h-${row.group}`}
                            className="px-4 pb-1 pt-3 text-[11px] font-medium text-ink-subtle first:pt-2"
                            aria-hidden
                          >
                            {GROUP_LABEL[row.group]}
                          </li>
                        ) : (
                          <CommandRow
                            key={row.cmd.id}
                            cmd={row.cmd}
                            index={row.index}
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
                          index={i}
                          active={i === activeIdx}
                          onHover={() => moveActive(i)}
                          onSelect={() => runAt(i)}
                        />
                      ))
                    )}
                  </ul>

                  {/* Footer — single row of kbd hints, right-aligned.
                      No decorative chrome. */}
                  <div className="flex h-10 items-center justify-end gap-3 border-t border-ink-border bg-tabs px-4 text-[11px] text-ink-subtle">
                    <span className="flex items-center gap-1.5">
                      <span>Run</span>
                      <Kbd size="xs">↵</Kbd>
                    </span>
                    <span aria-hidden className="h-3 w-px bg-ink-border" />
                    <span className="flex items-center gap-1.5">
                      <span>Close</span>
                      <Kbd size="xs">esc</Kbd>
                    </span>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
    <ResetConfirmDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}

function ResetConfirmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const handleReset = () => {
    useResumeStore.getState().reset();
    onOpenChange(false);
    showToast({
      message: "Starter resume restored",
      duration: 2200,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset to the starter?</DialogTitle>
          <DialogDescription>
            Your edits will be replaced and can&apos;t be recovered. Save a JSON
            backup from the command palette first if you want to keep them.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
          <Button
            variant="ghost"
            size="md"
            sound="tap"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            sound="remove"
            onClick={handleReset}
          >
            Reset resume
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandRow({
  cmd,
  index,
  active,
  onHover,
  onSelect,
}: {
  cmd: Command;
  index: number;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = cmd.icon;
  return (
    <li>
      <button
        type="button"
        data-idx={index}
        onMouseEnter={onHover}
        onClick={onSelect}
        role="option"
        aria-selected={active}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-fast",
          active ? "bg-ink-hover text-ink-text" : "text-ink-muted",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-ink-text" : "text-ink-subtle",
          )}
          aria-hidden
        />
        <span className="flex-1 truncate text-[13px]">{cmd.label}</span>
        {cmd.hint && (
          <Kbd size="sm" className="hidden sm:inline-flex">
            {cmd.hint}
          </Kbd>
        )}
      </button>
    </li>
  );
}
