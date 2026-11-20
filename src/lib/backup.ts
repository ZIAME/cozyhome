"use client";
import { db, fromRemote, type Item, type SalahDay, type Setting } from "./db";

/**
 * Backup files: everything on this device in one JSON file (photos embedded as data URLs).
 * Restore either replaces what's here, or merges (for each record, the newer copy wins).
 */
export const BACKUP_APP = "cozy-home";
type BlobJson = { type: string; data: string };
type ItemJson = Omit<Item, "blob"> & { blob?: BlobJson };
export type Backup = { app: typeof BACKUP_APP; v: 1; exported: string; salah: SalahDay[]; settings: Setting[]; items: ItemJson[] };
export type BackupSummary = { exported: string; prayers: number; records: number; photos: number };

const LAST = "backup:last";

async function blobToJson(b: Blob): Promise<BlobJson> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { type: b.type || "application/octet-stream", data: btoa(bin) };
}
function jsonToBlob(j: BlobJson): Blob {
  const bin = atob(j.data), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: j.type });
}

/** Everything as a backup object. Settings that only describe this device (like the last backup date) are left out. */
export async function makeBackup(): Promise<Backup> {
  const [salah, settings, items] = await Promise.all([db.salah.toArray(), db.settings.toArray(), db.items.toArray()]);
  return {
    app: BACKUP_APP, v: 1, exported: new Date().toISOString(), salah,
    settings: settings.filter(s => !s.key.startsWith("backup:") && !s.key.startsWith("sync:")),
    items: await Promise.all(items.map(async ({ blob, ...it }) => (blob ? { ...it, blob: await blobToJson(blob) } : it))),
  };
}

/** The backup as a file, and the day it was made remembered. */
export async function backupFile(): Promise<{ blob: Blob; name: string }> {
  const b = await makeBackup();
  await db.settings.put({ key: LAST, value: b.exported });
  return { blob: new Blob([JSON.stringify(b)], { type: "application/json" }), name: `cozy-home-backup-${b.exported.slice(0, 10)}.json` };
}
export const lastBackup = async () => ((await db.settings.get(LAST))?.value as string | undefined) ?? null;

/** Check a file is one of our backups and say what's in it. Throws a readable message if not. */
export function parseBackup(text: string): { backup: Backup; summary: BackupSummary } {
  let b: Backup;
  try { b = JSON.parse(text); } catch { throw new Error("That file isn’t a backup (it isn’t valid JSON)."); }
  if (!b || b.app !== BACKUP_APP || !Array.isArray(b.items) || !Array.isArray(b.salah) || !Array.isArray(b.settings)) throw new Error("That file isn’t a Cozy Home backup.");
  if (b.v !== 1) throw new Error("This backup comes from a newer version of the app. Update the app, then try again.");
  const ok = b.items.every(i => i && typeof i.id === "string" && typeof i.tracker === "string" && typeof i.kind === "string" && i.f && typeof i.f === "object");
  if (!ok || !b.salah.every(d => d && typeof d.date === "string") || !b.settings.every(s => s && typeof s.key === "string")) throw new Error("This backup looks damaged, so nothing was restored.");
  return { backup: b, summary: { exported: b.exported, prayers: b.salah.length, records: b.items.length, photos: b.items.filter(i => i.blob).length } };
}

/**
 * Put a backup on this device.
 * replace: clear everything first. merge: keep what's here and take each backup record only if it's newer.
 */
export async function restoreBackup(b: Backup, mode: "replace" | "merge") {
  const items: Item[] = b.items.map(({ blob, ...it }) => ({ ...it, ...(blob ? { blob: jsonToBlob(blob) } : {}) }));
  await db.transaction("rw", [db.salah, db.settings, db.items, db.tombstones], async () => {
    if (mode === "replace") {
      // remember what disappears, so a sync later removes it from the cloud too
      const keep = new Set(items.map(i => i.id)), now = Date.now();
      await db.tombstones.bulkPut((await db.items.toCollection().primaryKeys()).filter(id => !keep.has(id)).map(id => ({ id, at: now })));
      await Promise.all([db.salah.clear(), db.items.clear(), db.settings.where("key").noneOf([LAST]).delete()]);
      await db.salah.bulkPut(b.salah.map(fromRemote));
      await db.settings.bulkPut(b.settings.map(fromRemote));
      await db.items.bulkPut(items.map(fromRemote));
      return;
    }
    const newer = <T extends { updated?: number }>(mine: T | undefined, theirs: T) => !mine || (theirs.updated ?? 0) > (mine.updated ?? 0);
    for (const d of b.salah) if (newer(await db.salah.get(d.date), d)) await db.salah.put(fromRemote(d));
    for (const s of b.settings) if (newer(await db.settings.get(s.key), s)) await db.settings.put(fromRemote(s));
    for (const it of items) if (newer(await db.items.get(it.id), it)) await db.items.put(fromRemote(it));
  });
}

/** Ask the browser not to clear this site's storage when space runs low (and Safari's 7-day rule). */
export async function askPersistence(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";
  if (await navigator.storage.persisted()) return "granted";
  return (await navigator.storage.persist()) ? "granted" : "denied";
}
export async function isPersisted() {
  try { return !!(await navigator.storage?.persisted?.()); } catch { return false; }
}
