import { describe, expect, it } from "vitest";
import { prayerTimes, currentPrayer, dayTimes, defaultsFor, DEFAULT_SETTINGS, LUCKNOW } from "./prayer";
import { fmtMin } from "./dates";

// Published Lucknow timetables (Karachi method). Times are IST.
process.env.TZ = "Asia/Kolkata";
const t = (y: number, m: number, d: number) => {
  const r = prayerTimes(new Date(y, m - 1, d));
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, fmtMin(v)]));
};

describe("prayer times for Lucknow", () => {
  it("matches gtaf.org, 26 Aug 2026 (Hanafi Asr)", () => {
    expect(t(2026, 8, 26)).toMatchObject({ Fajr: "4:22 am", Dhuhr: "12:09 pm", Asr: "4:43 pm", Maghrib: "6:33 pm", Isha: "7:53 pm" });
  });
  it("is within a minute of ihadis.com, 29 Oct 2026", () => {
    expect(t(2026, 10, 29)).toMatchObject({ Fajr: "4:55 am", Dhuhr: "11:51 am", Maghrib: "5:26 pm", Isha: "6:44 pm" });
  });
});

describe("current prayer", () => {
  const P = dayTimes(new Date(2026, 10, 19));
  it("is Maghrib just after sunset", () => expect(currentPrayer(P, P.Maghrib + 5)?.name).toBe("Maghrib"));
  it("is nothing between sunrise and Dhuhr", () => expect(currentPrayer(P, P.Sunrise + 60)).toBeNull());
  it("is yesterday's Isha after midnight", () => expect(currentPrayer(P, 60)).toMatchObject({ name: "Isha", dayOffset: -1 }));
});

describe("settings", () => {
  const day = new Date(2026, 10, 19);
  it("adds per-prayer minute adjustments", () => {
    const a = prayerTimes(day), b = prayerTimes(day, LUCKNOW, { ...DEFAULT_SETTINGS, adjust: { Fajr: 2, Isha: -3 } });
    expect(b.Fajr - a.Fajr).toBe(2); expect(b.Isha - a.Isha).toBe(-3); expect(b.Dhuhr).toBe(a.Dhuhr); expect(b.Sunrise).toBe(a.Sunrise);
  });
  it("puts Umm al-Qura Isha 90 minutes after Maghrib", () => {
    const t = prayerTimes(day, LUCKNOW, { ...DEFAULT_SETTINGS, method: "ummalqura" });
    expect(t.Isha - t.Maghrib).toBe(90);
  });
  it("makes Shafi'i Asr earlier than Hanafi", () => {
    expect(prayerTimes(day, LUCKNOW, { ...DEFAULT_SETTINGS, asr: "shafii" }).Asr).toBeLessThan(prayerTimes(day).Asr);
  });
  it("gives sensible Fajr and Isha far north in summer", () => {
    const oslo = { name: "Oslo", country: "NO", lat: 59.91, lng: 10.75 };
    for (const highLat of ["middle", "seventh", "angle"] as const) {
      const t = prayerTimes(new Date(2026, 5, 21), oslo, { method: "mwl", asr: "shafii", highLat, adjust: {} });
      const order = [t.Fajr, t.Sunrise, t.Dhuhr, t.Asr, t.Maghrib, t.Isha];
      expect(order.every(Number.isFinite), highLat).toBe(true);
      expect([...order].sort((a, b) => a - b), highLat).toEqual(order);
    }
  });
  it("picks defaults from the country", () => {
    expect(defaultsFor("IN")).toEqual({ method: "karachi", asr: "hanafi" });
    expect(defaultsFor("SA")).toEqual({ method: "ummalqura", asr: "shafii" });
    expect(defaultsFor("US")).toEqual({ method: "isna", asr: "shafii" });
    expect(defaultsFor("FR")).toEqual({ method: "mwl", asr: "shafii" });
  });
});

describe("fmtMin", () => {
  it("wraps times from the day before or after", () => {
    expect(fmtMin(-79)).toBe("10:41 pm");
    expect(fmtMin(1440 + 65)).toBe("1:05 am");
  });
});
