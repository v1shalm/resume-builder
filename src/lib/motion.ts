import type { Transition, Variants } from "motion/react";

// Shared motion vocabulary. Keep these sparse so the whole UI speaks in one
// grammar. Springs for interactive state changes, durations for entrance/
// exit curves that need to finish at a predictable time.
//
// These mirror the Tailwind tokens in tailwind.config.ts:
//   duration-fast (140ms) → DURATION.fast
//   duration-base (180ms) → DURATION.base
//   duration-slow (240ms) → DURATION.slow
// Keep them in lockstep — if you change one, change the other.
export const DURATION = {
  fast: 0.14,
  base: 0.18,
  slow: 0.24,
} as const;

// Canonical ease curves that match the Tailwind ease-* tokens.
export const EASE = {
  outQuart: [0.25, 1, 0.5, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  soft: [0.22, 1, 0.36, 1] as const,
  // For exits: a gentle in-quad. Objects falling toward their destination.
  inOut: [0.4, 0, 0.2, 1] as const,
  inQuad: [0.4, 0, 1, 1] as const,
};

export const spring = {
  // Default snappy UI spring. Most interactions use this.
  snap: { type: "spring", stiffness: 420, damping: 34, mass: 0.6 } satisfies Transition,
  // Softer spring for containers and large surfaces (dialog, panels).
  soft: { type: "spring", stiffness: 260, damping: 26, mass: 0.8 } satisfies Transition,
  // Slowest — for layout transitions when lists reorder.
  lazy: { type: "spring", stiffness: 200, damping: 24, mass: 0.9 } satisfies Transition,
  // Fast press feedback (tap, toggle).
  press: { type: "spring", stiffness: 700, damping: 32, mass: 0.4 } satisfies Transition,
} as const;

// Canonical enter: opacity + small y + brief blur. The blur cue is the
// Emil-signature — readable at a glance, never cartoonish.
export const fadeInBlur: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: spring.soft,
  },
  exit: {
    opacity: 0,
    y: -4,
    filter: "blur(4px)",
    transition: { duration: DURATION.base, ease: EASE.inOut },
  },
};

// Stagger container — kids cascade in.
export const stagger = (childDelay = 0.04, base = 0): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: childDelay,
      delayChildren: base,
    },
  },
});

// Compact item fade+slide for list rows.
export const rowFadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: spring.snap },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION.fast, ease: EASE.inQuad },
  },
};

// Tab content swap. Blur was removed from here because the tab panel
// can be a huge subtree (Experience with many role cards), and the
// temporary GPU layer required to blur it can cost a frame on lower-end
// hardware. Blur stays as a signature on *small* surfaces (dialogs,
// toolbar number flips, etc.) where it's effectively free.
export const tabSwap: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: spring.soft,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION.fast, ease: EASE.inQuad },
  },
};

// Dialog entry — bigger scale & blur drop.
// Pairs with `fixed left-1/2 top-1/2` positioning. The -50%/-50% on x/y bakes
// centering directly into motion's transform so its animation doesn't fight a
// separate CSS translate.
export const dialogEnter: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    x: "-50%",
    y: "calc(-50% + 8px)",
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    scale: 1,
    x: "-50%",
    y: "-50%",
    filter: "blur(0px)",
    transition: { ...spring.soft, filter: { duration: 0.26 } },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    x: "-50%",
    y: "calc(-50% + 4px)",
    filter: "blur(6px)",
    transition: { duration: DURATION.base, ease: EASE.inOut },
  },
};
