import { describe, expect, it } from "vitest";
import { prayerTimes, currentPrayer, dayTimes } from "./prayer";
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
