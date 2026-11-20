"use client";
import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setSetting } from "@/lib/db";
import { THEMES, DEFAULT_THEME } from "./themes";
import { normalize, type Layout } from "./layout";

const KEY = "room";

/** The saved room layout (IndexedDB, settings table), cleaned against the current theme. */
export function useLayout() {
  const raw = useLiveQuery(async () => (await db.settings.get(KEY))?.value ?? null, []);
  const loaded = raw !== undefined;
  const themeId = raw && typeof raw === "object" && "theme" in raw ? String((raw as Layout).theme) : DEFAULT_THEME;
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME];
  const layout = useMemo(() => normalize(raw, theme), [raw, theme]);
  const save = useCallback((l: Layout) => setSetting(KEY, l), []);
  return { theme, layout, save, loaded };
}
