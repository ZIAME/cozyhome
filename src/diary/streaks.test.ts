import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { streaks } from "./kit";
import { addDays, todayStr } from "@/lib/dates";

const t = todayStr(), ago = (n: number) => addDays(t, -n);
describe("streaks", () => {
  it("counts days in a row up to today or yesterday", () => {
    expect(streaks(new Set([t, ago(1), ago(2)])).cur).toBe(3);
    expect(streaks(new Set([ago(1), ago(2)])).cur).toBe(2);
    expect(streaks(new Set([ago(2)])).cur).toBe(0);
  });
  it("skips period days without counting them or breaking the run", () => {
    const prayed = new Set([ago(0), ago(1), ago(7), ago(8)]);
    const period = new Set([ago(2), ago(3), ago(4), ago(5), ago(6)]);
    expect(streaks(prayed, period)).toEqual({ cur: 4, best: 4 });
    expect(streaks(prayed).cur).toBe(2); // without skipping, the gap breaks it
  });
  it("keeps a run going while today is a period day", () => {
    expect(streaks(new Set([ago(1), ago(2)]), new Set([t])).cur).toBe(2);
  });
});
