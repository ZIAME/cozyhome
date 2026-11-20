"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "./db";

/** Reading and writing tracker records (the `items` table). */
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export async function addItem(tracker: string, kind: string, f: Record<string, unknown>, extra: Partial<Pick<Item, "date" | "blob">> = {}) {
  const now = Date.now();
  const item: Item = { id: newId(), tracker, kind, f, created: now, updated: now, ...extra };
  await db.items.add(item);
  return item;
}
export async function updateItem(id: string, f: Record<string, unknown>, extra: Partial<Pick<Item, "date" | "blob">> = {}) {
  const cur = await db.items.get(id);
  if (!cur) return;
  await db.items.put({ ...cur, ...extra, f: { ...cur.f, ...f }, updated: Date.now() });
}
export const removeItem = (id: string) => db.items.delete(id);

/** Upsert the single record of a kind for a day (a mood check-in, a water count, a habit day…). */
export async function setDayItem(tracker: string, kind: string, date: string, f: Record<string, unknown>) {
  const cur = await db.items.where("[tracker+kind+date]").equals([tracker, kind, date]).first();
  if (cur) await updateItem(cur.id, f); else await addItem(tracker, kind, f, { date });
}

/** All records of a kind, newest first. Undefined while loading. */
export function useItems(tracker: string, kind: string) {
  return useLiveQuery(async () => {
    const a = await db.items.where("[tracker+kind]").equals([tracker, kind]).toArray();
    return a.sort((x, y) => (y.date ?? "").localeCompare(x.date ?? "") || y.created - x.created);
  }, [tracker, kind]);
}
/** Records of several trackers/kinds at once (Planner pulls tasks from every room). */
export function useItemsOf(pairs: [string, string][]) {
  const key = JSON.stringify(pairs);
  return useLiveQuery(async () => (await db.items.where("[tracker+kind]").anyOf(pairs).toArray()), [key]);
}
/** The record of a kind for one day. */
export function useDayItem(tracker: string, kind: string, date: string) {
  return useLiveQuery(async () => (await db.items.where("[tracker+kind+date]").equals([tracker, kind, date]).first()) ?? null, [tracker, kind, date]);
}
export const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
