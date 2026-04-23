"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { parseResumeText, type ParseResult, type ParseWarning } from "@/lib/resume-parser";
import { showToast } from "@/lib/toast";
import { spring, tabSwap } from "@/lib/motion";
import { AlertTriangle, Info, ArrowLeft, FileInput } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Step = "paste" | "review";

export function ImportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const play = useSfx();
  const reviewNameRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setStep("paste");
    setText("");
    setResult(null);
    setName("");
    setTitle("");
    setTagline("");
  };

  const handleParse = () => {
    if (!text.trim()) return;
    const parsed = parseResumeText(text);
    setResult(parsed);
    setName(parsed.resume.header.name);
    setTitle(parsed.resume.header.title);
    setTagline(parsed.resume.header.tagline);
    setStep("review");
    play("tabSwap");
  };

  const handleBack = () => {
    setStep("paste");
    play("tabSwap");
  };

  const handleCommit = () => {
    if (!result) return;
    const resume = {
      ...result.resume,
      header: {
        ...result.resume.header,
        name: name.trim(),
        title: title.trim(),
        tagline: tagline.trim(),
      },
    };
    useResumeStore.getState().importResume(resume);
    play("success");
    showToast({
      message: "Imported — edit to polish",
      duration: 2400,
    });
    onOpenChange(false);
    // Reset after the close animation so the next open starts clean
    setTimeout(reset, 280);
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) setTimeout(reset, 280);
  };

  // Auto-focus the first input when arriving at the review step so the
  // user can start editing immediately without reaching for the mouse.
  useEffect(() => {
    if (step === "review") {
      requestAnimationFrame(() => reviewNameRef.current?.select());
    }
  }, [step]);

  const bulletTotal =
    result?.resume.experience.reduce((n, e) => n + e.bullets.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[560px]">
        <AnimatePresence mode="wait" initial={false}>
          {step === "paste" ? (
            <motion.div
              key="paste"
              variants={tabSwap}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={spring.soft}
            >
              <DialogHeader>
                <DialogTitle>Import resume</DialogTitle>
                <DialogDescription>
                  Paste the text of your existing resume. We&rsquo;ll detect
                  sections, roles, and links — you review before it replaces
                  what&rsquo;s here.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 px-5 pb-5">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={PLACEHOLDER}
                  spellCheck={false}
                  className={cn(
                    "h-[300px] w-full resize-none rounded-lg border border-[var(--input-border)] bg-input px-3 py-2.5 font-mono text-[11.5px] leading-[1.55] text-ink-text placeholder:text-ink-subtle shadow-well-t",
                    "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none",
                  )}
                />
                <p className="text-[11px] leading-snug text-ink-subtle">
                  Tip: copy-paste from LinkedIn&rsquo;s &ldquo;Save to PDF&rdquo;
                  or any .docx. Section headings like &ldquo;Experience&rdquo;,
                  &ldquo;Education&rdquo;, &ldquo;Skills&rdquo; help us parse
                  better.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleParse}
                  disabled={!text.trim()}
                >
                  <FileInput className="h-3.5 w-3.5" aria-hidden />
                  Parse &amp; review
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="review"
              variants={tabSwap}
              initial="hidden"
              animate="show"
              exit="exit"
              transition={spring.soft}
            >
              <DialogHeader>
                <DialogTitle>Review parsed resume</DialogTitle>
                <DialogDescription>
                  Quick check before we replace your current data. Detailed
                  edits happen in the editor after import.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 px-5 pb-5">
                {result && result.warnings.length > 0 && (
                  <WarningList warnings={result.warnings} />
                )}

                <div className="grid grid-cols-[72px_1fr] items-start gap-x-3 gap-y-3">
                  <FieldLabel>Name</FieldLabel>
                  <ReviewInput
                    ref={reviewNameRef}
                    value={name}
                    onChange={setName}
                    placeholder="Your name"
                  />

                  <FieldLabel>Title</FieldLabel>
                  <ReviewInput
                    value={title}
                    onChange={setTitle}
                    placeholder="e.g. Product Designer"
                  />

                  <FieldLabel align="start">Tagline</FieldLabel>
                  <textarea
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    rows={3}
                    placeholder="One-line summary"
                    className={cn(
                      "resize-none rounded-md border border-[var(--input-border)] bg-input px-2.5 py-2 text-[12.5px] leading-snug text-ink-text placeholder:text-ink-subtle shadow-well-t",
                      "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none",
                    )}
                  />
                </div>

                {result && (
                  <div className="flex flex-col gap-2 rounded-xl border border-ink-border bg-ink-surface/60 p-3">
                    <SectionLabel size="xs">What we found</SectionLabel>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCell
                        value={result.resume.experience.length}
                        label={result.resume.experience.length === 1 ? "role" : "roles"}
                      />
                      <StatCell value={bulletTotal} label="bullets" />
                      <StatCell
                        value={result.resume.skillGroups.length}
                        label={result.resume.skillGroups.length === 1 ? "skill group" : "skill groups"}
                      />
                      <StatCell
                        value={result.resume.education.length}
                        label={result.resume.education.length === 1 ? "education" : "education"}
                      />
                      <StatCell
                        value={result.resume.header.contacts.length}
                        label={result.resume.header.contacts.length === 1 ? "contact" : "contacts"}
                      />
                      <StatCell
                        value={result.resume.links.length}
                        label={result.resume.links.length === 1 ? "link" : "links"}
                      />
                    </div>
                  </div>
                )}

                <p className="text-[11px] leading-snug text-ink-subtle">
                  This replaces your current resume. You can undo with{" "}
                  <kbd className="font-mono text-[10.5px] text-ink-muted">⌘Z</kbd>{" "}
                  after committing.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" size="md" onClick={handleBack}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={handleCommit}>
                  Use this data
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-ink-border bg-ink-bg/50 px-5 py-4">
      {children}
    </div>
  );
}

function WarningList({ warnings }: { warnings: ParseWarning[] }) {
  return (
    <ul className="overflow-hidden rounded-lg border border-ink-border bg-ink-surface/60">
      {warnings.map((w, i) => (
        <li
          key={w.id}
          className={cn(
            "flex items-start gap-2.5 px-3 py-2 text-[11.5px] leading-snug",
            i > 0 && "border-t border-ink-border",
            w.severity === "warning" ? "text-ink-text" : "text-ink-muted",
          )}
        >
          <WarningIcon severity={w.severity} />
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}

function FieldLabel({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <SectionLabel
      as="label"
      size="xs"
      className={cn(align === "center" ? "pt-[11px]" : "pt-2.5")}
    >
      {children}
    </SectionLabel>
  );
}

type ReviewInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

const ReviewInput = React.forwardRef<HTMLInputElement, ReviewInputProps>(
  ({ value, onChange, placeholder }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 rounded-md border border-[var(--input-border)] bg-input px-2.5 text-[12.5px] text-ink-text placeholder:text-ink-subtle shadow-well-t",
          "focus:border-[var(--input-focus-border)] focus:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_2.5px_var(--input-focus-ring)] focus:outline-none",
        )}
      />
    );
  },
);
ReviewInput.displayName = "ReviewInput";

function StatCell({ value, label }: { value: number; label: string }) {
  const dim = value === 0;
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md border border-ink-border bg-ink-bg/40 px-2.5 py-2",
        dim && "opacity-55",
      )}
    >
      <span className="font-mono text-[16px] font-semibold leading-none tabular-nums text-ink-text">
        {value}
      </span>
      <span className="text-[10.5px] leading-none text-ink-subtle">{label}</span>
    </div>
  );
}

function WarningIcon({ severity }: { severity: ParseWarning["severity"] }) {
  if (severity === "warning") {
    return (
      <AlertTriangle
        className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.14_75)]"
        aria-hidden
      />
    );
  }
  return (
    <Info
      className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink-subtle"
      aria-hidden
    />
  );
}

const PLACEHOLDER = `Arjun Mehta
Product Designer

arjun@example.com · +91 98765 43210
arjunmehta.design

3+ years across fintech, SaaS, and consumer commerce...

Experience

Senior Product Designer — Lattice Labs
Dec 2023 — Present
• Led the redesign of the consumer lending flow...
• Shipped the first version of the design system...

UI/UX Designer — Mintflow Studio
Jul 2022 — Nov 2023
• Designed a B2B analytics dashboard...

Education

Bachelor of Design, Interaction Design
Anand Institute of Design, 2018 — 2022

Skills
Design: Product Design, UX, UI, Interaction Design
Tools: Figma, Framer, Notion

Links
Portfolio: https://arjunmehta.design
LinkedIn: https://linkedin.com/in/arjunmehta-design
`;
