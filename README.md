# Resume Builder

A tactile, keyboard-first résumé editor with a live A4 preview and ATS-safe
PDF export. Feels like a tool — Linear, Raycast, Arc adjacent — rather than a
template gallery.

Built with **Next.js 15**, **React 19**, **TypeScript**, **Tailwind**, and
**Motion**. Open source under MIT.

---

## Highlights

- **Live A4 preview** — drag, type, theme; the preview updates in real time
  with a sealed containment boundary so edits don't repaint the page.
- **ATS-safe PDF export** — text-based, Helvetica, searchable. Toggle
  clickable links, subset fonts, or strip metadata.
- **Tactile audio feedback** — optional UI sounds powered by
  [`@web-kits/audio`](https://github.com/raphaelsalaja/audio) core patch.
  Every click, toggle, drag, and tab swap has a cue. One-click mute.
- **Cinematic theme swap** — dark→light plays a dawn sequence (whoosh,
  rising arpeggio, sparkle); light→dark plays a dusk sequence (whoosh,
  descending sweep, distant bell).
- **Drag-and-drop reordering** — experience rows, bullets, skill groups,
  sections, contacts. Keyboard-accessible via arrow keys.
- **Undo / redo** — global ⌘Z / ⌘⇧Z, plus an Undo toast on every delete.
  Rapid typing collapses into single history steps so you undo "the word,"
  not "the keystroke."
- **Multi-page awareness** — if your résumé grows past one A4, the preview
  shows page-break markers and an overflow pill so you can tighten before
  exporting.
- **Smart bullet scaffolding** — empty bullets offer 10 strong opener verbs
  (Led / Shipped / Designed / Built / …). Soft character counts turn amber
  as you approach editorial caps.
- **Font + theme controls** — 17 curated fonts (Google + Fontshare), four
  professional themes, per-role typography weight/tracking/line-height, all
  with tactile slider detents.
- **Keyboard shortcuts** — ⌘E export, ⌘Z/⌘⇧Z undo/redo, arrow keys cycle
  editor tabs.
- **Auto-save** — persisted to localStorage on every change with a subtle
  "Saving → Saved ✓" indicator in the topbar.
- **Light + dark modes** — fully themed chrome; the résumé paper stays
  consistent across both.

---

## Run it locally

```bash
git clone https://github.com/v1shalm/resume-builder.git
cd resume-builder
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script          | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the Turbopack dev server                |
| `npm run build` | Production build                              |
| `npm run start` | Serve the production build                    |
| `npm run lint`  | Lint with Next's ESLint config                |

---

## Stack

| Concern              | Library                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| Framework            | [Next.js 15](https://nextjs.org) (App Router, Turbopack)               |
| UI                   | React 19, Tailwind 3, Radix primitives                                 |
| State                | [Zustand](https://github.com/pmndrs/zustand) + `persist` + `zundo`     |
| Motion               | [Motion](https://motion.dev) (spring grammar in `src/lib/motion.ts`)   |
| Drag & drop          | [dnd-kit](https://dndkit.com)                                          |
| PDF                  | [`@react-pdf/renderer`](https://react-pdf.org) (lazy-loaded on export) |
| Audio                | [`@web-kits/audio`](https://audio.raphaelsalaja.com) core patch        |
| Icons                | [Lucide](https://lucide.dev)                                           |

### Bundle discipline

First Load JS for `/` is ~227 KB (102 KB shared + 125 KB page). The PDF
engine (`@react-pdf/renderer` ≈ 400 KB) is code-split and only loads when
the user opens the Export dialog, with hover/focus prefetch so it still
feels instant.

---

## Design system

The app reads a design context from `.impeccable.md` — users, brand, and
five guiding principles. Notable conventions:

- **Theme tokens** live in `src/app/globals.css` as CSS custom properties
  (oklch throughout, both light and dark palettes).
- **Motion tokens** (`duration-fast`/`base`/`slow`, `ease-out-quart`/
  `out-expo`/`soft`) in `tailwind.config.ts`; mirrored as `DURATION` and
  `EASE` constants in `src/lib/motion.ts` so the JS and CSS sides stay
  in lockstep.
- **Sounds** are a named patch — see `src/lib/sfx.ts` for the semantic
  map (`add`, `remove`, `tabSwap`, `toggleOn`/`Off`, `dragStart`/`End`,
  etc.) to the underlying `@web-kits/audio` core patch keys.

---

## Deploy

The project ships as a static-rendered Next app — it deploys to Vercel,
Netlify, Cloudflare Pages, or any Node host with a single `npm run build`.

### Vercel

```bash
npx vercel
```

No environment variables are required. All data is stored in the visitor's
browser (`localStorage`) — the builder never sees a server.

---

## Contributing

Issues and PRs welcome. Before submitting a PR:

1. Keep the motion grammar — use existing spring presets and duration
   tokens instead of introducing new magic numbers.
2. Keep the design principles in `.impeccable.md` in mind; the tool is
   meant to disappear.
3. Run `npx tsc --noEmit` and confirm `npm run build` has zero warnings
   before opening a PR.

---

## License

[MIT](./LICENSE)

Built by [Vishal Maurya](https://github.com/v1shalm).
