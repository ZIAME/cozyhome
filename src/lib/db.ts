"use client";
import Dexie, { type Table } from "dexie";

/** Everything is saved on this device (IndexedDB). Each table maps 1:1 to a future Supabase table. */
export type PrayerStatus = "ontime" | "late" | "qada" | "missed";
export interface SalahDay { date: string; p: Partial<Record<string, PrayerStatus>>; x: Partial<Record<"witr" | "tahajjud" | "sunnah", boolean>> }
export interface Setting { key: string; value: unknown }
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
  constructor() {
    super("afras-home");
    this.version(1).stores({
      salah: "date",
      settings: "key",
    });
    this.version(2).stores({
      items: "id, [tracker+kind], [tracker+kind+date], date, updated",
    });
  }
}
export const db = new AfraDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await db.settings.get(key);
  return (r?.value as T) ?? fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });
