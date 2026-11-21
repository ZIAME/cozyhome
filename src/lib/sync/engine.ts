import { db, fromRemote, type Item, type SalahDay, type Setting } from "../db";

/**
 * Two-way sync between this device and a cloud store, one table at a time.
 *
 * - Push: every row changed here since the last push (its `updated` stamp), plus deletions (tombstones).
 * - Pull: every row the cloud changed since our last pull (the cloud's own cursor).
 * - Conflicts: for each row, the copy with the newer `updated` wins. Deleted items travel as rows with
 *   `deleted: true` so other devices remove them too.
 * - Photos go to the cloud's file store under the item's id.
 *
 * The cloud is behind the `Remote` interface (Supabase in ./supabase.ts; an in-memory one in the tests).
 */
export type RItem = Omit<Item, "blob"> & { has_blob: boolean; deleted: boolean };
export type RSalah = SalahDay & { updated: number };
export type RSetting = Setting & { updated: number };
export type Changes = { items: RItem[]; salah: RSalah[]; settings: RSetting[] };

export interface Remote {
  /** Rows changed since `cursor` (null = everything), and the cursor to use next time. */
  pull(cursor: string | null): Promise<Changes & { cursor: string | null }>;
  push(c: Changes): Promise<void>;
  putBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  removeBlob(id: string): Promise<void>;
}

/** What this device remembers between syncs (kept per signed-in account). */
export type SyncState = { pushedAt: number; cursor: string | null };
export const FRESH: SyncState = { pushedAt: 0, cursor: null };
export type SyncResult = { state: SyncState; pushed: number; pulled: number };

/** Settings that describe this device only; they never sync. */
export const localOnly = (key: string) => key.startsWith("sync:") || key.startsWith("backup:");

/**
 * One round of sync. Normally: push our changes, then pull theirs.
 * On a device's first sync for an account, pull first and let the cloud's settings (name, place, room layout…)
 * win, so signing in on a new device brings your room over instead of replacing it with the new device's.
 */
export async function syncOnce(remote: Remote, state: SyncState): Promise<SyncResult> {
  const started = Date.now();
  const first = state.pushedAt === 0 && state.cursor === null;
  let pushed = 0, pulled = 0, cursor = state.cursor;
  const since = state.pushedAt;

  const push = async () => {
    const [items, tombs, salah, settings] = await Promise.all([
      db.items.where("updated").above(since).toArray(),
      db.tombstones.where("at").above(since).toArray(),
      db.salah.filter(d => (d.updated ?? 0) > since).toArray(),
      db.settings.filter(s => (s.updated ?? 0) > since && !localOnly(s.key)).toArray(),
    ]);
    for (const it of items) if (it.blob) await remote.putBlob(it.id, it.blob);
    const out: Changes = {
      items: [
        ...items.map(({ blob, ...it }) => ({ ...it, has_blob: !!blob, deleted: false })),
        ...tombs.filter(t => !items.some(i => i.id === t.id)).map(t => ({ id: t.id, tracker: "", kind: "", f: {}, created: 0, updated: t.at, has_blob: false, deleted: true })),
      ],
      salah: salah.map(d => ({ ...d, updated: d.updated ?? started })),
      settings: settings.map(s => ({ ...s, updated: s.updated ?? started })),
    };
    pushed = out.items.length + out.salah.length + out.settings.length;
    if (pushed) await remote.push(out);
    for (const t of tombs) await remote.removeBlob(t.id).catch(() => {});
  };

  const pull = async (adopt: boolean) => {
    const got = await remote.pull(cursor);
    for (const r of got.items) {
      const mine = await db.items.get(r.id);
      if (mine && mine.updated >= r.updated) continue;
      pulled++;
      if (r.deleted) { await db.items.delete(r.id); continue; }
      const { has_blob, deleted: _d, ...row } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
      const blob = has_blob ? (await remote.getBlob(r.id)) ?? mine?.blob : undefined;
      await db.items.put(fromRemote({ ...row, ...(blob ? { blob } : {}) }));
    }
    for (const r of got.salah) {
      const mine = await db.salah.get(r.date);
      if (mine && (mine.updated ?? 0) >= r.updated) continue;
      pulled++; await db.salah.put(fromRemote(r));
    }
    for (const r of got.settings) {
      if (localOnly(r.key)) continue;
      const mine = await db.settings.get(r.key);
      if (!adopt && mine && (mine.updated ?? 0) >= r.updated) continue;
      pulled++; await db.settings.put(fromRemote(r));
    }
    cursor = got.cursor ?? cursor;
  };

  if (first) { await pull(true); await push(); }
  else { await push(); await pull(false); }
  // tombstones older than what we've pushed are no longer needed
  await db.tombstones.where("at").belowOrEqual(since).delete();
  return { state: { pushedAt: started, cursor }, pushed, pulled };
}

/** An in-memory cloud, for tests and for trying sync without an account. */
export class MemoryRemote implements Remote {
  items = new Map<string, RItem & { at: number }>();
  salah = new Map<string, RSalah & { at: number }>();
  settings = new Map<string, RSetting & { at: number }>();
  blobs = new Map<string, Blob>();
  private clock = 0;
  async pull(cursor: string | null) {
    const c = cursor ? Number(cursor) : -1;
    const strip = <T extends { at: number }>(m: Map<string, T>) => [...m.values()].filter(r => r.at > c).map(({ at: _a, ...r }) => r); // eslint-disable-line @typescript-eslint/no-unused-vars
    return { items: strip(this.items), salah: strip(this.salah), settings: strip(this.settings), cursor: String(this.clock) };
  }
  async push(ch: Changes) {
    // the cloud keeps the newer copy too, so an old device can't overwrite newer work
    const put = <T extends { updated: number }>(m: Map<string, T & { at: number }>, k: string, r: T) => {
      const cur = m.get(k); if (cur && cur.updated > r.updated) return;
      m.set(k, { ...r, at: ++this.clock });
    };
    ch.items.forEach(r => put(this.items, r.id, r)); ch.salah.forEach(r => put(this.salah, r.date, r)); ch.settings.forEach(r => put(this.settings, r.key, r));
  }
  async putBlob(id: string, b: Blob) { this.blobs.set(id, b); }
  async getBlob(id: string) { return this.blobs.get(id) ?? null; }
  async removeBlob(id: string) { this.blobs.delete(id); }
}
