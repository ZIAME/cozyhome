"use client";
import { useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, setSetting } from "./db";
import { DEFAULT_SETTINGS, LUCKNOW, METHODS, FIVE, type Place, type PrayerSettings } from "./prayer";

/** Who the room belongs to and where it is. Set during onboarding (settings table, key "profile"). */
export type Profile = { v: 1; name: string; place: Place; prayer: PrayerSettings; since: string };

const KEY = "profile";
const clampAdj = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(-30, Math.min(30, Math.round(n))) : 0);

/** Clean saved data; null means onboarding hasn't been done. */
export function readProfile(raw: unknown): Profile | null {
  const r = raw as Partial<Profile> | null;
  if (!r || r.v !== 1 || typeof r.name !== "string" || !r.place) return null;
  const p = r.place, s = (r.prayer ?? {}) as Partial<PrayerSettings>;
  if (typeof p.lat !== "number" || typeof p.lng !== "number" || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return null;
  const adjust: PrayerSettings["adjust"] = {};
  for (const k of FIVE) { const v = clampAdj(s.adjust?.[k]); if (v) adjust[k] = v; }
  return {
    v: 1, name: r.name.slice(0, 40), since: typeof r.since === "string" ? r.since : "",
    place: { name: String(p.name ?? "My place").slice(0, 60), country: typeof p.country === "string" ? p.country : undefined, lat: p.lat, lng: p.lng },
    prayer: {
      method: s.method && s.method in METHODS ? s.method : DEFAULT_SETTINGS.method,
      asr: s.asr === "shafii" ? "shafii" : "hanafi",
      highLat: s.highLat === "seventh" || s.highLat === "angle" ? s.highLat : "middle",
      adjust,
    },
  };
}

/** The saved profile. `loaded` is false until IndexedDB answers; `profile` is null before onboarding. */
export function useProfile() {
  const raw = useLiveQuery(async () => (await db.settings.get(KEY))?.value ?? null, []);
  const save = useCallback((p: Profile) => setSetting(KEY, p), []);
  return { loaded: raw !== undefined, profile: raw === undefined ? null : readProfile(raw), save };
}

/** Used for the sky before onboarding is done. */
export const FALLBACK = { place: LUCKNOW, prayer: DEFAULT_SETTINGS };
