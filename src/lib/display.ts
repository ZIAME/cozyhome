"use client";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setSetting } from "./db";

/**
 * How the room looks and moves. Saved in settings ("display") and applied as classes on <html>:
 * - calm: no animations or walking cat (also on when the system asks for reduced motion)
 * - simple: a lighter room for slower phones (no stars, clouds, snow or light effects)
 * - paused: set by the app whenever it's in the background, so nothing animates unseen
 */
export type Display = { calm: boolean; simple: boolean; timePreview: boolean };
const KEY = "display";
export const DEFAULT_DISPLAY: Display = { calm: false, simple: false, timePreview: false };

export function useDisplay(): [Display, (p: Partial<Display>) => void] {
  const d = useLiveQuery(async () => ({ ...DEFAULT_DISPLAY, ...((await db.settings.get(KEY))?.value as Partial<Display> | undefined) }), []) ?? DEFAULT_DISPLAY;
  return [d, p => setSetting(KEY, { ...d, ...p })];
}

/** Mount once: keeps the <html> classes in step with the settings and with the page being visible. */
export function useApplyDisplay(d: Display) {
  useEffect(() => {
    const h = document.documentElement;
    h.classList.toggle("calm", d.calm);
    h.classList.toggle("simple", d.simple);
  }, [d.calm, d.simple]);
  useEffect(() => {
    const on = () => document.documentElement.classList.toggle("paused", document.hidden);
    on(); document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
}

/** True when things shouldn't move: calm mode, or the system's reduced-motion setting. */
export const isStill = () =>
  typeof document !== "undefined" && (document.documentElement.classList.contains("calm") || matchMedia("(prefers-reduced-motion: reduce)").matches);
