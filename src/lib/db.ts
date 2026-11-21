"use client";
import Dexie, { type Table } from "dexie";

/**
 * Everything is saved on this device (IndexedDB). Each table maps 1:1 to a Supabase table (supabase/schema.sql).
 * Every row carries `updated` (ms, stamped automatically on each local write) so sync can tell what changed
 * and which copy is newer.
 */
export type PrayerStatus = "ontime" | "late" | "qada" | "missed";
export interface SalahDay {
  date: string; p: Partial<Record<string, PrayerStatus>>; x: Partial<Record<"witr" | "tahajjud" | "sunnah", boolean>>;
  /** On her period that day: prayers are excused, and the day neither counts toward nor breaks a streak. */
  period?: boolean;
  updated?: number;
}
export interface Setting { key: string; value: unknown; updated?: number }
/** A deleted item, remembered so the deletion reaches the cloud and other devices. */
export interface Tombstone { id: string; at: number }
/**
 * One record in any tracker: a task card, a journal entry, a book, a habit tick…
 * `tracker` + `kind` say what it is (e.g. "design" + "task"); `f` holds its fields; `blob` an optional photo.
 * Maps to a future Supabase `items` table (jsonb fields, storage for blobs).
 */
export interface Item {
  id: string; tracker: string; kind: string;
  /** The day it belongs to (yyyy-mm-dd), when it has one. */
  date?: string;
  f: Record<string, unknown>;
  blob?: Blob;
  created: number; updated: number;
}

class AfraDB extends Dexie {
  salah!: Table<SalahDay, string>;
  settings!: Table<Setting, string>;
  items!: Table<Item, string>;
  tombstones!: Table<Tombstone, string>;
  constructor() {
    super("afras-home");
    this.version(1).stores({
      salah: "date",
      settings: "key",
    });
    this.version(2).stores({
      items: "id, [tracker+kind], [tracker+kind+date], date, updated",
    });
    this.version(3).stores({ tombstones: "id, at" });
    // Stamp `updated` on every local write. Rows written by sync carry `__r` and keep the cloud's stamp.
    for (const t of [this.salah, this.settings, this.items] as Table<{ updated?: number; __r?: boolean }, string>[]) {
      t.hook("creating", (_k, obj) => { if (obj.__r) delete obj.__r; else obj.updated = Date.now(); });
      t.hook("updating", mods => ((mods as { __r?: boolean }).__r ? { __r: undefined } : { updated: Date.now() }));
    }
  }
}
export const db = new AfraDB();
/** Mark a row as coming from the cloud, so the stamping hooks keep its `updated`. */
export const fromRemote = <T extends object>(row: T): T => ({ ...row, __r: true });

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await db.settings.get(key);
  return (r?.value as T) ?? fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });
