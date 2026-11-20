/**
 * Prayer times, calculated on the device (PrayTimes-style astronomy).
 * Times come out in minutes after local midnight on this device's clock.
 */

export const FIVE = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerName = (typeof FIVE)[number];
export type DayTimes = Record<PrayerName | "Sunrise", number> & { FajrTomorrow: number };

export type Place = { name: string; country?: string; lat: number; lng: number };
export type MethodId = "karachi" | "mwl" | "isna" | "ummalqura" | "egypt";
/** Fajr and Isha angles below the horizon, or Isha as minutes after Maghrib. */
export const METHODS: Record<MethodId, { name: string; fajr: number; isha: number | { minutes: number } }> = {
  karachi: { name: "University of Islamic Sciences, Karachi", fajr: 18, isha: 18 },
  mwl: { name: "Muslim World League", fajr: 18, isha: 17 },
  isna: { name: "ISNA (North America)", fajr: 15, isha: 15 },
  ummalqura: { name: "Umm al-Qura, Makkah", fajr: 18.5, isha: { minutes: 90 } },
  egypt: { name: "Egyptian General Authority", fajr: 19.5, isha: 17.5 },
};
/**
 * Where the sun never gets low enough for Fajr or Isha (summer, far north or south), the night is split instead:
 * middle = half the night, seventh = a seventh of it, angle = angle/60 of it.
 */
export type HighLatRule = "middle" | "seventh" | "angle";
export type PrayerSettings = {
  method: MethodId;
  asr: "hanafi" | "shafii";
  highLat: HighLatRule;
  /** Minutes added to each calculated time, to match a local mosque. */
  adjust: Partial<Record<PrayerName, number>>;
};

/** Lucknow with Karachi + Hanafi: the place the engine was checked against. */
export const LUCKNOW: Place = { name: "Lucknow", country: "IN", lat: 26.8467, lng: 80.9462 };
export const DEFAULT_SETTINGS: PrayerSettings = { method: "karachi", asr: "hanafi", highLat: "middle", adjust: {} };

/** Calculation defaults by country (ISO code). Anything else: Muslim World League with Shafi'i Asr. */
export function defaultsFor(country?: string): Pick<PrayerSettings, "method" | "asr"> {
  const c = (country ?? "").toUpperCase();
  if (["IN", "PK", "BD", "AF"].includes(c)) return { method: "karachi", asr: "hanafi" };
  if (["SA", "AE", "KW", "QA", "BH", "OM", "YE"].includes(c)) return { method: "ummalqura", asr: "shafii" };
  if (["US", "CA"].includes(c)) return { method: "isna", asr: "shafii" };
  if (["EG", "SD", "LY", "SY", "LB", "IQ", "JO", "PS", "MY", "SG", "ID", "BN"].includes(c)) return { method: "egypt", asr: "shafii" };
  if (["TR", "UZ", "KZ", "TJ", "KG", "TM", "AZ"].includes(c)) return { method: "mwl", asr: "hanafi" };
  return { method: "mwl", asr: "shafii" };
}

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
export function prayerTimes(date: Date, place: Place = LUCKNOW, settings: PrayerSettings = DEFAULT_SETTINGS): Omit<DayTimes, "FajrTomorrow"> {
  const { lat, lng } = place;
  const M = METHODS[settings.method] ?? METHODS.mwl;
  const asrFactor = settings.asr === "hanafi" ? 2 : 1;
  const tz = -date.getTimezoneOffset() / 60;
  const jd0 = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  const mid = (t: number) => 12 - sunPosition(jd0 + t / 24).eqt;
  // NaN when the sun never reaches that angle today (handled by the high-latitude rule below)
  const hourAngle = (angle: number, t: number, before: boolean) => {
    const { decl } = sunPosition(jd0 + t / 24);
    const v = (-Math.sin(angle * d2r) - Math.sin(decl * d2r) * Math.sin(lat * d2r)) / (Math.cos(decl * d2r) * Math.cos(lat * d2r));
    if (Math.abs(v) > 1 + 1e-9) return NaN;
    const h = Math.acos(Math.max(-1, Math.min(1, v))) / d2r / 15;
    return mid(t) + (before ? -h : h);
  };
  const or = (v: number, fallback: number) => (Number.isNaN(v) ? fallback : v);
  const asr = (t: number) => {
    const { decl } = sunPosition(jd0 + t / 24);
    return hourAngle(-Math.atan(1 / (asrFactor + Math.tan(Math.abs(lat - decl) * d2r))) / d2r, t, false);
  };
  const ishaAngle = typeof M.isha === "number" ? M.isha : null;
  let T = { Fajr: 5, Sunrise: 6, Dhuhr: 12, Asr: 13, Maghrib: 18, Isha: 18 };
  for (let i = 0; i < 2; i++) {
    const Sunrise = or(hourAngle(0.833, T.Sunrise, true), 6), Maghrib = or(hourAngle(0.833, T.Maghrib, false), 18);
    T = {
      Fajr: hourAngle(M.fajr, or(T.Fajr, 5), true), Sunrise, Dhuhr: mid(T.Dhuhr),
      Asr: or(asr(T.Asr), 15), Maghrib,
      Isha: ishaAngle === null ? Maghrib + (M.isha as { minutes: number }).minutes / 60 : hourAngle(ishaAngle, or(T.Isha, 20), false),
    };
  }
  // high latitudes: keep Fajr and Isha within a portion of the night
  const night = 24 - (T.Maghrib - T.Sunrise);
  const portion = (angle: number) => night * (settings.highLat === "seventh" ? 1 / 7 : settings.highLat === "angle" ? angle / 60 : 1 / 2);
  const fajrMax = portion(M.fajr);
  if (Number.isNaN(T.Fajr) || T.Sunrise - T.Fajr > fajrMax) T.Fajr = T.Sunrise - fajrMax;
  if (ishaAngle !== null) {
    const ishaMax = portion(ishaAngle);
    if (Number.isNaN(T.Isha) || T.Isha - T.Maghrib > ishaMax) T.Isha = T.Maghrib + ishaMax;
  }
  const adj = tz - lng / 15;
  const out = {} as Omit<DayTimes, "FajrTomorrow">;
  for (const k of Object.keys(T) as (keyof typeof T)[]) {
    const extra = k === "Sunrise" ? 0 : settings.adjust[k] ?? 0;
    out[k] = Math.round((T[k] + adj + (k === "Dhuhr" ? 1 / 60 : 0)) * 60) + extra;
  }
  return out;
}

export function dayTimes(date = new Date(), place: Place = LUCKNOW, settings: PrayerSettings = DEFAULT_SETTINGS): DayTimes {
  const t = prayerTimes(date, place, settings);
  const tm = new Date(date); tm.setDate(date.getDate() + 1);
  return { ...t, FajrTomorrow: prayerTimes(tm, place, settings).Fajr };
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
