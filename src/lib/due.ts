"use client";
import { useMemo } from "react";
import { str, updateItem, useItems, useItemsOf } from "./items";
import { todayStr } from "./dates";
import { TRACKER } from "@/room/catalogue";

/** Where each kind of record opens in the diary. */
const OPENS: Record<string, [string, string]> = {
  "work/task": ["work", "board"], "design/task": ["design", "board"], "study/assignment": ["study", "assignments"],
  "content/post": ["content", "pipeline"], "planner/task": ["planner", "today"], "study/topic": ["study", "revision"],
};

export type Due = { id: string; title: string; from: string; when: string; done: boolean; toggle: () => void; open: [string, string] };
/** Things due today or late from every room (work boards, assignments, content planned for today). */
export function useDueToday(day: string): Due[] {
  const items = useItemsOf([["work", "task"], ["design", "task"], ["study", "assignment"], ["content", "post"]]);
  return useMemo(() => (items ?? []).flatMap(it => {
    const done = { work: "Done", design: "Done", study: "Done", content: "Posted" }[it.tracker] ?? "Done";
    const when = str(it.tracker === "content" ? it.f.date : it.f.deadline);
    if (!when || when > day || (it.f.status === done && when < day)) return [];
    const isDone = it.f.status === done;
    return [{ id: it.id, title: str(it.f.title) || "Untitled", from: TRACKER[it.tracker]?.title ?? it.tracker, when, done: isDone, toggle: () => updateItem(it.id, { status: isDone ? (it.tracker === "content" ? "Ready" : "To do") : done }), open: OPENS[`${it.tracker}/${it.kind}`] }];
  }).sort((a, b) => a.when.localeCompare(b.when)), [items, day]);
}

export type NextTask = { title: string; from: string; note: string; open: [string, string] } | null;

/**
 * The one thing the cat suggests: the earliest item due (or late) from a board, else an open task for today,
 * else a revision topic due today. Null when the day is clear.
 */
export function useNextTask(): NextTask {
  const t = todayStr();
  const due = useDueToday(t);
  const tasks = useItems("planner", "task"), topics = useItems("study", "topic");
  return useMemo(() => {
    const d = due.find(x => !x.done);
    if (d) return { title: d.title, from: d.from, note: d.when < t ? "running late" : "due today", open: d.open };
    const k = (tasks ?? []).find(x => !x.f.done && (x.date ?? t) <= t);
    if (k) return { title: str(k.f.title), from: "Planner", note: "on today’s list", open: OPENS["planner/task"] };
    const r = (topics ?? []).find(x => str(x.f.next || t) <= t);
    if (r) return { title: `Revise ${str(r.f.topic)}`, from: "Study desk", note: "review due", open: OPENS["study/topic"] };
    return null;
  }, [due, tasks, topics, t]);
}
