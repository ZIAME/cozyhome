import type { Theme } from "./theme";
import { TRACKER, isTracker } from "./catalogue";

/**
 * What's in the room. Pure functions, no storage: useLayout saves the result.
 *
 * - `picked` is every tracker the person uses. Each one is in the room (on one or more spots) or in the drawer.
 * - `spots` says which tracker sits on which spot, and which diary page that object opens.
 * - At most ROOM_CAP different trackers are in the room. One tracker can sit on several spots (Deen: mat, Quran, shelf);
 *   it still counts once.
 * - Always-on trackers (focus, surprise) sit on fixed objects and are never in `picked` or `spots`.
 */
export const ROOM_CAP = 8;

export type Placement = { tracker: string; tab?: string };
export type Layout = { v: 1; theme: string; picked: string[]; spots: Record<string, Placement> };

export type PlaceError = "unknown-spot" | "unknown-tracker" | "always-on" | "bad-tab" | "room-full";
export type PlaceResult = { ok: true; layout: Layout } | { ok: false; error: PlaceError };

const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Trackers in the room, in spot order, each once. */
export function inRoom(l: Layout): string[] {
  return uniq(Object.values(l.spots).map(p => p.tracker));
}
/** Picked trackers that aren't in the room. */
export function inDrawer(l: Layout): string[] {
  const room = new Set(inRoom(l));
  return l.picked.filter(id => !room.has(id));
}
export const isFull = (l: Layout) => inRoom(l).length >= ROOM_CAP;

/** Can this tracker go on this spot without going over the cap? */
export function canPlace(l: Layout, spot: string, tracker: string): boolean {
  if (inRoom(l).includes(tracker)) return true;
  const leaving = l.spots[spot]?.tracker;
  const othersKeepIt = leaving && Object.entries(l.spots).some(([s, p]) => s !== spot && p.tracker === leaving);
  const freed = leaving && !othersKeepIt ? 1 : 0;
  return inRoom(l).length - freed < ROOM_CAP;
}

/** Put a tracker on a spot (replacing what was there, which goes to the drawer if it isn't on another spot). */
export function place(l: Layout, theme: Theme, spot: string, p: Placement): PlaceResult {
  if (!theme.spots.some(s => s.id === spot)) return { ok: false, error: "unknown-spot" };
  const t = TRACKER[p.tracker];
  if (!t) return { ok: false, error: "unknown-tracker" };
  if (t.always) return { ok: false, error: "always-on" };
  if (p.tab !== undefined && !t.tabs.some(x => x.id === p.tab)) return { ok: false, error: "bad-tab" };
  if (!canPlace(l, spot, p.tracker)) return { ok: false, error: "room-full" };
  const placement: Placement = p.tab ? { tracker: p.tracker, tab: p.tab } : { tracker: p.tracker };
  return { ok: true, layout: { ...l, picked: uniq([...l.picked, p.tracker]), spots: { ...l.spots, [spot]: placement } } };
}

/** Empty a spot. Its tracker stays picked, so it lands in the drawer unless it's on another spot. */
export function clearSpot(l: Layout, spot: string): Layout {
  if (!(spot in l.spots)) return l;
  const spots = { ...l.spots }; delete spots[spot];
  return { ...l, spots };
}

/** Add a tracker to the drawer. */
export function pick(l: Layout, tracker: string): Layout {
  const t = TRACKER[tracker];
  if (!t || t.always || l.picked.includes(tracker)) return l;
  return { ...l, picked: [...l.picked, tracker] };
}

/** Stop using a tracker: off every spot and out of the drawer. Its saved data is kept. */
export function unpick(l: Layout, tracker: string): Layout {
  const spots = Object.fromEntries(Object.entries(l.spots).filter(([, p]) => p.tracker !== tracker));
  return { ...l, picked: l.picked.filter(id => id !== tracker), spots };
}

/** The spot a tracker sits on, preferring one that opens the given tab. */
export function spotOf(l: Layout, tracker: string, tab?: string): string | null {
  const all = Object.entries(l.spots).filter(([, p]) => p.tracker === tracker);
  return (all.find(([, p]) => p.tab === tab) ?? all[0])?.[0] ?? null;
}

/** The layout the art was drawn for: every spot holds its native tracker; frames stay empty. */
export function nativeLayout(theme: Theme): Layout {
  const spots: Record<string, Placement> = {};
  for (const s of theme.spots) if (s.native) spots[s.id] = { ...s.native };
  return { v: 1, theme: theme.id, picked: uniq(Object.values(spots).map(p => p.tracker)), spots };
}

/** The room before onboarding: the prototype's room. */
export function defaultLayout(theme: Theme): Layout {
  const l = nativeLayout(theme);
  const screens: [string, string][] = [["screen-left", "design"], ["screen-mid", "content"], ["screen-right", "today"]];
  for (const [spot, tracker] of screens) if (theme.spots.some(s => s.id === spot)) l.spots[spot] = { tracker };
  l.picked = uniq([...l.picked, ...screens.map(([, t]) => t)]);
  return l;
}

/**
 * Make saved data safe to use: drop unknown spots, trackers and tabs, keep within the cap
 * (extra trackers go to the drawer), and make sure every placed tracker is picked.
 */
export function normalize(raw: unknown, theme: Theme): Layout {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Layout>;
  if (r.v !== 1 || !Array.isArray(r.picked) || !r.spots || typeof r.spots !== "object") return defaultLayout(theme);
  const ok = (id: unknown): id is string => isTracker(id) && !TRACKER[id].always;
  let l: Layout = { v: 1, theme: theme.id, picked: uniq(r.picked.filter(ok)), spots: {} };
  for (const s of theme.spots) {
    const p = (r.spots as Record<string, Placement | undefined>)[s.id];
    if (!p || !ok(p.tracker)) continue;
    const tab = typeof p.tab === "string" && TRACKER[p.tracker].tabs.some(x => x.id === p.tab) ? p.tab : undefined;
    const res = place(l, theme, s.id, { tracker: p.tracker, tab });
    if (res.ok) l = res.layout; else l = pick(l, p.tracker);
  }
  return l;
}

/**
 * Set the room up for a list of picked trackers (onboarding, or changing your picks later).
 * Trackers already in the room stay where they are; dropped ones leave. New ones fill free spots, in pick order,
 * until the room holds ROOM_CAP trackers: first the spots the art drew for them, then spots of the kind that suits
 * them (tracker.home), then any free spot. Whatever doesn't fit waits in the drawer.
 */
export function applyPicks(l: Layout, theme: Theme, picked: string[]): Layout {
  const want = uniq(picked.filter(id => TRACKER[id] && !TRACKER[id].always));
  const keep = new Set(want);
  let out: Layout = { ...l, theme: theme.id, picked: want, spots: Object.fromEntries(Object.entries(l.spots).filter(([, p]) => keep.has(p.tracker))) };
  const room = new Set(inRoom(out));
  const incoming = want.filter(id => !room.has(id)).slice(0, Math.max(0, ROOM_CAP - room.size));
  const free = () => theme.spots.filter(s => !out.spots[s.id]);
  const put = (spot: string, p: Placement) => { const r = place(out, theme, spot, p); if (r.ok) out = r.layout; return r.ok; };
  // 1. the art's own spots
  const placed = new Set<string>();
  for (const id of incoming) for (const s of free()) if (s.native?.tracker === id && put(s.id, { ...s.native })) placed.add(id);
  // 2. a spot of a suitable kind, else 3. any free spot (frames last, so walls keep some decoration)
  for (const id of incoming) {
    if (placed.has(id)) continue;
    const kinds = TRACKER[id].home;
    const options = free().sort((a, b) => {
      const ka = kinds.indexOf(a.kind), kb = kinds.indexOf(b.kind);
      return (ka < 0 ? 99 : ka) - (kb < 0 ? 99 : kb) || Number(!!a.decor) - Number(!!b.decor);
    });
    if (options[0]) put(options[0].id, { tracker: id });
  }
  return out;
}

export const emptyLayout = (theme: Theme): Layout => ({ v: 1, theme: theme.id, picked: [], spots: {} });
