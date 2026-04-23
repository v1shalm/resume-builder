export type FontSource = "google" | "fontshare";
export type FontCategory = "sans" | "serif" | "display";

export type FontDef = {
  id: string;
  family: string;
  label: string;
  category: FontCategory;
  source: FontSource;
  webCssUrl: string; // CSS stylesheet URL for browser preview
  ttfUrls?: Array<{ weight: number; url: string }>; // Reserved for future PDF embedding
  weights: number[];
  note?: string;
};

// PDF font embedding is disabled for now — @fontsource doesn't ship TTFs and
// cross-origin TTF URLs are fragile in the browser. Exported PDFs render in
// Helvetica (a built-in PDF font — zero bytes embedded, always works).
// Preview still uses the chosen font via the CSS stylesheet below.

const GF = (family: string, weights = [400, 500, 600, 700]) =>
  `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weights.join(";")}&display=swap`;

const FS = (slug: string, weights = [400, 500, 600, 700]) =>
  `https://api.fontshare.com/v2/css?f[]=${slug}@${weights.join(",")}&display=swap`;

export const fonts: FontDef[] = [
  // — Google Fonts —
  {
    id: "geist",
    family: "Geist",
    label: "Geist",
    category: "sans",
    source: "google",
    webCssUrl: GF("Geist", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "manrope",
    family: "Manrope",
    label: "Manrope",
    category: "sans",
    source: "google",
    webCssUrl: GF("Manrope", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "sora",
    family: "Sora",
    label: "Sora",
    category: "sans",
    source: "google",
    webCssUrl: GF("Sora", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "work-sans",
    family: "Work Sans",
    label: "Work Sans",
    category: "sans",
    source: "google",
    webCssUrl: GF("Work Sans", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "public-sans",
    family: "Public Sans",
    label: "Public Sans",
    category: "sans",
    source: "google",
    webCssUrl: GF("Public Sans", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "archivo",
    family: "Archivo",
    label: "Archivo",
    category: "sans",
    source: "google",
    webCssUrl: GF("Archivo", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "bricolage",
    family: "Bricolage Grotesque",
    label: "Bricolage Grotesque",
    category: "display",
    source: "google",
    webCssUrl: GF("Bricolage Grotesque", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "merriweather",
    family: "Merriweather",
    label: "Merriweather",
    category: "serif",
    source: "google",
    webCssUrl: GF("Merriweather", [400, 700]),
    weights: [400, 700],
  },
  {
    id: "source-serif",
    family: "Source Serif 4",
    label: "Source Serif 4",
    category: "serif",
    source: "google",
    webCssUrl: GF("Source Serif 4", [400, 600, 700]),
    weights: [400, 600, 700],
  },
  {
    id: "spectral",
    family: "Spectral",
    label: "Spectral",
    category: "serif",
    source: "google",
    webCssUrl: GF("Spectral", [400, 500, 700]),
    weights: [400, 500, 700],
  },

  // — Fontshare —
  {
    id: "satoshi",
    family: "Satoshi",
    label: "Satoshi",
    category: "sans",
    source: "fontshare",
    webCssUrl: FS("satoshi", [400, 500, 700]),
    weights: [400, 500, 700],
  },
  {
    id: "switzer",
    family: "Switzer",
    label: "Switzer",
    category: "sans",
    source: "fontshare",
    webCssUrl: FS("switzer", [400, 500, 700]),
    weights: [400, 500, 700],
  },
  {
    id: "general-sans",
    family: "General Sans",
    label: "General Sans",
    category: "sans",
    source: "fontshare",
    webCssUrl: FS("general-sans", [400, 500, 600]),
    weights: [400, 500, 600],
  },
  {
    id: "supreme",
    family: "Supreme",
    label: "Supreme",
    category: "sans",
    source: "fontshare",
    webCssUrl: FS("supreme", [400, 500, 700]),
    weights: [400, 500, 700],
  },
  {
    id: "clash-display",
    family: "Clash Display",
    label: "Clash Display",
    category: "display",
    source: "fontshare",
    webCssUrl: FS("clash-display", [400, 500, 600, 700]),
    weights: [400, 500, 600, 700],
  },
  {
    id: "boska",
    family: "Boska",
    label: "Boska",
    category: "serif",
    source: "fontshare",
    webCssUrl: FS("boska", [400, 500, 700]),
    weights: [400, 500, 700],
  },
  {
    id: "sentient",
    family: "Sentient",
    label: "Sentient",
    category: "serif",
    source: "fontshare",
    webCssUrl: FS("sentient", [400, 500, 700]),
    weights: [400, 500, 700],
  },
];

export const fontById = (id: string): FontDef => {
  return fonts.find((f) => f.id === id) ?? fonts[0];
};

export const defaultFont = fonts[0];
