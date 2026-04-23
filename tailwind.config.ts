import type { Config } from "tailwindcss";

const config: Config = {
  // Class-based — we toggle `dark` on <html>
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        // Editor chrome — theme-aware via CSS variables in globals.css
        ink: {
          bg: "var(--ink-bg)",
          bgDeep: "var(--ink-bg-deep)",
          surface: "var(--ink-surface)",
          surfaceHi: "var(--ink-surface-hi)",
          raised: "var(--ink-raised)",
          border: "var(--ink-border)",
          borderStrong: "var(--ink-border-strong)",
          text: "var(--ink-text)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
          accent: "var(--ink-accent)",
          accentTop: "oklch(0.89 0.16 85)",
          accentBot: "oklch(0.815 0.172 82)",
          accentText: "var(--ink-accent-text)",
          danger: "var(--ink-danger)",
          hover: "var(--ink-hover)",
          hoverDanger: "var(--ink-hover-danger)",
        },
        // Resume paper — fixed light across themes (this is the document)
        paper: {
          bg: "oklch(0.985 0.004 85)",
          text: "oklch(0.22 0.008 260)",
          muted: "oklch(0.48 0.008 260)",
          subtle: "oklch(0.62 0.008 260)",
          rule: "oklch(0.88 0.006 260)",
          accent: "oklch(0.32 0.08 265)",
        },
      },
      backgroundImage: {
        // 20px dot grid for the preview canvas — theme-aware dot color
        "dot-grid":
          "radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0)",
        hatch: [
          "repeating-linear-gradient(",
          "135deg,",
          "transparent 0 7px,",
          "var(--ink-bg-deep) 7px 8px",
          ")",
        ].join(" "),
      },
      backgroundSize: {
        "grid-sm": "20px 20px",
        "grid-md": "24px 24px",
      },
      // Motion grammar — a tiny, named vocabulary used across the app.
      //
      //   duration-fast  (140ms)  → micro-interactions, hover/press
      //   duration-base  (180ms)  → standard color/transform transitions
      //   duration-slow  (240ms)  → entrance/exit and layered reveals
      //
      //   ease-out-quart          → natural deceleration, snappy decel
      //   ease-out-expo           → stronger decel, feels "pulled in"
      //   ease-soft               → the 0.22/1/0.36/1 curve used for
      //                              overlays, radix primitives
      transitionDuration: {
        fast: "140ms",
        base: "180ms",
        slow: "240ms",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
