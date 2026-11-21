"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { todayStr } from "./dates";
import { topicFor, type LibraryTopic } from "@/data/library";

/**
 * Today's research topic for the Deen library. The app picks one each day on its own; if you ask for another,
 * that one becomes today's topic everywhere (Library page, home pill, the room label), and syncs.
 */
const KEY = "deen:topic";
type Saved = LibraryTopic & { date: string };

export function useTopicOfDay(): [LibraryTopic, (t: LibraryTopic) => Promise<unknown>] {
  const today = todayStr();
  const saved = useLiveQuery(async () => (await db.settings.get(KEY))?.value as Saved | undefined, []);
  const topic = saved?.date === today ? { cat: saved.cat, title: saved.title } : topicFor(today);
  return [topic, (t: LibraryTopic) => db.settings.put({ key: KEY, value: { ...t, date: today } })];
}
