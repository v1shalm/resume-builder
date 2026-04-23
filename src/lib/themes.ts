// Each theme pairs two colors:
//   `accent` — used for the name heading and section titles.
//   `sub`    — a muted / desaturated sibling, used for entry titles
//              (role — company, skill group labels, education degrees,
//              link labels). Rendered lighter so the hierarchy still
//              resolves to the name and section headers first.

export type Theme = {
  id: string;
  name: string;
  accent: string;
  sub: string;
};

// Curated to the four most resume-appropriate options: Navy (corporate
// default), Ink (near-black, safest neutral), Graphite (understated cool
// grey), Teal (the single "point of view" pick that still reads
// professional for design roles).
export const THEMES: Theme[] = [
  { id: "navy",     name: "Navy",       accent: "#23316d", sub: "#525c87" },
  { id: "ink",      name: "Ink",        accent: "#1a1c24", sub: "#50525b" },
  { id: "graphite", name: "Graphite",   accent: "#3a4250", sub: "#6d7380" },
  { id: "teal",     name: "Teal",       accent: "#1f5e5e", sub: "#527a7a" },
];

export const themeById = (id: string): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
