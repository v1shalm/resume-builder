export type ContactKind = "email" | "url" | "phone" | "text";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}([/?#].*)?$/i;
const PHONE_RE = /^[+()\s\d-]{7,}$/;

export function detectKind(value: string): ContactKind {
  const v = value.trim();
  if (!v) return "text";
  if (EMAIL_RE.test(v)) return "email";
  if (URL_RE.test(v)) return "url";
  if (PHONE_RE.test(v)) return "phone";
  return "text";
}

// Turn a typed value into the corresponding clickable href. Returns null if
// the value isn't something we can link.
export function autoHref(value: string): string | null {
  const v = value.trim();
  const kind = detectKind(v);
  if (kind === "email") return `mailto:${v}`;
  if (kind === "phone") return `tel:${v.replace(/[^+\d]/g, "")}`;
  if (kind === "url") return v.startsWith("http") ? v : `https://${v}`;
  return null;
}

// Human-friendly validation for the current value. Returns null if valid or
// value is empty, otherwise an explanation of what's wrong.
export function validateContact(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // If it looks like someone is trying to type an email but it's malformed
  if (v.includes("@") && !EMAIL_RE.test(v)) {
    return "That email looks incomplete — try name@example.com";
  }
  // Malformed URL (has a dot but not a valid host)
  if (!v.includes("@") && v.includes(".") && !URL_RE.test(v) && !PHONE_RE.test(v)) {
    return "That link isn't quite right — check for typos";
  }
  return null;
}
