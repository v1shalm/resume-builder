"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { ResumeDocument } from "../pdf/ResumeDocument";
import { useResumeStore } from "@/lib/store";
import { useSfx } from "@/lib/useSfx";
import { showToast } from "@/lib/toast";
import { Download, Loader2 } from "lucide-react";

type Options = {
  filename: string;
  includeHyperlinks: boolean;
  includeMetadata: boolean;
  subsetFonts: boolean;
};

// Compact month label ("Apr2026") — a recruiter opening
// "Alex_Chen_Resume_Apr2026.pdf" instantly knows whose it is and when
// it was written. Compare to "Resume.pdf" — a landfill.
function currentMonthYear() {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  return `${month}${now.getFullYear()}`;
}

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resume = useResumeStore((s) => s.resume);
  const defaultFilename = resume.header.name
    ? `${resume.header.name.replace(/\s+/g, "_")}_Resume_${currentMonthYear()}`
    : `Resume_${currentMonthYear()}`;

  const [opts, setOpts] = useState<Options>({
    filename: defaultFilename,
    includeHyperlinks: true,
    includeMetadata: false,
    subsetFonts: true,
  });

  const [estimating, setEstimating] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const play = useSfx();

  useEffect(() => {
    if (open) play("modalOpen");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      setOpts((o) => ({ ...o, filename: defaultFilename }));
      setEstimatedSize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultFilename]);

  const docElement = useMemo(
    () => (
      <ResumeDocument
        resume={applyOptions(resume, opts)}
        metadata={{
          title: `${resume.header.name} — Resume`,
          author: resume.header.name,
          includeMetadata: opts.includeMetadata,
        }}
      />
    ),
    [resume, opts],
  );

  const estimate = async () => {
    setEstimating(true);
    try {
      const blob = await pdf(docElement).toBlob();
      setEstimatedSize(blob.size);
    } catch (err) {
      console.error(err);
      setEstimatedSize(null);
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setEstimatedSize(null);
    const t = setTimeout(() => estimate(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opts]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await pdf(docElement).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${opts.filename || "Resume"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      play("success");
      onOpenChange(false);
      // Sacred moment — user just created the artifact they'll send
      // to a recruiter. A warm sendoff, not a generic "Success."
      showToast({
        message: "Resume ready — good luck out there",
        duration: 4000,
      });
    } catch (err) {
      console.error(err);
      play("error");
      alert(
        "Couldn't create the PDF. Try toggling the font in Header → Typography to a Google font, then export again.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
          <DialogDescription>
            Text stays searchable and copy-pastable, so résumé scanners can read it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-5 pb-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="export-filename"
              className="text-[11.5px] font-medium text-ink-muted"
            >
              Filename
            </label>
            <div className="flex items-center rounded-lg border border-[var(--input-border)] bg-input shadow-well-t focus-within:border-[var(--input-focus-border)] focus-within:shadow-[inset_0_1.5px_2px_var(--input-shadow-top),0_0_0_3px_var(--input-focus-ring)]">
              <Input
                id="export-filename"
                className="h-10 flex-1 border-none bg-transparent shadow-none hover:border-transparent focus:border-transparent focus:shadow-none"
                value={opts.filename}
                onChange={(e) => setOpts({ ...opts, filename: e.target.value })}
              />
              <span className="pr-3 text-[12.5px] text-ink-subtle">.pdf</span>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border bg-input shadow-[inset_0_1px_0_var(--shadow-highlight)]">
            <Row
              label="Embed clickable links"
              hint="Contacts and online links open externally from the PDF."
              checked={opts.includeHyperlinks}
              onCheckedChange={(v) => setOpts({ ...opts, includeHyperlinks: v })}
            />
            <Row
              label="Trim unused characters from fonts"
              hint="Keeps only the letters your resume actually uses. Smaller file — recommended."
              checked={opts.subsetFonts}
              onCheckedChange={(v) => setOpts({ ...opts, subsetFonts: v })}
            />
            <Row
              label="Include document metadata"
              hint="Author, title, and creator fields. Off by default — privacy first."
              checked={opts.includeMetadata}
              onCheckedChange={(v) => setOpts({ ...opts, includeMetadata: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-border bg-input px-4 py-3 shadow-[inset_0_1px_0_var(--shadow-highlight)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] font-medium text-ink-muted">
                Estimated size
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-ink-text">
                {estimating
                  ? "calculating…"
                  : estimatedSize != null
                    ? formatBytes(estimatedSize)
                    : "—"}
              </span>
            </div>
            <span className="text-[12px] text-ink-subtle">
              A4 · 1 page
            </span>
          </div>

          <div className="rounded-lg border border-ink-border bg-ink-bg/60 px-4 py-3">
            <p className="text-[12.5px] leading-[1.55] text-ink-muted">
              The exported PDF uses Helvetica so it reads cleanly through résumé
              scanners (ATS). Your chosen fonts still apply to the preview.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-border bg-ink-bg/50 px-5 py-4">
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>{exporting ? "Rendering…" : "Download"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-ink-text">{label}</span>
        <span className="text-[12px] leading-[1.5] text-ink-subtle">{hint}</span>
      </div>
      <div className="pt-0.5">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </label>
  );
}

function applyOptions(resume: ReturnType<typeof useResumeStore.getState>["resume"], opts: Options) {
  if (opts.includeHyperlinks) return resume;
  return {
    ...resume,
    header: {
      ...resume.header,
      contacts: resume.header.contacts.map((c) => ({ ...c, href: undefined })),
    },
    links: resume.links.map((l) => ({ ...l, url: "" })),
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
