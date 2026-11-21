/**
 * Picking the day's research topic, and deciding who gets today's notification.
 * Shared, word for word, by the app and the Supabase function (scripts/build-push-function.mjs copies this file
 * into supabase/functions/daily-topic/index.ts), so both always agree on the day's topic. No imports on purpose.
 */
export type Topic = { cat: string; title: string };
export type TopicGroup = { id: string; topics: string[] };

export const flatten = (groups: TopicGroup[]): Topic[] => groups.flatMap(g => g.topics.map(title => ({ cat: g.id, title })));
const seed = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** The topic for a day (yyyy-mm-dd): random, but the same all day, on every device and on the server. */
export const pickTopic = (all: Topic[], day: string): Topic => all[seed("topic:" + day) % all.length];

/** The date and the minute of the day at this moment, in a time zone. */
export function localNow(now: Date, tz: string): { date: string; minute: number } {
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now); }
  catch { parts = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now); }
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minute: Number(g("hour")) * 60 + Number(g("minute")) };
}

export type Sub = { endpoint: string; user_id: string; minute_of_day: number; tz: string; last_sent: string | null; enabled: boolean };
/** A device is due once its chosen time has passed today (in its time zone) and it hasn't had today's topic yet. */
export function isDue(s: Sub, now: Date): { due: boolean; date: string } {
  const { date, minute } = localNow(now, s.tz);
  return { due: s.enabled && s.last_sent !== date && minute >= s.minute_of_day, date };
}
