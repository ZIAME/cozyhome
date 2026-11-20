import { describe, expect, it } from "vitest";
import { CABIN } from "./themes/cabin";
import { TRACKER, TRACKERS } from "./catalogue";
import { ROOM_CAP, canPlace, clearSpot, defaultLayout, inDrawer, inRoom, nativeLayout, normalize, pick, place, spotOf, unpick, type Layout } from "./layout";

const T = CABIN;
const ok = (r: ReturnType<typeof place>) => { if (!r.ok) throw new Error(r.error); return r.layout; };

describe("the default room", () => {
  const l = defaultLayout(T);
  it("is the prototype's room", () => {
    expect(l.spots["rug"]).toEqual({ tracker: "deen", tab: "salah" });
    expect(l.spots["screen-mid"]).toEqual({ tracker: "content" });
    expect(l.spots["frame-a"]).toBeUndefined();
    expect(inRoom(l).sort()).toEqual(["content", "deen", "design", "hobbies", "journal", "planner", "today"]);
    expect(inDrawer(l)).toEqual([]);
  });
  it("counts Deen once though it sits on three spots", () => expect(inRoom(l).filter(t => t === "deen")).toHaveLength(1));
});

describe("placing trackers", () => {
  it("puts a new tracker on an empty spot and picks it", () => {
    const l = ok(place(defaultLayout(T), T, "frame-a", { tracker: "mood" }));
    expect(l.spots["frame-a"]).toEqual({ tracker: "mood" });
    expect(l.picked).toContain("mood");
  });
  it("sends the replaced tracker to the drawer", () => {
    const l = ok(place(defaultLayout(T), T, "table", { tracker: "gratitude" }));
    expect(inDrawer(l)).toEqual(["journal"]);
  });
  it("keeps a tracker in the room while it has another spot", () => {
    const l = ok(place(defaultLayout(T), T, "rug", { tracker: "fitness" }));
    expect(inRoom(l)).toContain("deen");
    expect(inDrawer(l)).toEqual([]);
  });
  it("stops at the cap", () => {
    let l = ok(place(defaultLayout(T), T, "frame-a", { tracker: "mood" })); // 8 trackers
    expect(inRoom(l)).toHaveLength(ROOM_CAP);
    expect(place(l, T, "frame-b", { tracker: "habits" })).toEqual({ ok: false, error: "room-full" });
    expect(canPlace(l, "frame-b", "deen")).toBe(true);           // already in the room
    l = ok(place(l, T, "table", { tracker: "habits" }));            // swapping journal out frees a place
    expect(inRoom(l)).toHaveLength(ROOM_CAP);
    expect(inDrawer(l)).toEqual(["journal"]);
  });
  it("refuses unknown spots, unknown trackers, always-on trackers and bad tabs", () => {
    const l = defaultLayout(T);
    expect(place(l, T, "ceiling", { tracker: "mood" })).toEqual({ ok: false, error: "unknown-spot" });
    expect(place(l, T, "table", { tracker: "nope" })).toEqual({ ok: false, error: "unknown-tracker" });
    expect(place(l, T, "table", { tracker: "focus" })).toEqual({ ok: false, error: "always-on" });
    expect(place(l, T, "table", { tracker: "deen", tab: "fiqh" })).toEqual({ ok: false, error: "bad-tab" });
  });
});

describe("drawer", () => {
  it("clearing a spot moves its tracker to the drawer", () => {
    const l = clearSpot(defaultLayout(T), "table");
    expect(inDrawer(l)).toEqual(["journal"]);
  });
  it("pick adds to the drawer, unpick removes everywhere", () => {
    let l = pick(defaultLayout(T), "reading");
    expect(inDrawer(l)).toEqual(["reading"]);
    l = unpick(l, "deen");
    expect(Object.values(l.spots).some(p => p.tracker === "deen")).toBe(false);
    expect(l.picked).not.toContain("deen");
  });
  it("finds the spot for a tab", () => {
    expect(spotOf(defaultLayout(T), "deen", "quran")).toBe("rug-book");
    expect(spotOf(defaultLayout(T), "deen")).toBe("wall-shelf");
    expect(spotOf(defaultLayout(T), "mood")).toBeNull();
  });
});

describe("normalize", () => {
  it("falls back to the default room for missing or broken data", () => {
    expect(normalize(undefined, T)).toEqual(defaultLayout(T));
    expect(normalize({ v: 9 }, T)).toEqual(defaultLayout(T));
  });
  it("drops unknown spots, trackers and tabs, and keeps the cap", () => {
    const raw = {
      v: 1, theme: "cabin", picked: ["journal", "ghost", "focus"],
      spots: {
        attic: { tracker: "journal" }, table: { tracker: "journal", tab: "fiqh" }, rug: { tracker: "ghost" },
        "screen-left": { tracker: "mood" }, "screen-mid": { tracker: "habits" }, "screen-right": { tracker: "work" },
        "frame-a": { tracker: "code" }, "frame-b": { tracker: "writer" }, "wall-left": { tracker: "study" },
        "wall-shelf": { tracker: "reading" }, "cube-shelf": { tracker: "fitness" }, "rug-book": { tracker: "gratitude" },
      },
    };
    const l = normalize(raw, T);
    expect(l.spots["table"]).toEqual({ tracker: "journal" });
    expect(l.spots["rug"]).toBeUndefined();
    expect("attic" in l.spots).toBe(false);
    expect(inRoom(l)).toHaveLength(ROOM_CAP);
    expect(l.picked).not.toContain("ghost");
    expect(l.picked).not.toContain("focus");
    expect(inDrawer(l).length).toBe(2); // the two that didn't fit
  });
  it("keeps a valid layout as it is", () => {
    const l: Layout = ok(place(pick(defaultLayout(T), "reading"), T, "frame-b", { tracker: "mood" }));
    expect(normalize(JSON.parse(JSON.stringify(l)), T)).toEqual(l);
  });
});

describe("the cabin theme", () => {
  it("has a group in the art for every spot, with a place for other trackers' objects", () => {
    for (const s of T.spots) {
      expect(T.art, s.id).toContain(`class="spot${s.kind === "screen" ? " screen" : ""}" data-spot="${s.id}"`);
      expect(T.art, s.id).toMatch(new RegExp(`class="(scr-ui )?alt" data-spot="${s.id}"`));
      if (s.native || s.decor) expect(T.art, s.id).toContain(`class="native" data-spot="${s.id}"`);
    }
    for (const f of T.fixed) expect(T.art).toContain(`data-spot="${f.id}"`);
  });
  it("only names real trackers and tabs", () => {
    for (const s of T.spots) if (s.native) {
      const t = TRACKER[s.native.tracker];
      expect(t, s.id).toBeDefined();
      if (s.native.tab) expect(t.tabs.map(x => x.id)).toContain(s.native.tab);
    }
    expect(nativeLayout(T).picked.length).toBeLessThanOrEqual(ROOM_CAP);
  });
  it("has no Fiqh section anywhere", () => {
    expect(TRACKERS.flatMap(t => t.tabs.map(x => x.id + x.label)).join(" ").toLowerCase()).not.toContain("fiqh");
  });
});
