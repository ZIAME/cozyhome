"use client";
import Dexie, { type Table } from "dexie";

/** Everything is saved on this device (IndexedDB). Each table maps 1:1 to a future Supabase table. */
export type PrayerStatus = "ontime" | "late" | "qada" | "missed";
export interface SalahDay { date: string; p: Partial<Record<string, PrayerStatus>>; x: Partial<Record<"witr" | "tahajjud" | "sunnah", boolean>> }
export interface Setting { key: string; value: unknown }

class AfraDB extends Dexie {
  salah!: Table<SalahDay, string>;
  settings!: Table<Setting, string>;
  constructor() {
    super("afras-home");
    this.version(1).stores({
      salah: "date",
      settings: "key",
    });
  }
}
export const db = new AfraDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const r = await db.settings.get(key);
  return (r?.value as T) ?? fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });
