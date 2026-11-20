"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setSetting } from "@/lib/db";

/** Streaks can be hidden (worship shouldn't feel like a game). One switch for every streak in the app. */
const KEY = "privacy:hideStreaks";
export const useHideStreaks = () => useLiveQuery(async () => (await db.settings.get(KEY))?.value === true, []) ?? false;
export function StreakToggle() {
  const hidden = useHideStreaks();
  return <button className="k-link" aria-pressed={hidden} onClick={() => setSetting(KEY, !hidden)}>{hidden ? "Show streaks" : "Hide streaks"}</button>;
}
