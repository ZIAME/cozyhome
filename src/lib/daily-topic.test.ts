import { describe, expect, it } from "vitest";
import { flatten, isDue, localNow, pickTopic, type Sub } from "./daily-topic";
import groups from "@/data/library-topics.json";
import { topicFor } from "@/data/library";
import { readFileSync } from "node:fs";

const sub = (p: Partial<Sub>): Sub => ({ endpoint: "e", user_id: "u", minute_of_day: 8 * 60, tz: "Asia/Kolkata", last_sent: null, enabled: true, ...p });

describe("daily topic", () => {
  it("is the same in the app and on the server, and changes by day", () => {
    const all = flatten(groups);
    expect(pickTopic(all, "2026-11-21")).toEqual(topicFor("2026-11-21"));
    const week = new Set(["2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"].map(d => pickTopic(all, d).title));
    expect(week.size).toBeGreaterThan(1);
  });
  it("reads the local date and time in a time zone", () => {
    const t = new Date("2026-11-21T02:45:00Z");
    expect(localNow(t, "Asia/Kolkata")).toEqual({ date: "2026-11-21", minute: 8 * 60 + 15 });
    expect(localNow(t, "America/New_York")).toEqual({ date: "2026-11-20", minute: 21 * 60 + 45 });
    expect(localNow(t, "Not/AZone").date).toBe("2026-11-21"); // falls back to UTC
  });
  it("sends once a day, after the chosen time, in the device's own time zone", () => {
    const before = new Date("2026-11-21T02:15:00Z"); // 7:45 in India
    const after = new Date("2026-11-21T02:45:00Z"); // 8:15 in India
    expect(isDue(sub({}), before).due).toBe(false);
    expect(isDue(sub({}), after)).toEqual({ due: true, date: "2026-11-21" });
    expect(isDue(sub({ last_sent: "2026-11-21" }), after).due).toBe(false);
    expect(isDue(sub({ enabled: false }), after).due).toBe(false);
    expect(isDue(sub({ tz: "America/New_York" }), after)).toEqual({ due: true, date: "2026-11-20" }); // 21:45 there, past 8:00
  });
  it("is embedded unchanged in the Supabase function", () => {
    const fn = readFileSync("supabase/functions/daily-topic/index.ts", "utf8");
    const shared = readFileSync("src/lib/daily-topic.ts", "utf8").replace(/^export /gm, "").trim();
    expect(fn).toContain(shared);
    expect(fn).toContain(JSON.stringify(groups, null, 1).trim());
  });
});
