"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ResumePreview } from "../preview/ResumePreview";
import { FontLoader } from "../preview/FontLoader";
import { useResumeStore } from "@/lib/store";
import { Minus, Plus, Maximize2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

// A4 at 96 dpi — kept in sync with ResumePreview.
const PAGE_W = 794;
const PAGE_H = 1123;

export function PreviewPane() {
  const resume = useResumeStore((s) => s.resume);
  const [zoom, setZoom] = useState(0.82);
  const [fitMode, setFitMode] = useState(true);

  // Measure the actual content height of the paper so we can render
  // page-break indicators and warn when a resume spills past one A4.
  // ResizeObserver only fires when the paper's size changes, so this
  // is near-zero cost during typing (the paper height is stable until
  // a newline lands).
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(PAGE_H);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContentHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageCount = Math.max(1, Math.ceil(contentHeight / PAGE_H));
  const overflows = pageCount > 1;

  useEffect(() => {
    if (!fitMode) return;
    const fit = () => {
      const container = document.getElementById("preview-scroll");
      if (!container) return;
      // Padding ring around the paper varies by breakpoint (16/32/48 px).
      const pad = container.clientWidth < 640 ? 32 : container.clientWidth < 768 ? 64 : 96;
      const availableW = container.clientWidth - pad;
      const availableH = container.clientHeight - pad;
      const scale = Math.min(availableW / PAGE_W, availableH / PAGE_H, 1);
      setZoom(Math.max(0.3, scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fitMode]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      className="relative flex min-w-0 flex-col overflow-hidden border-b border-ink-border md:border-b-0"
      style={{ background: "var(--canvas-bg)" }}
    >
      <FontLoader
        titleFontId={resume.style.titleFontId}
        bodyFontId={resume.style.bodyFontId}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-dot-grid bg-grid-sm opacity-60"
        aria-hidden
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 90%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 40%, var(--canvas-vignette) 100%)",
        }}
      />

      {/* Overflow pill — only visible when the resume spills past a
          single A4. Sits top-centre, same pill grammar as the zoom
          toolbar at the bottom. Informational only, not dismissible. */}
      <AnimatePresence>
        {overflows && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.14 } }}
            transition={spring.soft}
            className={cn(
              "absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium backdrop-blur-md sm:top-5",
              "border-[oklch(0.72_0.14_55_/_0.5)] bg-[oklch(0.93_0.11_85_/_0.9)] text-[oklch(0.28_0.14_55)]",
              "shadow-[0_1px_2px_var(--shadow-drop-close),0_6px_16px_-4px_var(--shadow-drop-far)]",
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">
              Content spans {pageCount} pages
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="preview-scroll" className="relative z-10 flex-1 overflow-auto">
        <div className="flex min-h-full items-start justify-center p-4 sm:p-8 md:p-12">
          {/*
            Zoom is a paint-only `transform: scale()` — no layout change —
            so a Framer `layout` animation can't see it and only ends up
            re-measuring the huge preview subtree on every state change.
            Plain div is materially cheaper.

            `contain: layout paint style` seals the preview subtree as a
            containment boundary — the browser is told that nothing
            inside affects anything outside (and vice versa), so edits in
            the editor pane don't invalidate paint work on the preview's
            ancestors. Noticeable on slow devices.
          */}
          <div
            className="relative origin-top shadow-paper-t transition-transform duration-base ease-out-quart"
            style={{
              transform: `scale(${zoom})`,
              contain: "layout paint style",
            }}
          >
            <ResumePreview ref={paperRef} resume={resume} />
            {/* Page break markers — rendered inside the scaled wrapper
                so they move with the paper's zoom. A thin dashed rule
                sits exactly on the 1123px boundary with a "Page N" tag
                on the right. Purely informational; content flows
                through them (print/PDF will actually break there). */}
            {overflows &&
              Array.from({ length: pageCount - 1 }, (_, i) => {
                const top = (i + 1) * PAGE_H;
                return (
                  <div
                    key={i}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 flex items-center"
                    style={{ top }}
                  >
                    <div
                      className="flex-1"
                      style={{
                        borderTop:
                          "1px dashed oklch(0.72 0.14 55 / 0.7)",
                      }}
                    />
                    <span
                      className="ml-2 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.06em] text-[oklch(0.32_0.14_55)]"
                      style={{
                        background: "oklch(0.93 0.11 85 / 0.95)",
                        boxShadow:
                          "0 0 0 1px oklch(0.72 0.14 55 / 0.6), 0 1px 2px oklch(0 0 0 / 0.15)",
                      }}
                    >
                      PAGE {i + 2}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 rule-fade-v"
        aria-hidden
      />

      {/* Floating zoom toolbar with primary-CTA-level depth (black/gray) */}
      <motion.div
        role="toolbar"
        aria-label="Preview zoom"
        initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...spring.soft, delay: 0.1 }}
        className={cn(
          "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 p-1 backdrop-blur-md sm:bottom-5 sm:gap-1 sm:p-1.5",
          "rounded-full border border-ink-border bg-overlay",
          "shadow-[inset_0_1px_0_var(--shadow-highlight),0_2px_4px_var(--shadow-drop-close),0_12px_28px_-8px_var(--shadow-drop-far)]",
        )}
      >
        <ToolbarIconButton
          label="Zoom out"
          disabled={zoom <= 0.4}
          onClick={() => {
            setFitMode(false);
            setZoom((z) => Math.max(0.4, z - 0.1));
          }}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </ToolbarIconButton>

        <div className="relative flex h-8 min-w-[50px] items-center justify-center overflow-hidden px-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={zoomPct}
              initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -10, opacity: 0, filter: "blur(4px)" }}
              transition={spring.snap}
              className="text-[12px] font-semibold tabular-nums text-ink-text"
            >
              {zoomPct}%
            </motion.span>
          </AnimatePresence>
        </div>

        <ToolbarIconButton
          label="Zoom in"
          disabled={zoom >= 1.5}
          onClick={() => {
            setFitMode(false);
            setZoom((z) => Math.min(1.5, z + 0.1));
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </ToolbarIconButton>

        <div className="mx-0.5 h-4 w-px bg-ink-border" aria-hidden />

        <motion.button
          onClick={() => setFitMode(true)}
          whileTap={{ scale: 0.96, y: 0.5 }}
          transition={spring.press}
          aria-pressed={fitMode}
          aria-label="Fit to window"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors duration-fast",
            fitMode
              ? [
                  "text-ink-text bg-card",
                  "shadow-[inset_0_1px_0_var(--shadow-highlight),inset_0_-1px_0_var(--shadow-edge-dark),0_0_0_1px_var(--ink-border),0_1px_2px_var(--shadow-drop-close)]",
                ].join(" ")
              : "text-ink-muted hover:bg-ink-hover hover:text-ink-text",
          )}
        >
          <Maximize2 className="h-3 w-3" aria-hidden />
          Fit
        </motion.button>
      </motion.div>
    </div>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={spring.press}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-fast hover:bg-ink-hover hover:text-ink-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
    >
      {children}
    </motion.button>
  );
}
