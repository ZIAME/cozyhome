import { LOCATION, METHOD } from "./config";

export const FIVE = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerName = (typeof FIVE)[number];
export type DayTimes = Record<PrayerName | "Sunrise", number> & { FajrTomorrow: number };

const d2r = Math.PI / 180;

function sunPosition(jd: number) {
  const D = jd - 2451545;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * d2r) + 0.02 * Math.sin(2 * g * d2r)) % 360;
  const e = 23.439 - 0.00000036 * D;
  let RA = Math.atan2(Math.cos(e * d2r) * Math.sin(L * d2r), Math.cos(L * d2r)) / d2r / 15;
  RA = ((RA % 24) + 24) % 24;
  const decl = Math.asin(Math.sin(e * d2r) * Math.sin(L * d2r)) / d2r;
  let eqt = q / 15 - RA;
  eqt = (((eqt + 12) % 24) + 24) % 24 - 12;
  return { decl, eqt };
}

function julian(y: number, m: number, d: number) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/** Prayer times for a local date, in minutes after local midnight. */
export function prayerTimes(date: Date, loc = LOCATION, method = METHOD): Omit<DayTimes, "FajrTomorrow"> {
  const { lat, lng } = loc;
  const tz = -date.getTimezoneOffset() / 60;
  const jd0 = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  const mid = (t: number) => 12 - sunPosition(jd0 + t / 24).eqt;
  const hourAngle = (angle: number, t: number, before: boolean) => {
    const { decl } = sunPosition(jd0 + t / 24);
    const v = (-Math.sin(angle * d2r) - Math.sin(decl * d2r) * Math.sin(lat * d2r)) / (Math.cos(decl * d2r) * Math.cos(lat * d2r));
    const h = Math.acos(Math.max(-1, Math.min(1, v))) / d2r / 15;
    return mid(t) + (before ? -h : h);
  };
  const asr = (t: number) => {
    const { decl } = sunPosition(jd0 + t / 24);
    return hourAngle(-Math.atan(1 / (method.asr + Math.tan(Math.abs(lat - decl) * d2r))) / d2r, t, false);
  };
  let T = { Fajr: 5, Sunrise: 6, Dhuhr: 12, Asr: 13, Maghrib: 18, Isha: 18 };
  for (let i = 0; i < 2; i++) {
    T = {
      Fajr: hourAngle(method.fajr, T.Fajr, true), Sunrise: hourAngle(0.833, T.Sunrise, true), Dhuhr: mid(T.Dhuhr),
      Asr: asr(T.Asr), Maghrib: hourAngle(0.833, T.Maghrib, false), Isha: hourAngle(method.isha, T.Isha, false),
    };
  }
  const adj = tz - lng / 15;
  const out = {} as Omit<DayTimes, "FajrTomorrow">;
  for (const k of Object.keys(T) as (keyof typeof T)[]) out[k] = Math.round((T[k] + adj + (k === "Dhuhr" ? 1 / 60 : 0)) * 60);
  return out;
}

export function dayTimes(date = new Date()): DayTimes {
  const t = prayerTimes(date);
  const tm = new Date(date); tm.setDate(date.getDate() + 1);
  return { ...t, FajrTomorrow: prayerTimes(tm).Fajr };
}

export type Current = { name: PrayerName; end: number; dayOffset: 0 | -1 } | null;

/** The prayer whose time it is right now (null between sunrise and Dhuhr). */
export function currentPrayer(P: DayTimes, m: number): Current {
  if (m >= P.Fajr && m < P.Sunrise) return { name: "Fajr", end: P.Sunrise, dayOffset: 0 };
  if (m >= P.Dhuhr && m < P.Asr) return { name: "Dhuhr", end: P.Asr, dayOffset: 0 };
  if (m >= P.Asr && m < P.Maghrib) return { name: "Asr", end: P.Maghrib, dayOffset: 0 };
  if (m >= P.Maghrib && m < P.Isha) return { name: "Maghrib", end: P.Isha, dayOffset: 0 };
  if (m >= P.Isha) return { name: "Isha", end: P.FajrTomorrow + 1440, dayOffset: 0 };
  if (m < P.Fajr) return { name: "Isha", end: P.Fajr, dayOffset: -1 }; // after midnight: last night's Isha
  return null;
}

export function nextPrayer(P: DayTimes, m: number): { name: PrayerName; at: number } {
  for (const k of FIVE) if (P[k] > m) return { name: k, at: P[k] };
  return { name: "Fajr", at: P.FajrTomorrow + 1440 };
}
