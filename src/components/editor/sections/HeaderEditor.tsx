"use client";

import { useResumeStore, temporalStore } from "@/lib/store";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { showToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { SortableList, DragHandle } from "../SortableList";
import {
  Plus,
  Trash2,
  Mail,
  Link as LinkIcon,
  Phone,
  Check,
  AlertCircle,
} from "lucide-react";
import { StyleEditor } from "./StyleEditor";
import { autoHref, detectKind, validateContact } from "@/lib/contact-detect";
import { useSfx } from "@/lib/useSfx";
import { CharCount } from "@/components/ui/CharCount";

export function HeaderEditor() {
  const header = useResumeStore((s) => s.resume.header);
  const updateHeader = useResumeStore((s) => s.updateHeader);
  const addContact = useResumeStore((s) => s.addContact);
  const updateContact = useResumeStore((s) => s.updateContact);
  const removeContact = useResumeStore((s) => s.removeContact);
  const reorderContacts = useResumeStore((s) => s.reorderContacts);

  return (
    <div className="flex flex-col gap-7">
      {/* Identity cluster — the three fields that define "who" */}
      <section className="flex flex-col gap-6">
        <Field label="Name">
          <Input
            value={header.name}
            onChange={(e) => updateHeader({ name: e.target.value })}
            placeholder="Your name"
          />
        </Field>

        <Field label="Title">
          <div className="flex flex-col gap-1">
            <Input
              value={header.title}
              onChange={(e) => updateHeader({ title: e.target.value })}
              placeholder="Product Designer"
            />
            <div className="flex justify-end">
              <CharCount value={header.title} softMax={60} />
            </div>
          </div>
        </Field>

        <Field label="Summary" hint="One or two sentences about you.">
          <div className="flex flex-col gap-1">
            <Textarea
              rows={3}
              value={header.tagline}
              onChange={(e) => updateHeader({ tagline: e.target.value })}
              placeholder="What you do and what you bring to a team."
            />
            <div className="flex justify-end">
              <CharCount value={header.tagline} softMax={180} />
            </div>
          </div>
        </Field>
      </section>

      <div className="rule-fade" aria-hidden />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Contacts</Label>
          <Button
            variant="ghost"
            size="sm"
            sound="add"
            onClick={addContact}
            aria-label="Add contact"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add
          </Button>
        </div>
        <SortableList
          items={header.contacts}
          onReorder={reorderContacts}
          renderItem={(c, { dragAttrs, dragListeners }) => (
            <ContactRow
              contact={c}
              onUpdate={(patch) => updateContact(c.id, patch)}
              onRemove={() => removeContact(c.id)}
              dragAttrs={dragAttrs}
              dragListeners={dragListeners}
            />
          )}
        />
      </section>

      <StyleEditor />
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  labelFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  labelFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={labelFor}>{label}</Label>
        {hint ? (
          <span className="text-[11.5px] leading-[1.4] text-ink-subtle">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// Contact row with live validation + auto-detection of email / URL / phone.
// As you type a value the row picks a matching icon and, when the optional
// `href` is empty, auto-fills it with the clickable form (mailto:, tel:,
// or https://).
function ContactRow({
  contact,
  onUpdate,
  onRemove,
  dragAttrs,
  dragListeners,
}: {
  contact: { id: string; label: string; value: string; href?: string };
  onUpdate: (patch: Partial<{ label: string; value: string; href?: string }>) => void;
  onRemove: () => void;
  dragAttrs: Record<string, unknown>;
  dragListeners: Record<string, unknown> | undefined;
}) {
  const kind = detectKind(contact.value);
  const validationMsg = validateContact(contact.value);
  const play = useSfx();

  const onValueChange = (next: string) => {
    const patch: Partial<{ value: string; href?: string }> = { value: next };
    // Auto-fill href only when user hasn't set their own
    if (!contact.href) {
      const suggestion = autoHref(next);
      if (suggestion) patch.href = suggestion;
    }
    onUpdate(patch);
  };

  const KindIcon =
    kind === "email" ? Mail : kind === "url" ? LinkIcon : kind === "phone" ? Phone : null;
  const hasRightGlyph =
    Boolean(contact.value.trim()) && (Boolean(validationMsg) || kind !== "text");

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-ink-border bg-card p-2 shadow-raised-t">
      <DragHandle dragAttrs={dragAttrs} dragListeners={dragListeners} />
      <Input
        aria-label="Contact type"
        className="h-8 w-24 shrink-0 border-transparent bg-transparent text-[12px] text-ink-muted shadow-none hover:border-ink-border focus:shadow-none"
        value={contact.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="e.g. email"
      />
      <div className="relative flex flex-1 items-center">
        {KindIcon && (
          <KindIcon
            className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-ink-muted"
            aria-hidden
          />
        )}
        <Input
          aria-label="Contact details"
          className={[
            "h-8 flex-1 border-transparent bg-transparent shadow-none hover:border-ink-border focus:shadow-none",
            KindIcon ? "pl-7" : "",
            hasRightGlyph ? "pr-7" : "",
          ].join(" ")}
          value={contact.value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="What shows on the resume"
        />
        {/* Valid/invalid glyph on the right — auto-href still runs under
            the hood; we just keep the visual footprint clean and rely on
            the inline icon to signal state. */}
        {contact.value.trim() && !validationMsg && kind !== "text" && (
          <Check
            className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[var(--ink-success)]"
            aria-hidden
          />
        )}
        {validationMsg && (
          <AlertCircle
            className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-danger"
            aria-hidden
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          const label = contact.label || "Contact";
          play("remove");
          onRemove();
          showToast({
            message: `${label} removed`,
            action: {
              label: "Undo",
              onClick: () => temporalStore().undo(),
            },
          });
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-ink-hoverDanger hover:text-ink-danger sm:h-8 sm:w-8"
        aria-label={`Remove ${contact.label || "contact"}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
