"use client";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/lib/db";
import { addItem, num, removeItem, setDayItem, str, updateItem, useDayItem, useItems, useItemsOf } from "@/lib/items";
import { addDays, fmtMin, fromYmd, todayStr } from "@/lib/dates";
import { FIVE, dayTimes } from "@/lib/prayer";
import { isPrayed } from "@/lib/salah";
import { FALLBACK, useProfile } from "@/lib/profile";
import { useShared } from "@/lib/shared";
import { useLayout } from "@/room/useLayout";
import { useDueToday } from "@/lib/due";
import { TRACKER } from "@/room/catalogue";
import { Board, DeleteButton, Empty, Form, ItemList, Jar, PageHead, Section, Tag, daysUntil, dueText, prettyDay, streaks, type Field } from "./kit";
import { Photo } from "./mind";
import { StreakToggle, useHideStreaks } from "./privacy";
import { addElement } from "./scrapbook";

const names = (a: Item[] | undefined, key = "name") => [...new Set((a ?? []).map(i => str(i.f[key])).filter(Boolean))];

// ================= Study desk =================
export const StudySubjectsLeft = () => (
  <><PageHead eyebrow="Study desk · Subjects" title="Subjects" />
    <ItemList tracker="study" kind="subject" add="Add a subject" empty="Add the subjects you’re studying."
      fields={[{ key: "name", label: "Subject", required: true }, { key: "teacher", label: "Teacher" }, { key: "room", label: "Room or link" }]}
      title={it => str(it.f.name)} meta={it => [it.f.teacher, it.f.room].filter(Boolean).map(str).join(" · ")} /></>
);
export function StudySubjectsRight() {
  const subs = names(useItems("study", "subject"));
  const [only, setOnly] = useShared("study:sub", "");
  return (
    <><h3 className="k-h3">Notes</h3>
      {subs.length > 0 && <div className="k-chips"><button className={"k-chip" + (!only ? " on" : "")} onClick={() => setOnly("")}>All</button>{subs.map(s => <button key={s} className={"k-chip" + (only === s ? " on" : "")} onClick={() => setOnly(s)}>{s}</button>)}</div>}
      <ItemList tracker="study" kind="note" dated add="Add a note" empty="Class notes, summaries, things to remember." filter={it => !only || it.f.subject === only}
        fields={[{ key: "subject", label: "Subject", type: "select", options: subs }, { key: "title", label: "Title", required: true }, { key: "text", label: "Note", type: "textarea", rows: 4 }]}
        title={it => str(it.f.title)} meta={it => <>{it.f.subject ? <Tag tone="soft">{str(it.f.subject)}</Tag> : null}{prettyDay(it.date)}</>} body={it => (it.f.text ? <p className="k-text">{str(it.f.text)}</p> : null)} /></>
  );
}
const ASSIGN = ["To do", "Doing", "Done"];
export function StudyAssignLeft() {
  const all = useItems("study", "assignment");
  const due = (all ?? []).filter(a => a.f.status !== "Done" && a.f.deadline).sort((a, b) => str(a.f.deadline).localeCompare(str(b.f.deadline)));
  return <><PageHead eyebrow="Study desk · Assignments" title="Due soon" />
    {due.length ? <ul className="k-plain">{due.map(a => <li key={a.id}><b>{str(a.f.title)}</b> <small>{a.f.subject ? str(a.f.subject) + " · " : ""}{dueText(str(a.f.deadline))}</small></li>)}</ul> : <Empty>Nothing due. Add assignments on the right.</Empty>}</>;
}
export function StudyAssignRight() {
  const subs = names(useItems("study", "subject"));
  return <Board tracker="study" kind="assignment" columns={ASSIGN} add="Add an assignment" filterBy="subject"
    fields={[{ key: "title", label: "Assignment", required: true }, { key: "subject", label: "Subject", type: "select", options: subs }, { key: "deadline", label: "Due", type: "date" }, { key: "notes", label: "Notes", type: "textarea", rows: 2 }]}
    title={it => str(it.f.title)} meta={it => <>{it.f.subject ? <Tag tone="soft">{str(it.f.subject)}</Tag> : null}{it.f.deadline && it.f.status !== "Done" ? <Tag tone={daysUntil(str(it.f.deadline)) < 2 ? "warn" : undefined}>{dueText(str(it.f.deadline))}</Tag> : null}</>} />;
}
export function StudyExamsLeft() {
  const subs = names(useItems("study", "subject"));
  return <><PageHead eyebrow="Study desk · Exams" title="Exams" desc="Add an exam to start its countdown." />
    <Form fields={[{ key: "subject", label: "Subject", type: subs.length ? "select" : "text", options: subs, required: true }, { key: "date", label: "Date", type: "date", required: true }, { key: "time", label: "Time", type: "time" }, { key: "where", label: "Where" }]}
      submit="Add exam" onSubmit={v => addItem("study", "exam", v, { date: str(v.date) })} /></>;
}
export function StudyExamsRight() {
  const all = useItems("study", "exam");
  const t = todayStr();
  const up = (all ?? []).filter(e => str(e.f.date) >= t).sort((a, b) => str(a.f.date).localeCompare(str(b.f.date)));
  const past = (all ?? []).filter(e => str(e.f.date) < t);
  return <><Section title="Coming up">{up.length ? <ul className="ex-list">{up.map(e => { const n = daysUntil(str(e.f.date)); return <li key={e.id}><div className="ex-n"><b>{n}</b><small>{n === 1 ? "day" : "days"}</small></div><div className="k-row-main"><div className="k-row-t">{str(e.f.subject)}</div><div className="k-row-m">{prettyDay(str(e.f.date))}{e.f.time ? ` · ${str(e.f.time)}` : ""}{e.f.where ? ` · ${str(e.f.where)}` : ""}</div></div><DeleteButton onDelete={() => removeItem(e.id)} label="×" /></li>; })}</ul> : <Empty>No exams coming up.</Empty>}</Section>
    {past.length > 0 && <Section title="Done">{<ul className="k-plain">{past.map(e => <li key={e.id}>{str(e.f.subject)} <small>{prettyDay(str(e.f.date))}</small></li>)}</ul>}</Section>}</>;
}
const GAPS = [1, 3, 7, 14, 30, 60];
export function StudyRevisionLeft() {
  const all = useItems("study", "topic");
  const t = todayStr();
  const due = (all ?? []).filter(x => str(x.f.next || t) <= t);
  return <><PageHead eyebrow="Study desk · Revision" title="Review today" desc="Each review pushes the next one further out: 1, 3, 7, 14, 30, then 60 days." />
    {due.length ? <ul className="k-rows">{due.map(x => <li key={x.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{str(x.f.topic)}</div><div className="k-row-m">{x.f.subject ? str(x.f.subject) + " · " : ""}review {num(x.f.level) + 1}</div></div>
      <div className="k-row-a"><button className="k-btn sm" onClick={() => { const lv = num(x.f.level); updateItem(x.id, { level: lv + 1, next: addDays(t, GAPS[Math.min(lv, GAPS.length - 1)]), last: t }); }}>Reviewed ✓</button></div></li>)}</ul> : <Empty>Nothing to review today.</Empty>}</>;
}
export function StudyRevisionRight() {
  const subs = names(useItems("study", "subject"));
  return <><h3 className="k-h3">Revision plan</h3>
    <ItemList tracker="study" kind="topic" add="Add a topic" empty="Add topics to revise. They come up for review today first." defaults={{ level: 0, next: todayStr() }}
      sort={(a, b) => str(a.f.next).localeCompare(str(b.f.next))}
      fields={[{ key: "topic", label: "Topic", required: true }, { key: "subject", label: "Subject", type: subs.length ? "select" : "text", options: subs }]}
      title={it => str(it.f.topic)} meta={it => <>{it.f.subject ? <Tag tone="soft">{str(it.f.subject)}</Tag> : null}<small>next review {str(it.f.next) <= todayStr() ? "today" : prettyDay(str(it.f.next))}</small></>} /></>;
}

// ================= Habits =================
const daysOf = (h: Item) => (Array.isArray(h.f.days) ? (h.f.days as string[]) : []);
export const toggleHabit = (h: Item, d: string) => updateItem(h.id, { days: daysOf(h).includes(d) ? daysOf(h).filter(x => x !== d) : [...daysOf(h), d] });
/** A habit's last seven days as dots; tap a dot to tick that day. */
export function HabitStrip({ h }: { h: Item }) {
  const t = todayStr(), week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)), set = new Set(daysOf(h));
  return <div className="h-strip">{week.map(d => <button key={d} className={"h-dot" + (set.has(d) ? " on" : "") + (d === t ? " today" : "")} aria-pressed={set.has(d)} aria-label={`${str(h.f.name)} on ${prettyDay(d)}`} title={prettyDay(d)} onClick={() => toggleHabit(h, d)}>{fromYmd(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</button>)}</div>;
}
export function HabitsTodayLeft() {
  const all = useItems("habits", "habit");
  const t = todayStr();
  const done = (all ?? []).filter(h => daysOf(h).includes(t)).length;
  return <><PageHead eyebrow="Habits · Today" title="Today’s habits" desc={all?.length ? `${done} of ${all.length} done.` : undefined} />
    {all?.length ? <ul className="h-today">{all.map(h => { const on = daysOf(h).includes(t); return <li key={h.id}><button role="checkbox" aria-checked={on} className={"h-check" + (on ? " on" : "")} onClick={() => toggleHabit(h, t)}><i />{str(h.f.name)}</button></li>; })}</ul> : <Empty>Add a habit on the right to start.</Empty>}</>;
}
export const HabitsTodayRight = () => (
  <><h3 className="k-h3">Your habits</h3>
    <ItemList tracker="habits" kind="habit" add="Add a habit" empty="Small things you want to do every day." defaults={{ days: [] }}
      fields={[{ key: "name", label: "Habit", required: true }, { key: "why", label: "Why it matters" }]} title={it => str(it.f.name)} meta={it => str(it.f.why)} /></>
);
export function HabitsStreaksLeft() {
  const all = useItems("habits", "habit");
  return <><PageHead eyebrow="Habits · Streaks" title="This week" desc="Tap a day to tick it or untick it." />
    {all?.length ? <ul className="h-rows">{all.map(h => <li key={h.id}><b>{str(h.f.name)}</b><HabitStrip h={h} /></li>)}</ul> : <Empty>No habits yet.</Empty>}</>;
}
export function HabitsStreaksRight() {
  const all = useItems("habits", "habit");
  const hidden = useHideStreaks();
  return <Section title="Runs" aside={<StreakToggle />}>{hidden ? <Empty>Streaks are hidden.</Empty> : all?.length ? <ul className="k-rows">{all.map(h => { const s = streaks(new Set(daysOf(h))); return <li key={h.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{str(h.f.name)}</div><div className="k-row-m">{s.cur} now · best {s.best} · {daysOf(h).length} days in all</div></div></li>; })}</ul> : <Empty>Runs show here once you tick habits.</Empty>}</Section>;
}

// ================= Planner =================
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
export function PlannerTodayLeft() {
  const t = todayStr();
  const blocks = (useItems("planner", "block") ?? []).filter(b => b.date === t);
  const { profile } = useProfile();
  const { layout } = useLayout();
  const where = profile ?? FALLBACK;
  const P = useMemo(() => dayTimes(new Date(), where.place, where.prayer), [where]);
  const salah = useLiveQuery(() => db.salah.get(t), [t]);
  const rows = [
    ...(layout.picked.includes("deen") ? FIVE.map(k => ({ id: k, at: P[k], end: 0, title: k, prayer: true, done: isPrayed(salah?.p[k]) })) : []),
    ...blocks.map(b => ({ id: b.id, at: toMin(str(b.f.start)), end: b.f.end ? toMin(str(b.f.end)) : 0, title: str(b.f.title), prayer: false, done: false })),
  ].sort((a, b) => a.at - b.at);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return (
    <><PageHead eyebrow="Planner · Today" title={fromYmd(t).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />
      <ol className="p-line">
        {rows.map((r, i) => <li key={r.id} className={(r.prayer ? "prayer" : "block") + (r.done ? " done" : "") + ((rows[i + 1]?.at ?? 1441) > now && r.at <= now ? " now" : "")}>
          <time>{fmtMin(r.at)}{r.end ? `–${fmtMin(r.end)}` : ""}</time><b>{r.title}</b>
          {!r.prayer && <DeleteButton onDelete={() => removeItem(r.id)} label="×" />}
        </li>)}
        {!rows.length && <Empty>Add a time block below.</Empty>}
      </ol>
      <Form fields={[{ key: "title", label: "Block", required: true }, { key: "start", label: "From", type: "time", required: true }, { key: "end", label: "To", type: "time" }]} submit="Add block"
        onSubmit={v => addItem("planner", "block", v, { date: t })} /></>
  );
}
export function PlannerTodayRight() {
  const t = todayStr();
  const tasks = (useItems("planner", "task") ?? []).filter(x => x.date === t || (!x.f.done && (x.date ?? t) < t));
  const due = useDueToday(t);
  const habits = useItems("habits", "habit");
  const [txt, setTxt] = useState("");
  return (
    <>
      <Section title="Tasks">
        <form className="k-inline" onSubmit={e => { e.preventDefault(); if (txt.trim()) { addItem("planner", "task", { title: txt.trim(), done: false }, { date: t }); setTxt(""); } }}>
          <input className="k-in" placeholder="Add a task for today" aria-label="New task" value={txt} onChange={e => setTxt(e.target.value)} /><button className="k-btn">Add</button>
        </form>
        <ul className="h-today">{tasks.map(x => <li key={x.id}><button role="checkbox" aria-checked={!!x.f.done} className={"h-check" + (x.f.done ? " on" : "")} onClick={() => updateItem(x.id, { done: !x.f.done })}><i />{str(x.f.title)}{x.date && x.date < t ? <small> · from {prettyDay(x.date)}</small> : null}</button><DeleteButton onDelete={() => removeItem(x.id)} label="×" /></li>)}</ul>
      </Section>
      <Section title="From your rooms">
        {due.length ? <ul className="h-today">{due.map(d => <li key={d.id}><button role="checkbox" aria-checked={d.done} className={"h-check" + (d.done ? " on" : "")} onClick={d.toggle}><i />{d.title}<small> · {d.from}{d.when < t ? `, ${dueText(d.when)}` : ""}</small></button></li>)}</ul> : <Empty>Nothing due today from your boards.</Empty>}
      </Section>
      {habits && habits.length > 0 && <Section title="Habits">
        <ul className="h-rows">{habits.map(h => <li key={h.id}><b>{str(h.f.name)}</b><HabitStrip h={h} /></li>)}</ul>
      </Section>}
    </>
  );
}
function WeekDays({ from, n }: { from: number; n: number }) {
  const t = todayStr(), monday = addDays(t, -((fromYmd(t).getDay() + 6) % 7));
  const blocks = useItems("planner", "block"), tasks = useItems("planner", "task");
  const items = useItemsOf([["work", "task"], ["design", "task"], ["study", "assignment"], ["content", "post"], ["study", "exam"]]);
  return (
    <ul className="p-week">{Array.from({ length: n }, (_, i) => addDays(monday, from + i)).map(d => {
      const b = (blocks ?? []).filter(x => x.date === d), k = (tasks ?? []).filter(x => x.date === d);
      const due = (items ?? []).filter(x => str(x.kind === "exam" ? x.f.date : x.tracker === "content" ? x.f.date : x.f.deadline) === d);
      return <li key={d} className={d === t ? "today" : ""}><h4>{fromYmd(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric" })}</h4>
        {b.length + k.length + due.length === 0 ? <small className="k-empty">Free</small> : <ul className="k-plain">
          {b.sort((x, y) => str(x.f.start).localeCompare(str(y.f.start))).map(x => <li key={x.id}><small>{str(x.f.start)}</small> {str(x.f.title)}</li>)}
          {k.map(x => <li key={x.id} className={x.f.done ? "done" : ""}>☐ {str(x.f.title)}</li>)}
          {due.map(x => <li key={x.id}><Tag tone="soft">{x.kind === "exam" ? "Exam" : TRACKER[x.tracker]?.title}</Tag> {str(x.f.title || x.f.subject)}</li>)}
        </ul>}</li>;
    })}</ul>
  );
}
export const PlannerWeekLeft = () => <><PageHead eyebrow="Planner · This week" title="This week" /><WeekDays from={0} n={4} /></>;
export const PlannerWeekRight = () => <WeekDays from={4} n={3} />;

// ================= Reading list =================
const BOOK_FIELDS: Field[] = [{ key: "title", label: "Title", required: true }, { key: "author", label: "Author" }, { key: "status", label: "Shelf", type: "select", options: ["Want to read", "Reading now", "Finished"], required: true }, { key: "pages", label: "Pages", type: "number" }];
export function ReadingShelfLeft() {
  const books = (useItems("reading", "book") ?? []).filter(b => b.f.status === "Reading now");
  return <><PageHead eyebrow="Reading list · Shelf" title="Reading now" />
    {books.length ? <ul className="k-rows">{books.map(b => { const p = num(b.f.page), all = num(b.f.pages); return <li key={b.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{str(b.f.title)}</div><div className="k-row-m">{str(b.f.author)}</div>
      {all > 0 && <div className="q-total sm"><div className="q-bar"><i style={{ width: `${Math.min(100, (100 * p) / all)}%` }} /></div><small>{p} / {all}</small></div>}
      <div className="k-actions"><label className="q-at">page <input type="number" min={0} value={p || ""} placeholder="0" aria-label={`Page in ${str(b.f.title)}`} onChange={e => updateItem(b.id, { page: Number(e.target.value) || 0 })} /></label>
        <button className="k-link" onClick={() => updateItem(b.id, { status: "Finished", finished: todayStr() })}>Finished it ✓</button></div></div></li>; })}</ul> : <Empty>Move a book to “Reading now” on the right.</Empty>}</>;
}
export const ReadingShelfRight = () => (
  <><h3 className="k-h3">Want to read</h3>
    <ItemList tracker="reading" kind="book" add="Add a book" empty="Books you want to read." defaults={{ status: "Want to read" }} fields={BOOK_FIELDS} filter={b => b.f.status === "Want to read"}
      title={b => str(b.f.title)} meta={b => str(b.f.author)} actions={b => <button className="k-link" onClick={() => updateItem(b.id, { status: "Reading now" })}>Start reading</button>} /></>
);
export function ReadingDoneLeft() {
  const done = (useItems("reading", "book") ?? []).filter(b => b.f.status === "Finished");
  return <><PageHead eyebrow="Reading list · Finished" title={`Finished · ${done.length}`} />
    {done.length ? <ul className="k-rows">{done.map(b => <li key={b.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{str(b.f.title)}</div><div className="k-row-m">{str(b.f.author)}{b.f.finished ? ` · ${prettyDay(str(b.f.finished))}` : ""}</div>
      <div className="r-stars" role="radiogroup" aria-label={`Rate ${str(b.f.title)}`}>{[1, 2, 3, 4, 5].map(n => <button key={n} role="radio" aria-checked={num(b.f.rating) === n} className={n <= num(b.f.rating) ? "on" : ""} onClick={() => updateItem(b.id, { rating: n })} aria-label={`${n} of 5`}>★</button>)}</div></div></li>)}</ul> : <Empty>Books you finish show here.</Empty>}</>;
}
export function ReadingDoneRight() {
  const books = names(useItems("reading", "book"), "title");
  return <><h3 className="k-h3">Notes & quotes</h3>
    <ItemList tracker="reading" kind="quote" dated add="Add a quote or note" empty="Lines worth keeping."
      fields={[{ key: "text", label: "Quote or note", type: "textarea", rows: 3, required: true }, { key: "book", label: "Book", type: books.length ? "select" : "text", options: books }, { key: "page", label: "Page" }]}
      title={it => <span className="k-text">“{str(it.f.text)}”</span>} meta={it => [it.f.book, it.f.page && `p. ${str(it.f.page)}`].filter(Boolean).map(str).join(" · ")} /></>;
}

// ================= Fitness & water =================
const GOAL = 8;
export function FitTodayLeft() {
  const t = todayStr();
  const it = useDayItem("fitness", "water", t);
  const n = num(it?.f.n);
  return <><PageHead eyebrow="Fitness & water · Today" title="Water" desc={`${n} of ${GOAL} glasses`} />
    <div className="w-glasses">{Array.from({ length: Math.max(GOAL, n + 1) }, (_, i) => <button key={i} className={"w-glass" + (i < n ? " on" : "")} aria-label={`${i + 1} glasses`} aria-pressed={i < n} onClick={() => setDayItem("fitness", "water", t, { n: i < n ? i : i + 1 })}><i /></button>)}</div>
    <p className="k-note">Tap a glass to fill it. Tap a full one to undo.</p></>;
}
const MOVE_FIELDS: Field[] = [{ key: "what", label: "Movement", required: true, placeholder: "Walk, yoga, gym…" }, { key: "minutes", label: "Minutes", type: "number" }, { key: "notes", label: "Notes" }];
export const FitTodayRight = () => (
  <><h3 className="k-h3">Movement today</h3>
    <ItemList tracker="fitness" kind="move" dated add="Log movement" empty="Nothing logged today." fields={MOVE_FIELDS} filter={m => m.date === todayStr()}
      title={m => str(m.f.what)} meta={m => (m.f.minutes ? `${num(m.f.minutes)} min` : "")} /></>
);
export const FitLogLeft = () => (
  <><PageHead eyebrow="Fitness & water · Log" title="Workouts" />
    <ItemList tracker="fitness" kind="move" dated add="Log movement" empty="Your workouts collect here." fields={MOVE_FIELDS}
      title={m => str(m.f.what)} meta={m => <>{prettyDay(m.date)}{m.f.minutes ? ` · ${num(m.f.minutes)} min` : ""}</>} /></>
);
export function FitLogRight() {
  const moves = useItems("fitness", "move"), water = useItems("fitness", "water");
  const days = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i - 6));
  const mins = (d: string) => (moves ?? []).filter(m => m.date === d).reduce((a, m) => a + num(m.f.minutes), 0);
  const w = (d: string) => num((water ?? []).find(x => x.date === d)?.f.n);
  const max = Math.max(30, ...days.map(mins));
  return <><Section title="This week · minutes moving"><div className="m-bars">{days.map(d => <div key={d} title={`${mins(d)} min`}><i style={{ height: `${(mins(d) / max) * 100}%`, background: "#B7BE76" }} /><small>{fromYmd(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</small></div>)}</div></Section>
    <Section title="This week · glasses of water"><div className="m-bars">{days.map(d => <div key={d} title={`${w(d)} glasses`}><i style={{ height: `${(Math.min(w(d), 12) / 12) * 100}%`, background: "#9CC3D5" }} /><small>{fromYmd(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</small></div>)}</div></Section>
    <p className="k-note">{days.reduce((a, d) => a + mins(d), 0)} minutes this week.</p></>;
}

// ================= Hobbies =================
export function HobbiesLeft() {
  const [, setOpen] = useShared("hob:open", "");
  return <><PageHead eyebrow="Hobbies · My hobbies" title="My hobbies" />
    <ItemList tracker="hobbies" kind="hobby" add="Add a hobby" empty="Calligraphy, baking, crochet…" fields={[{ key: "name", label: "Hobby", required: true }, { key: "why", label: "What you love about it" }]}
      title={it => str(it.f.name)} meta={it => str(it.f.why)} actions={it => <button className="k-link" onClick={() => setOpen(str(it.f.name))}>Log →</button>} /></>;
}
export function HobbiesRight() {
  const hobbies = names(useItems("hobbies", "hobby"));
  const [open, setOpen] = useShared("hob:open", "");
  return <><h3 className="k-h3">Log</h3>
    {hobbies.length > 0 && <div className="k-chips"><button className={"k-chip" + (!open ? " on" : "")} onClick={() => setOpen("")}>All</button>{hobbies.map(h => <button key={h} className={"k-chip" + (open === h ? " on" : "")} onClick={() => setOpen(h)}>{h}</button>)}</div>}
    <ItemList key={open} tracker="hobbies" kind="log" dated add="Log a session" empty="Log time spent on a hobby." defaults={open ? { hobby: open } : undefined} filter={l => !open || l.f.hobby === open}
      fields={[{ key: "hobby", label: "Hobby", type: hobbies.length ? "select" : "text", options: hobbies, required: true }, { key: "what", label: "What you did" }, { key: "minutes", label: "Minutes", type: "number" }]}
      title={l => str(l.f.what) || str(l.f.hobby)} meta={l => <>{prettyDay(l.date)} · {str(l.f.hobby)}{l.f.minutes ? ` · ${num(l.f.minutes)} min` : ""}</>} /></>;
}
export function HobbyJarLeft() {
  const ideas = useItems("hobbies", "idea");
  return <><PageHead eyebrow="Hobbies · Idea jar" title="Bored?" desc="Pull an idea out of the jar." /><Jar items={ideas ?? []} empty="Drop some ideas in first." render={it => <b className="lib-t">{str(it.f.text)}</b>} /></>;
}
export const HobbyJarRight = () => <><h3 className="k-h3">In the jar</h3><ItemList tracker="hobbies" kind="idea" add="Drop an idea in" open empty="Nothing in the jar yet." fields={[{ key: "text", label: "Idea", required: true }]} title={it => str(it.f.text)} /></>;
export function InspoLeft() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState(""), [src, setSrc] = useState("");
  const [spread, setSpread] = useShared<string | null>("scrap:spread", null);
  const [, setSel] = useShared<string | null>("scrap:sel", null);
  const [, turnTo] = useShared<string | null>("diary:goto", null);
  return <><PageHead eyebrow="Hobbies · Inspiration" title="Save an image" desc="Saved images go on your board, and onto a scrapbook spread to decorate." />
    <form className="k-form" onSubmit={async e => {
      e.preventDefault(); if (!file) return;
      const im = await addItem("hobbies", "inspo", { note, source: src }, { date: todayStr(), blob: file });
      setFile(null); setNote(""); setSrc(""); (e.target as HTMLFormElement).reset();
      // turn the page to the scrapbook, with the new image placed and ready to move
      const r = await addElement(spread, { type: "image", side: "left", x: 50, y: 50, w: 50, rot: -2, src: im.id });
      setSpread(r.spreadId); setSel(r.id); turnTo("scrapbook");
    }}>
      <label className="k-field wide"><span>Image</span><input className="k-in" type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
      <label className="k-field wide"><span>Note</span><input className="k-in" value={note} onChange={e => setNote(e.target.value)} /></label>
      <label className="k-field wide"><span>Where it’s from</span><input className="k-in" value={src} onChange={e => setSrc(e.target.value)} placeholder="A link or a name" /></label>
      <div className="k-actions"><button className="k-btn" disabled={!file}>Add to board</button></div>
    </form></>;
}
export function InspoRight() {
  const all = useItems("hobbies", "inspo");
  return all?.length ? <div className="i-board">{all.map(it => <figure key={it.id}><Photo blob={it.blob} alt={str(it.f.note) || "Inspiration"} />{(it.f.note || it.f.source) ? <figcaption>{str(it.f.note)}{it.f.source ? <small> {str(it.f.source)}</small> : null}</figcaption> : null}<DeleteButton onDelete={() => removeItem(it.id)} label="×" /></figure>)}</div> : <Empty>Your board fills up as you save images.</Empty>;
}
const EXP_FIELDS: Field[] = [{ key: "tried", label: "What you tried", required: true }, { key: "result", label: "How it went", type: "select", options: ["Worked", "Didn’t work", "Mixed"] }, { key: "learned", label: "What you learned", type: "textarea", rows: 2 }];
export const ExperimentsLeft = () => <><PageHead eyebrow="Hobbies · Experiments" title="Try something" desc="What you tried, what worked, what didn’t." /><Form fields={EXP_FIELDS} submit="Log experiment" onSubmit={v => addItem("hobbies", "experiment", v, { date: todayStr() })} /></>;
export const ExperimentsRight = () => (
  <ItemList tracker="hobbies" kind="experiment" dated add="Add" empty="Experiments you log show here." fields={EXP_FIELDS}
    title={it => str(it.f.tried)} meta={it => <>{it.f.result ? <Tag tone={it.f.result === "Worked" ? "good" : it.f.result === "Mixed" ? undefined : "warn"}>{str(it.f.result)}</Tag> : null}{prettyDay(it.date)}</>}
    body={it => (it.f.learned ? <p className="k-text">{str(it.f.learned)}</p> : null)} />
);

// ================= Today =================
function useAllStreaks() {
  const salah = useLiveQuery(() => db.salah.toArray(), []);
  const read = useItems("deen", "read"), refl = useItems("deen", "reflection"), entries = useItems("journal", "entry"), focus = useItems("focus", "session");
  return useMemo(() => {
    const prayer = new Set((salah ?? []).filter(d => FIVE.every(k => isPrayed(d.p[k]))).map(d => d.date));
    const period = new Set((salah ?? []).filter(d => d.period).map(d => d.date));
    const quran = new Set([...(read ?? []), ...(refl ?? [])].map(i => i.date!).filter(Boolean));
    const journal = new Set((entries ?? []).map(i => i.date!));
    const foc = new Set((focus ?? []).map(i => i.date!));
    return {
      rows: [
        { id: "prayer", label: "All five prayers", s: streaks(prayer, period) }, { id: "quran", label: "Quran", s: streaks(quran) },
        { id: "journal", label: "Journal", s: streaks(journal) }, { id: "focus", label: "Focus sessions", s: streaks(foc) },
      ],
      totals: [
        ["prayers marked", (salah ?? []).reduce((a, d) => a + FIVE.filter(k => isPrayed(d.p[k])).length, 0)],
        ["reflections", refl?.length ?? 0], ["journal entries", entries?.length ?? 0],
        ["minutes focused", (focus ?? []).reduce((a, i) => a + num(i.f.minutes), 0)],
      ] as [string, number][],
    };
  }, [salah, read, refl, entries, focus]);
}
export function TodayLeft() {
  const { rows } = useAllStreaks();
  const hidden = useHideStreaks();
  const { layout } = useLayout();
  const shown = rows.filter(r => (r.id === "prayer" || r.id === "quran" ? layout.picked.includes("deen") : r.id === "journal" ? layout.picked.includes("journal") : true));
  return <><PageHead eyebrow="Today · Streaks" title="Streaks" desc="Days in a row, counting today or yesterday." />
    {hidden ? <Empty>Streaks are hidden. Your totals are on the right.</Empty> : <div className="t-cards">{shown.map(r => <div key={r.id} className="t-card"><b>{r.s.cur}</b><span>{r.label}</span><small>best {r.s.best}</small></div>)}</div>}
    <StreakToggle /></>;
}
export function TodayRight() {
  const { totals } = useAllStreaks();
  return <Section title="All time"><div className="k-stats">{totals.map(([l, n]) => <div key={l}><b>{n.toLocaleString()}</b><small>{l}</small></div>)}</div>
    <p className="k-note">Everything stays on this device. Nobody else sees your streaks.</p></Section>;
}
