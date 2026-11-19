"use client";
import { db, type PrayerStatus, type SalahDay } from "./db";
import { SEED_DEMO } from "./config";
import { FIVE, type DayTimes } from "./prayer";
import { addDays, fromYmd, hash, todayStr, minutesNow } from "./dates";

export const isPrayed = (s?: PrayerStatus) => s === "ontime" || s === "late" || s === "qada";

/** What a day looks like before anything is saved (demo data only when SEED_DEMO is on). */
export function demoDay(ds: string, P: DayTimes): SalahDay {
  const empty: SalahDay = { date: ds, p: {}, x: {} };
  if (!SEED_DEMO) return empty;
  const t = todayStr();
  if (ds === t) {
    const m = minutesNow(), ends = { Fajr: P.Sunrise, Dhuhr: P.Asr, Asr: P.Maghrib } as const, p: SalahDay["p"] = {};
    for (const k of Object.keys(ends) as (keyof typeof ends)[]) if (m >= ends[k]) p[k] = "ontime";
    return { ...empty, p };
  }
  const age = (fromYmd(t).getTime() - fromYmd(ds).getTime()) / 864e5;
  if (age < 1 || age > 24) return empty;
  const h = hash(ds), p: SalahDay["p"] = {};
  FIVE.forEach((k, i) => { const r = (h >> (i * 5)) & 31; p[k] = r < 21 ? "ontime" : r < 26 ? "late" : r < 29 ? "qada" : "missed"; });
  if (age <= 9) FIVE.forEach(k => { if (p[k] === "missed") p[k] = "late"; });
  return { date: ds, p, x: { witr: (h & 3) !== 0, sunnah: (h & 4) !== 0, tahajjud: (h & 24) === 24 } };
}

export async function getDay(ds: string, P: DayTimes): Promise<SalahDay> {
  return (await db.salah.get(ds)) ?? demoDay(ds, P);
}

/** Tick a prayer as prayed on time, or untick it. */
export async function togglePrayed(ds: string, name: string, P: DayTimes) {
  const day = await getDay(ds, P);
  const p = { ...day.p };
  if (isPrayed(p[name])) delete p[name]; else p[name] = "ontime";
  await db.salah.put({ ...day, p });
}
export { addDays };
