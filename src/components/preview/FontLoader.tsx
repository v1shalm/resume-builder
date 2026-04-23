"use client";

import { useEffect } from "react";
import { fontById } from "@/lib/fonts";

const loaded = new Set<string>();

function ensureLoaded(fontId: string) {
  if (loaded.has(fontId)) return;
  const font = fontById(fontId);
  const id = `font-${fontId}`;
  if (document.getElementById(id)) {
    loaded.add(fontId);
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = font.webCssUrl;
  document.head.appendChild(link);
  loaded.add(fontId);
}

export function FontLoader({
  titleFontId,
  bodyFontId,
}: {
  titleFontId: string;
  bodyFontId: string;
}) {
  useEffect(() => {
    ensureLoaded(titleFontId);
    ensureLoaded(bodyFontId);
  }, [titleFontId, bodyFontId]);
  return null;
}
