"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PrayerStatus, type SalahDay } from "@/lib/db";
import { FIVE, dayTimes } from "@/lib/prayer";
import { isPrayed } from "@/lib/salah";
import { fmtMin, fromYmd, hash, todayStr } from "@/lib/dates";
import { FALLBACK, useProfile } from "@/lib/profile";
import { addItem, str, updateItem, useItems } from "@/lib/items";
import { useShared } from "@/lib/shared";
import { SURAHS, TOTAL_AYAHS } from "@/data/surahs";
import { LIBRARY, type LibraryTopic } from "@/data/library";
import { Board, DayNav, Empty, Form, ItemList, MonthGrid, PageHead, Section, Tag, monthStart, prettyDay, streaks, useDay } from "./kit";
import { useHideStreaks, StreakToggle } from "./privacy";

// ================= Salah =================
const STATUS: { k: PrayerStatus; label: string }[] = [
  { k: "ontime", label: "On time" }, { k: "late", label: "Late" }, { k: "qada", label: "Qada" }, { k: "missed", label: "Missed" },
];
const EXTRAS = [["witr", "Witr"], ["tahajjud", "Tahajjud"], ["sunnah", "Sunnah"]] as const;
const emptyDay = (date: string): SalahDay => ({ date, p: {}, x: {} });
const useSalahDay = (date: string) => useLiveQuery(async () => (await db.salah.get(date)) ?? emptyDay(date), [date]);

export function SalahLeft() {
  const [day, setDay] = useDay("salah");
  const d = useSalahDay(day);
  const { profile } = useProfile();
  const where = profile ?? FALLBACK;
  const P = useMemo(() => dayTimes(fromYmd(day), where.place, where.prayer), [day, where]);
  const set = async (name: string, s: PrayerStatus) => {
    const cur = (await db.salah.get(day)) ?? emptyDay(day);
    const p = { ...cur.p }; if (p[name] === s) delete p[name]; else p[name] = s;
    await db.salah.put({ ...cur, p });
  };
  const extra = async (k: (typeof EXTRAS)[number][0]) => {
    const cur = (await db.salah.get(day)) ?? emptyDay(day);
    await db.salah.put({ ...cur, x: { ...cur.x, [k]: !cur.x[k] } });
  };
  const n = FIVE.filter(k => isPrayed(d?.p[k])).length;
  return (
    <>
      <PageHead eyebrow="Deen · Salah" title="Salah" desc="Mark each prayer. Qada counts as prayed." />
      <DayNav day={day} setDay={setDay} />
      <ul className="s-list">
        {FIVE.map(k => (
          <li key={k} className="s-row">
            <div className="s-name"><b>{k}</b><small>{fmtMin(P[k])}</small></div>
            <div className="s-opts" role="radiogroup" aria-label={k}>
              {STATUS.map(s => <button key={s.k} role="radio" aria-checked={d?.p[k] === s.k} className={"s-opt " + s.k + (d?.p[k] === s.k ? " on" : "")} onClick={() => set(k, s.k)}>{s.label}</button>)}
            </div>
          </li>
        ))}
      </ul>
      <div className="s-extras">
        {EXTRAS.map(([k, label]) => <button key={k} role="checkbox" aria-checked={!!d?.x[k]} className={"k-chip" + (d?.x[k] ? " on" : "")} onClick={() => extra(k)}>{label}</button>)}
        <span className="s-count">{n}/5 prayed</span>
      </div>
    </>
  );
}

const HEAT = ["#F3E2C8", "#F2D27A", "#EDB55B", "#E39543", "#D97B33", "#C0601F"];
export function SalahRight() {
  const [day, setDay] = useDay("salah");
  const [month, setMonth] = useShared("salah:month", monthStart(todayStr()));
  const all = useLiveQuery(() => db.salah.toArray(), []);
  const hidden = useHideStreaks();
  const by = useMemo(() => new Map((all ?? []).map(d => [d.date, d])), [all]);
  const count = (d: string) => FIVE.filter(k => isPrayed(by.get(d)?.p[k])).length;
  const full = useMemo(() => new Set((all ?? []).filter(d => FIVE.every(k => isPrayed(d.p[k]))).map(d => d.date)), [all]);
  const { cur, best } = streaks(full);
  return (
    <>
      <Section title="This month" aside={<StreakToggle />}>
        <MonthGrid month={month} setMonth={setMonth} selected={day} onPick={d => d <= todayStr() && setDay(d)}
          paint={d => (by.has(d) ? HEAT[count(d)] : null)} label={d => `${prettyDay(d)}: ${count(d)} of 5`} />
        <div className="k-legend">{HEAT.map((c, i) => <span key={i}><i style={{ background: c }} />{i}</span>)}</div>
      </Section>
      {!hidden && <div className="k-stats">
        <div><b>{cur}</b><small>day streak, all five</small></div>
        <div><b>{best}</b><small>best streak</small></div>
      </div>}
      <p className="k-note">Tap a day to fill it in on the left.</p>
    </>
  );
}

// ================= Quran =================
type Verse = [string, string];
let quranCache: Promise<Verse[][]> | null = null;
/** The whole text, fetched once when a Quran page opens (public/quran/en.json, ~2 MB, cached for offline use). */
export function useQuran() {
  const [q, setQ] = useState<Verse[][] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    quranCache ??= fetch("quran/en.json").then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    quranCache.then(setQ, () => { quranCache = null; setErr(true); });
  }, []);
  return { q, err };
}
/** The ayah of the day: random but the same all day, skipping very short fragments. */
export function ayahOfDay(q: Verse[][], day: string): [number, number] {
  const flat: [number, number][] = [];
  q.forEach((s, si) => s.forEach((v, ai) => { if (v[1].length >= 70 && v[1].split(" ").length >= 12) flat.push([si + 1, ai + 1]); }));
  return flat[hash("ayah:" + day) % flat.length];
}

type Progress = Record<number, { done?: boolean; at?: number }>;
const QKEY = "deen:quran";
const useProgress = () => useLiveQuery(async () => ((await db.settings.get(QKEY))?.value as Progress) ?? {}, []);
async function setProgress(n: number, v: { done?: boolean; at?: number }) {
  const cur = ((await db.settings.get(QKEY))?.value as Progress) ?? {};
  await db.settings.put({ key: QKEY, value: { ...cur, [n]: { ...cur[n], ...v } } });
  await setReadToday();
}
/** A day counts toward the Quran streak when you update progress or write a reflection. */
async function setReadToday() {
  const t = todayStr();
  const has = await db.items.where("[tracker+kind+date]").equals(["deen", "read", t]).first();
  if (!has) await addItem("deen", "read", {}, { date: t });
}
const surahName = (n: number) => SURAHS[n - 1]?.[0] ?? `Surah ${n}`;

export function QuranLeft() {
  const { q, err } = useQuran();
  const today = todayStr();
  const ref = q ? ayahOfDay(q, today) : null;
  const refl = useItems("deen", "reflection");
  const mine = refl?.find(r => r.date === today && r.f.surah === ref?.[0] && r.f.ayah === ref?.[1]);
  return (
    <>
      <PageHead eyebrow="Deen · Quran" title="Ayah of the day" />
      {err && <Empty>Couldn’t load the Quran text. Check your connection once; after that it works offline.</Empty>}
      {!q && !err && <Empty>Opening the mushaf…</Empty>}
      {q && ref && <>
        <figure className="q-ayah">
          <p className="q-ar" lang="ar" dir="rtl">{q[ref[0] - 1][ref[1] - 1][0]}</p>
          <blockquote className="q-en">{q[ref[0] - 1][ref[1] - 1][1]}</blockquote>
          <figcaption>{surahName(ref[0])} · {ref[0]}:{ref[1]}</figcaption>
        </figure>
        <Section title="My reflection">
          <Form key={mine?.id ?? "new"} fields={[{ key: "text", label: "What does this ayah say to you today?", type: "textarea", rows: 3, required: true }]}
            initial={mine?.f} submit={mine ? "Update" : "Save reflection"} reset={!mine}
            onSubmit={async v => { if (mine) await updateItem(mine.id, v); else await addItem("deen", "reflection", { ...v, surah: ref[0], ayah: ref[1] }, { date: today }); await setReadToday(); }} />
        </Section>
      </>}
    </>
  );
}

export function QuranRight() {
  const prog = useProgress();
  const [find, setFind] = useState("");
  const read = SURAHS.reduce((a, s, i) => a + (prog?.[i + 1]?.done ? s[3] : Math.min(s[3], prog?.[i + 1]?.at ?? 0)), 0);
  const pct = (100 * read) / TOTAL_AYAHS;
  const f = find.trim().toLowerCase();
  return (
    <>
      <div className="q-total"><div className="q-bar"><i style={{ width: pct + "%" }} /></div><b>{pct.toFixed(1)}%</b><small>{read.toLocaleString()} of {TOTAL_AYAHS.toLocaleString()} ayahs</small></div>
      <input className="k-in" placeholder="Find a surah" aria-label="Find a surah" value={find} onChange={e => setFind(e.target.value)} />
      <ul className="q-surahs">
        {SURAHS.map((s, i) => [s, i + 1] as const).filter(([s, n]) => !f || String(n) === f || s[0].toLowerCase().includes(f) || s[1].toLowerCase().includes(f)).map(([s, n]) => {
          const p = prog?.[n] ?? {};
          return (
            <li key={n} className={p.done ? "done" : ""}>
              <input type="checkbox" checked={!!p.done} aria-label={`Finished ${s[0]}`} onChange={e => setProgress(n, { done: e.target.checked })} />
              <span className="q-n">{n}</span>
              <span className="q-name"><b>{s[0]}</b><small>{s[1]}</small></span>
              <label className="q-at">ayah <input type="number" min={0} max={s[3]} value={p.at ?? ""} placeholder="0" aria-label={`Current ayah in ${s[0]}`}
                onChange={e => setProgress(n, { at: Math.max(0, Math.min(s[3], Number(e.target.value) || 0)) })} /> / {s[3]}</label>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ================= Reflections =================
const REFL_FIELDS = [
  { key: "surah", label: "Surah", type: "select" as const, options: SURAHS.map((s, i) => `${i + 1}. ${s[0]}`), required: true },
  { key: "ayah", label: "Ayah", type: "number" as const },
  { key: "text", label: "Reflection", type: "textarea" as const, rows: 4, required: true },
];
const surahNo = (v: unknown) => (typeof v === "number" ? v : parseInt(str(v), 10) || 0);

export function ReflectionsLeft() {
  return (
    <>
      <PageHead eyebrow="Deen · Reflections" title="Reflections" desc="Write about any ayah. Reflections from the ayah of the day land here too." />
      <Form fields={REFL_FIELDS} submit="Save reflection"
        onSubmit={async v => { await addItem("deen", "reflection", { ...v, surah: surahNo(v.surah), ayah: Number(v.ayah) || undefined }, { date: todayStr() }); await setReadToday(); }} />
    </>
  );
}
export function ReflectionsRight() {
  const [q, setQ] = useShared("refl:q", "");
  const f = q.trim().toLowerCase();
  return (
    <>
      <input className="k-in" placeholder="Search by surah name or number" aria-label="Search reflections by surah" value={q} onChange={e => setQ(e.target.value)} />
      <ItemList tracker="deen" kind="reflection" fields={REFL_FIELDS} add="Add" empty={f ? "No reflections on that surah yet." : "Your reflections will show here, newest first."}
        filter={it => { if (!f) return true; const n = surahNo(it.f.surah); return String(n) === f || surahName(n).toLowerCase().includes(f); }}
        title={it => <>{surahName(surahNo(it.f.surah))}{it.f.ayah ? ` ${surahNo(it.f.surah)}:${it.f.ayah}` : ""}</>}
        meta={it => prettyDay(it.date)} body={it => <p className="k-text">{str(it.f.text)}</p>} />
    </>
  );
}

// ================= Library =================
const RESEARCH = ["To research", "Researching", "Done"];
const RESEARCH_FIELDS = [
  { key: "title", label: "Topic", required: true },
  { key: "category", label: "Category", type: "select" as const, options: LIBRARY.map(c => c.id) },
  { key: "notes", label: "Notes", type: "textarea" as const },
  { key: "sources", label: "Sources", type: "textarea" as const, rows: 2, placeholder: "Books, lectures, links" },
];
export function LibraryLeft() {
  const [cat, setCat] = useShared<string>("lib:cat", "");
  const [pick, setPick] = useState<LibraryTopic | null>(null);
  const [added, setAdded] = useState("");
  const roll = () => {
    const pool = LIBRARY.filter(c => !cat || c.id === cat).flatMap(c => c.topics.map(t => ({ cat: c.id, title: t })));
    setPick(pool[Math.floor(Math.random() * pool.length)]); setAdded("");
  };
  return (
    <>
      <PageHead eyebrow="Deen · Library" title="Give me a topic" desc="Titles only. Read about it from a trusted teacher or book." />
      <div className="k-chips">
        <button className={"k-chip" + (!cat ? " on" : "")} onClick={() => setCat("")}>Anything</button>
        {LIBRARY.map(c => <button key={c.id} className={"k-chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>{c.id}</button>)}
      </div>
      <div className="k-jar">
        <div className="k-jar-glass">{pick ? <><Tag tone="soft">{pick.cat}</Tag><b className="lib-t">{pick.title}</b></> : <span className="k-empty">Tap the button for a topic.</span>}</div>
        <div className="k-actions">
          <button className="k-btn" onClick={roll}>{pick ? "Another one" : "Give me a topic"}</button>
          {pick && <button className="k-btn ghost" disabled={added === pick.title}
            onClick={async () => { await addItem("deen", "research", { title: pick.title, category: pick.cat, status: RESEARCH[0] }); setAdded(pick.title); }}>{added === pick.title ? "Added ✓" : "Add to my research"}</button>}
        </div>
      </div>
    </>
  );
}
export function LibraryRight() {
  return (
    <>
      <h3 className="k-h3">My research</h3>
      <Board tracker="deen" kind="research" columns={RESEARCH} fields={RESEARCH_FIELDS} add="Add a topic"
        title={it => str(it.f.title)} meta={it => (it.f.category ? <Tag tone="soft">{str(it.f.category)}</Tag> : null)} />
    </>
  );
}
