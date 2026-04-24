"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { fonts, fontById, type FontDef } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useSfx } from "@/lib/useSfx";

type Props = {
  value: string;
  onChange: (id: string) => void;
  "aria-label": string;
};

export function FontSelect({ value, onChange, ...rest }: Props) {
  const current = fontById(value);
  const play = useSfx();

  // Preload all fonts once dropdown opens so previews render correctly.
  // Deferred to an idle frame so the CSS fetches don't race against the
  // dropdown's open animation on slow connections.
  const [opened, setOpened] = React.useState(false);
  React.useEffect(() => {
    if (!opened) return;
    const run = () => {
      for (const f of fonts) {
        const id = `font-preview-${f.id}`;
        if (document.getElementById(id)) continue;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = f.webCssUrl;
        document.head.appendChild(link);
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(run)
      : window.setTimeout(run, 0);
    return () => {
      const cancel = (window as Window & {
        cancelIdleCallback?: (id: number) => void;
      }).cancelIdleCallback;
      if (cancel) cancel(id);
      else window.clearTimeout(id);
    };
  }, [opened]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, FontDef[]> = {
      "Google Fonts": fonts.filter((f) => f.source === "google"),
      Fontshare: fonts.filter((f) => f.source === "fontshare"),
    };
    return groups;
  }, []);

  return (
    <DropdownMenu.Root
      onOpenChange={(o) => {
        play(o ? "dropdownOpen" : "dropdownClose");
        setOpened(o);
      }}
    >
      <DropdownMenu.Trigger
        aria-label={rest["aria-label"]}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-ink-border bg-card px-3 text-left text-[13px] text-ink-text shadow-raised-t",
          "transition-colors duration-fast hover:border-ink-borderStrong",
          "focus:outline-none data-[state=open]:border-ink-borderStrong",
        )}
      >
        <span className="flex items-baseline gap-2 truncate">
          <span
            className="truncate"
            style={{ fontFamily: `'${current.family}', var(--font-sans)` }}
          >
            {current.label}
          </span>
          <span className="text-[11px] text-ink-subtle">
            {current.source === "fontshare" ? "Fontshare" : "Google"}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 max-h-[340px] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] overflow-y-auto rounded-xl border border-ink-border bg-overlay p-1 shadow-overlay-t",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
          {Object.entries(grouped).map(([group, list]) => (
            <React.Fragment key={group}>
              <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-medium text-ink-subtle">
                {group}
              </div>
              {list.map((f) => {
                const isActive = f.id === value;
                return (
                  <DropdownMenu.Item
                    key={f.id}
                    onSelect={() => {
                      if (!isActive) play("select");
                      onChange(f.id);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-[13px] text-ink-text",
                      "focus:bg-ink-surfaceHi focus:outline-none data-[highlighted]:bg-ink-surfaceHi",
                    )}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span
                        style={{ fontFamily: `'${f.family}', var(--font-sans)` }}
                      >
                        {f.label}
                      </span>
                      {f.note && (
                        <span className="text-[10.5px] text-ink-subtle">
                          {f.note}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-ink-accent" />
                    )}
                  </DropdownMenu.Item>
                );
              })}
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
