"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring, rowFadeUp } from "@/lib/motion";
import { useSfx } from "@/lib/useSfx";

type Props = {
  // Comma-separated value — so we don't have to migrate storage shape.
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  "aria-label"?: string;
};

const parse = (s: string): string[] =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const serialize = (tokens: string[]) => tokens.join(", ");

export function TokenInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a skill…",
  ...rest
}: Props) {
  const tokens = React.useMemo(() => parse(value), [value]);
  const [draft, setDraft] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const play = useSfx();

  const existing = React.useMemo(
    () => new Set(tokens.map((t) => t.toLowerCase())),
    [tokens],
  );

  const filtered = React.useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter(
        (s) =>
          !existing.has(s.toLowerCase()) && s.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStart = b.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStart !== bStart) return aStart - bStart;
        return a.length - b.length;
      })
      .slice(0, 6);
  }, [draft, suggestions, existing]);

  React.useEffect(() => {
    if (highlighted >= filtered.length) setHighlighted(0);
  }, [filtered, highlighted]);

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (existing.has(next.toLowerCase())) {
      setDraft("");
      return;
    }
    play("add");
    onChange(serialize([...tokens, next]));
    setDraft("");
    setHighlighted(0);
  };

  const remove = (index: number) => {
    const next = tokens.slice();
    next.splice(index, 1);
    play("remove");
    onChange(serialize(next));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      if (filtered.length > 0 && draft.trim()) {
        e.preventDefault();
        commit(filtered[highlighted] ?? draft);
      } else if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
    } else if (e.key === "Backspace" && !draft && tokens.length > 0) {
      e.preventDefault();
      remove(tokens.length - 1);
    } else if (e.key === "ArrowDown" && filtered.length > 0) {
      e.preventDefault();
      setHighlighted((h) => {
        const nh = Math.min(h + 1, filtered.length - 1);
        if (nh !== h) play("tick");
        return nh;
      });
    } else if (e.key === "ArrowUp" && filtered.length > 0) {
      e.preventDefault();
      setHighlighted((h) => {
        const nh = Math.max(h - 1, 0);
        if (nh !== h) play("tick");
        return nh;
      });
    } else if (e.key === "Escape") {
      setDraft("");
    }
  };

  const suggestionsOpen = focused && filtered.length > 0;

  return (
    <div className="relative flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-input px-2 py-1.5 shadow-well-t transition-[border-color,box-shadow] duration-fast",
          "hover:border-ink-borderStrong",
          focused &&
            "border-[var(--input-focus-border)] shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)]",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence initial={false}>
          {tokens.map((token, i) => (
            <motion.span
              key={`${token}-${i}`}
              layout
              variants={rowFadeUp}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={spring.snap}
              className={cn(
                "group/token inline-flex items-center gap-1 rounded-md border border-ink-border bg-card py-[3px] pl-2 pr-1 text-[12.5px] text-ink-text shadow-chip-t",
              )}
            >
              <span>{token}</span>
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                whileTap={{ scale: 0.88 }}
                transition={spring.press}
                className="flex h-4 w-4 items-center justify-center rounded-sm text-ink-subtle transition-colors hover:bg-ink-hoverDanger hover:text-ink-danger"
                aria-label={`Remove ${token}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </motion.button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          aria-label={rest["aria-label"] ?? "Add skill"}
          className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[13.5px] text-ink-text placeholder:text-ink-subtle focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so click on suggestion can still commit
            setTimeout(() => setFocused(false), 120);
            if (draft.trim()) commit(draft);
          }}
          placeholder={tokens.length === 0 ? placeholder : ""}
        />
        {tokens.length === 0 && !draft && (
          <span
            className="pointer-events-none flex items-center gap-1 pr-1 text-[11.5px] text-ink-subtle"
            aria-hidden
          >
            <Plus className="h-3 w-3" />
            Add
          </span>
        )}
      </div>

      <AnimatePresence>
        {suggestionsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={spring.snap}
            className={cn(
              "absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-ink-border bg-overlay p-1 shadow-overlay-t",
            )}
          >
            <ul role="listbox" aria-label="Skill suggestions">
              {filtered.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlighted}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(s);
                    }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] text-ink-text transition-colors",
                      i === highlighted
                        ? "bg-ink-hover"
                        : "hover:bg-ink-hover",
                    )}
                  >
                    <span>
                      {highlightMatch(s, draft)}
                    </span>
                    <span className="text-[10.5px] text-ink-subtle">
                      {i === highlighted ? "↵" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function highlightMatch(s: string, q: string) {
  const query = q.trim();
  if (!query) return s;
  const lower = s.toLowerCase();
  const i = lower.indexOf(query.toLowerCase());
  if (i === -1) return s;
  return (
    <>
      {s.slice(0, i)}
      <span className="font-semibold text-ink-text">
        {s.slice(i, i + query.length)}
      </span>
      {s.slice(i + query.length)}
    </>
  );
}
