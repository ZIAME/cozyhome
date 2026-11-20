"use client";
/**
 * Building blocks for diary pages: a page heading, a form built from field definitions, lists, a kanban board,
 * a month calendar, a jar to pull random things from, and small helpers. Tracker pages are mostly made of these.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "@/lib/db";
import { addItem, removeItem, str, updateItem, useItems } from "@/lib/items";
import { addDays, fromYmd, todayStr, ymd } from "@/lib/dates";
import { useShared } from "@/lib/shared";

// ---------- headings ----------
export function PageHead({ eyebrow, title, desc, children }: { eyebrow?: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="k-head">
      {eyebrow && <div className="p-eye">{eyebrow}</div>}
      <h2 className="k-title">{title}</h2>
      {desc && <p className="k-desc">{desc}</p>}
      {children}
    </div>
  );
}
export const Section = ({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <section className="k-sec"><div className="k-sec-h"><h3>{title}</h3>{aside}</div>{children}</section>
);
export const Empty = ({ children }: { children: React.ReactNode }) => <p className="k-empty">{children}</p>;

// ---------- fields & forms ----------
export type Field = {
  key: string; label: string;
  type?: "text" | "textarea" | "date" | "time" | "number" | "url" | "select" | "tags";
  options?: string[]; placeholder?: string; required?: boolean; rows?: number;
};
export type Values = Record<string, unknown>;

export function FieldInput({ field, value, onChange, id }: { field: Field; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const t = field.type ?? "text";
  if (t === "textarea") return <textarea id={id} className="k-in" rows={field.rows ?? 3} placeholder={field.placeholder} value={str(value)} onChange={e => onChange(e.target.value)} />;
  if (t === "select") return (
    <select id={id} className="k-in" value={str(value)} onChange={e => onChange(e.target.value)}>
      {!field.required && <option value="">—</option>}
      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (t === "number") return <input id={id} className="k-in" type="number" inputMode="decimal" placeholder={field.placeholder} value={value === undefined || value === "" ? "" : String(value)} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
  if (t === "tags") return <input id={id} className="k-in" placeholder={field.placeholder ?? "comma, separated"} value={Array.isArray(value) ? value.join(", ") : str(value)} onChange={e => onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))} />;
  return <input id={id} className="k-in" type={t} placeholder={field.placeholder} value={str(value)} onChange={e => onChange(e.target.value)} />;
}

let formSeq = 0;
/** A form for a list of fields. Calls onSubmit with the values; clears itself when `reset` is set. */
export function Form({ fields, initial, onSubmit, submit = "Add", onCancel, reset = true }: {
  fields: Field[]; initial?: Values; onSubmit: (v: Values) => unknown; submit?: string; onCancel?: () => void; reset?: boolean;
}) {
  const [v, setV] = useState<Values>(initial ?? {});
  const uid = useMemo(() => `f${++formSeq}`, []);
  const ok = fields.every(f => !f.required || str(v[f.key]).trim() !== "");
  return (
    <form className="k-form" onSubmit={async e => { e.preventDefault(); if (!ok) return; await onSubmit(v); if (reset) setV(initial ?? {}); }}>
      {fields.map(f => (
        <label key={f.key} className={"k-field" + (f.type === "textarea" ? " wide" : "")} htmlFor={`${uid}-${f.key}`}>
          <span>{f.label}</span>
          <FieldInput id={`${uid}-${f.key}`} field={f} value={v[f.key]} onChange={x => setV(p => ({ ...p, [f.key]: x }))} />
        </label>
      ))}
      <div className="k-actions">
        <button type="submit" className="k-btn" disabled={!ok}>{submit}</button>
        {onCancel && <button type="button" className="k-btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** Delete with a second tap instead of a dialog. */
export function DeleteButton({ onDelete, label = "Delete" }: { onDelete: () => void; label?: string }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 3000); return () => clearTimeout(t); }, [sure]);
  return <button type="button" className={"k-link danger" + (sure ? " sure" : "")} onClick={() => (sure ? onDelete() : setSure(true))}>{sure ? "Tap again to delete" : label}</button>;
}

// ---------- lists ----------
export type ListProps = {
  tracker: string; kind: string; fields: Field[];
  title: (it: Item) => React.ReactNode;
  meta?: (it: Item) => React.ReactNode;
  body?: (it: Item) => React.ReactNode;
  /** Values every new item starts with (e.g. a status). */
  defaults?: Values;
  /** Give new items today's date (or the date field's value). */
  dated?: boolean | string;
  filter?: (it: Item) => boolean;
  sort?: (a: Item, b: Item) => number;
  empty: string; add?: string;
  /** Show the add form open (a list that is the page's main thing). */
  open?: boolean;
  actions?: (it: Item) => React.ReactNode;
};

/** A list of records with an add form and inline editing. */
export function ItemList({ tracker, kind, fields, title, meta, body, defaults, dated, filter, sort, empty, add = "Add", open, actions }: ListProps) {
  const all = useItems(tracker, kind);
  const [adding, setAdding] = useState(!!open);
  const [editing, setEditing] = useState<string | null>(null);
  const rows = useMemo(() => { let a = (all ?? []).filter(filter ?? (() => true)); if (sort) a = [...a].sort(sort); return a; }, [all, filter, sort]);
  const dateOf = (v: Values) => (typeof dated === "string" ? str(v[dated]) || todayStr() : dated ? todayStr() : undefined);
  return (
    <div className="k-list">
      {adding ? (
        <Form fields={fields} submit={add} onCancel={open ? undefined : () => setAdding(false)}
          onSubmit={async v => { await addItem(tracker, kind, { ...defaults, ...v }, { date: dateOf(v) }); if (!open) setAdding(false); }} />
      ) : <button className="k-add" onClick={() => setAdding(true)}>+ {add}</button>}
      {all !== undefined && rows.length === 0 && <Empty>{empty}</Empty>}
      <ul className="k-rows">
        {rows.map(it => (
          <li key={it.id} className="k-row">
            {editing === it.id ? (
              <Form fields={fields} initial={it.f} submit="Save" reset={false} onCancel={() => setEditing(null)}
                onSubmit={async v => { await updateItem(it.id, v, { date: typeof dated === "string" ? str(v[dated]) || it.date : it.date }); setEditing(null); }} />
            ) : <>
              <div className="k-row-main">
                <div className="k-row-t">{title(it)}</div>
                {meta && <div className="k-row-m">{meta(it)}</div>}
                {body && body(it)}
              </div>
              <div className="k-row-a">
                {actions?.(it)}
                <button className="k-link" onClick={() => setEditing(it.id)}>Edit</button>
                <DeleteButton onDelete={() => removeItem(it.id)} />
              </div>
            </>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- kanban ----------
export type BoardProps = {
  tracker: string; kind: string; columns: string[]; fields: Field[];
  title: (it: Item) => React.ReactNode; meta?: (it: Item) => React.ReactNode;
  /** A field to filter cards by (e.g. client). */
  filterBy?: string;
  add?: string;
  /** A per-card action, e.g. "Turn into a post →". */
  actions?: (it: Item) => React.ReactNode;
};

/** Columns of cards. Move a card with its arrows, or drag it to another column. */
export function Board({ tracker, kind, columns, fields, title, meta, filterBy, add = "Add a card", actions }: BoardProps) {
  const all = useItems(tracker, kind);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const drag = useRef<string | null>(null);
  const opts = useMemo(() => (filterBy ? [...new Set((all ?? []).map(i => str(i.f[filterBy])).filter(Boolean))].sort() : []), [all, filterBy]);
  const cards = (all ?? []).filter(i => !filter || str(i.f[filterBy!]) === filter);
  const colOf = (it: Item) => (columns.includes(str(it.f.status)) ? str(it.f.status) : columns[0]);
  const move = (it: Item, d: number) => { const i = columns.indexOf(colOf(it)) + d; if (i >= 0 && i < columns.length) updateItem(it.id, { status: columns[i] }); };
  return (
    <div className="k-board-wrap">
      <div className="k-board-bar">
        {adding ? null : <button className="k-add" onClick={() => setAdding(true)}>+ {add}</button>}
        {filterBy && opts.length > 0 && (
          <label className="k-filter">{fields.find(f => f.key === filterBy)?.label ?? filterBy}
            <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">All</option>{opts.map(o => <option key={o}>{o}</option>)}</select>
          </label>
        )}
      </div>
      {adding && <Form fields={fields} onCancel={() => setAdding(false)} submit={add}
        onSubmit={async v => { await addItem(tracker, kind, { status: columns[0], ...v }); setAdding(false); }} />}
      <div className="k-board" style={{ ["--cols" as string]: columns.length }}>
        {columns.map(col => {
          const here = cards.filter(c => colOf(c) === col);
          return (
            <div key={col} className={"k-col" + (over === col ? " over" : "")}
              onDragOver={e => { e.preventDefault(); setOver(col); }} onDragLeave={() => setOver(o => (o === col ? null : o))}
              onDrop={e => { e.preventDefault(); setOver(null); if (drag.current) updateItem(drag.current, { status: col }); drag.current = null; }}>
              <h4>{col}<span>{here.length}</span></h4>
              {here.map(it => (
                <div key={it.id} className="k-card" draggable onDragStart={() => { drag.current = it.id; }}>
                  {open === it.id ? (
                    <Form fields={fields} initial={it.f} submit="Save" reset={false} onCancel={() => setOpen(null)}
                      onSubmit={async v => { await updateItem(it.id, v); setOpen(null); }} />
                  ) : <>
                    <button className="k-card-t" onClick={() => setOpen(it.id)}>{title(it)}</button>
                    {meta && <div className="k-card-m">{meta(it)}</div>}
                    <div className="k-card-a">
                      <button className="k-arrow" aria-label="Move left" disabled={col === columns[0]} onClick={() => move(it, -1)}>‹</button>
                      <button className="k-arrow" aria-label="Move right" disabled={col === columns[columns.length - 1]} onClick={() => move(it, 1)}>›</button>
                      {actions?.(it)}
                      <DeleteButton onDelete={() => removeItem(it.id)} label="×" />
                    </div>
                  </>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- calendar ----------
const WD = ["M", "T", "W", "T", "F", "S", "S"];
export const monthStart = (s: string) => s.slice(0, 7) + "-01";
export const addMonths = (s: string, n: number) => { const d = fromYmd(monthStart(s)); d.setMonth(d.getMonth() + n); return ymd(d); };
export const monthLabel = (s: string) => fromYmd(s).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/** A month of days. `paint` colours a day (or leaves it blank); tap a day to pick it. */
export function MonthGrid({ month, setMonth, paint, selected, onPick, label }: {
  month: string; setMonth: (m: string) => void; paint: (d: string) => string | null; selected?: string; onPick?: (d: string) => void; label?: (d: string) => string;
}) {
  const first = fromYmd(monthStart(month)), lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const today = todayStr();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(monthStart(month), i))];
  return (
    <div className="k-month">
      <div className="k-month-h">
        <button className="k-arrow" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <b>{monthLabel(month)}</b>
        <button className="k-arrow" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>
      <div className="k-grid">
        {WD.map((w, i) => <span key={i} className="k-wd">{w}</span>)}
        {cells.map((d, i) => d ? (
          <button key={d} className={"k-day" + (d === selected ? " sel" : "") + (d === today ? " today" : "") + (d > today ? " future" : "")}
            style={{ background: paint(d) ?? undefined }} onClick={() => onPick?.(d)} aria-label={label?.(d) ?? d}>{Number(d.slice(8))}</button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
}

// ---------- jar ----------
/** Pull something at random from a list. */
export function Jar({ items, render, label = "Pull one out", empty }: { items: Item[]; render: (it: Item) => React.ReactNode; label?: string; empty: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const it = items.find(i => i.id === pick);
  return (
    <div className="k-jar">
      <div className="k-jar-glass">{it ? render(it) : <span className="k-empty">{items.length ? "Tap the button, see what comes out." : empty}</span>}</div>
      <button className="k-btn" disabled={!items.length} onClick={() => { const pool = items.length > 1 ? items.filter(i => i.id !== pick) : items; setPick(pool[Math.floor(Math.random() * pool.length)]?.id ?? null); }}>{label}</button>
    </div>
  );
}

// ---------- small helpers ----------
/** The day a page is looking at, shared between its left and right side. */
export function useDay(key: string) { return useShared(`day:${key}`, todayStr()); }
export function DayNav({ day, setDay }: { day: string; setDay: (d: string) => void }) {
  const t = todayStr();
  return (
    <div className="k-daynav">
      <button className="k-arrow" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>‹</button>
      <b>{day === t ? "Today" : fromYmd(day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</b>
      <button className="k-arrow" aria-label="Next day" disabled={day >= t} onClick={() => setDay(addDays(day, 1))}>›</button>
    </div>
  );
}
export const prettyDay = (d?: string) => (d ? fromYmd(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: d.slice(0, 4) === todayStr().slice(0, 4) ? undefined : "numeric" }) : "");
export const daysUntil = (d: string) => Math.round((fromYmd(d).getTime() - fromYmd(todayStr()).getTime()) / 864e5);
export const dueText = (d: string) => { const n = daysUntil(d); return n === 0 ? "due today" : n === 1 ? "due tomorrow" : n < 0 ? `${-n} day${n === -1 ? "" : "s"} late` : `in ${n} days`; };
export const Tag = ({ children, tone }: { children: React.ReactNode; tone?: "warn" | "good" | "soft" }) => <span className={"k-tag" + (tone ? " " + tone : "")}>{children}</span>;

/** Consecutive days ending today (or yesterday, if today isn't done yet) for which `has(day)` is true, and the longest run. */
export function streaks(days: Set<string>) {
  const t = todayStr();
  let cur = 0, d = days.has(t) ? t : addDays(t, -1);
  while (days.has(d)) { cur++; d = addDays(d, -1); }
  const sorted = [...days].sort(); let best = 0, run = 0, prev = "";
  for (const s of sorted) { run = prev && addDays(prev, 1) === s ? run + 1 : 1; best = Math.max(best, run); prev = s; }
  return { cur, best };
}

/** Copy text, falling back to selecting it. */
export async function copyText(text: string, el?: HTMLElement | null) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); } return false; }
}
