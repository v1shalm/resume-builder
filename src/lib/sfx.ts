// Sound layer for the app.
//
// We use the official @web-kits/audio "Core" patch installed via
//   npx @web-kits/audio add raphaelsalaja/audio --patch core
// (see src/audio/core.ts). `_patch` is the generated SoundPatch object.
//
// SOUND_MAP aliases our internal semantic names (camelCase) to the
// patch's actual sound keys (kebab-case) so swapping patches later
// only requires rewiring this table, not the whole app.

import type { SoundPatch } from "@web-kits/audio";
import { _patch as corePatch } from "@/audio/core";

export const uiSoundPatch: SoundPatch = corePatch;

export const SOUND_MAP = {
  // Primary interaction cues
  click: "click",
  tap: "tap",
  tick: "tick",

  // Tabs, toggles, switches
  tabSwap: "tab-switch",
  toggleOn: "toggle-on",
  toggleOff: "toggle-off",
  select: "select",
  deselect: "deselect",

  // Add / remove / dnd
  add: "pop",
  remove: "delete",
  dragStart: "pop",
  dragEnd: "bounce",

  // Expand-in-place panels (e.g. section arranger accordion)
  open: "expand",
  close: "collapse",

  // Modal + dropdown variants
  modalOpen: "modal-open",
  modalClose: "modal-close",
  dropdownOpen: "dropdown-open",
  dropdownClose: "dropdown-close",

  // Theme swap
  theme: "swoosh",

  // Success / error outcomes
  success: "complete",
  error: "error",

  // Stepped control feedback
  sliderTick: "scroll-snap",
} as const;

export type SoundName = keyof typeof SOUND_MAP;
