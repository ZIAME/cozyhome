"use client";
import { useEffect, useMemo, useState } from "react";
import type { Item } from "@/lib/db";
import { addItem, num, removeItem, setDayItem, str, updateItem, useDayItem, useItems } from "@/lib/items";
import { addDays, fromYmd, todayStr, ymd } from "@/lib/dates";
import { useShared } from "@/lib/shared";
import { DayNav, DeleteButton, Empty, Jar, MonthGrid, PageHead, Section, Tag, monthStart, prettyDay, streaks, useDay } from "./kit";
import { useHideStreaks } from "./privacy";

// ---------- mood scale (shared by Journal and Mood) ----------
export const MOODS = [
  { v: 1, label: "Rough", c: "#A894B0" }, { v: 2, label: "Low", c: "#E8A091" }, { v: 3, label: "Okay", c: "#F2D27A" },
  { v: 4, label: "Good", c: "#E9A23B" }, { v: 5, label: "Great", c: "#D2692A" },
];
export const moodColour = (v: unknown) => MOODS.find(m => m.v === v)?.c ?? null;
export function MoodScale({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="m-scale" role="radiogroup" aria-label="Mood">
      {MOODS.map(m => (
        <button key={m.v} role="radio" aria-checked={value === m.v} className={"m-pick" + (value === m.v ? " on" : "")} style={{ ["--mc" as string]: m.c }} onClick={() => onChange(m.v)}>
          <i aria-hidden="true" />{m.label}
        </button>
      ))}
    </div>
  );
}

/** Shows a stored photo (a Blob) and frees it afterwards. */
export function Photo({ blob, alt }: { blob?: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (!blob) { setUrl(null); return; } const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="k-photo" src={url} alt={alt} /> : null;
}

// ================= Journal =================
const PROMPTS: Record<string, string[]> = {
  "Random & fun": ["If today had a soundtrack, what would be on it?", "What would you do with a free, empty Saturday?", "Describe your perfect cup of tea or coffee.", "What’s a small thing you’d like to get better at?", "Which room in a house is the best room, and why?", "What did you notice today that nobody else did?", "If you could learn any skill overnight, what would it be?"],
  Gratitude: ["Who made your day easier recently?", "What’s something you use every day that you’re thankful for?", "What went better than expected this week?", "Write about a place that feels like home.", "What’s a kindness you received that you still remember?", "What made you smile today?"],
  "Self-reflection": ["What’s taking up most of your head space right now?", "What did you learn about yourself this month?", "When did you feel most like yourself this week?", "What are you avoiding, and why?", "What would you tell yourself a year ago?", "What does a good day look like for you?"],
  Deen: ["Which ayah or hadith stayed with you this week?", "What’s one sunnah you’d like to bring into your days?", "How did your salah feel today?", "What dua have you been making lately?", "Where did you see Allah’s mercy today?", "What’s one habit that brings you closer to Allah?"],
  "Creative & work": ["What’s a project you’d start if nothing could go wrong?", "Which piece of your work are you proudest of, and why?", "What inspired you today?", "What’s a problem at work you keep thinking about?", "Describe your ideal workday from start to finish.", "What did you make or ship this week?"],
};
export function JournalWriteLeft() {
  const [cat, setCat] = useShared("j:cat", "Random & fun");
  const [prompt, setPrompt] = useShared("j:prompt", "");
  const roll = () => { const a = PROMPTS[cat].filter(p => p !== prompt); setPrompt(a[Math.floor(Math.random() * a.length)]); };
  return (
    <>
      <PageHead eyebrow="Journal · Write" title="Need a nudge?" desc="Pick a kind of prompt. It shows above today’s entry." />
      <div className="k-chips">{Object.keys(PROMPTS).map(c => <button key={c} className={"k-chip" + (c === cat ? " on" : "")} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="k-jar"><div className="k-jar-glass">{prompt ? <b className="lib-t">{prompt}</b> : <span className="k-empty">Tap for a prompt.</span>}</div>
        <div className="k-actions"><button className="k-btn" onClick={roll}>{prompt ? "Another" : "Give me a prompt"}</button>{prompt && <button className="k-btn ghost" onClick={() => setPrompt("")}>Clear</button>}</div></div>
    </>
  );
}

/** One entry per day: mood, words, tags and a photo. */
export function EntryEditor({ day }: { day: string }) {
  const entry = useDayItem("journal", "entry", day);
  const [prompt] = useShared("j:prompt", "");
  const [mood, setMood] = useState<number | undefined>();
  const [text, setText] = useState(""), [tags, setTags] = useState(""), [photo, setPhoto] = useState<Blob | undefined>();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (entry === undefined) return;
    setMood(entry ? num(entry.f.mood) || undefined : undefined); setText(entry ? str(entry.f.text) : "");
    setTags(entry && Array.isArray(entry.f.tags) ? (entry.f.tags as string[]).join(", ") : ""); setPhoto(entry?.blob); setSaved(false);
  }, [entry, day]);
  const save = async () => {
    const f = { mood, text, tags: tags.split(",").map(s => s.trim()).filter(Boolean), prompt: entry?.f.prompt ?? (prompt || undefined) };
    if (entry) await updateItem(entry.id, f, { blob: photo }); else await addItem("journal", "entry", f, { date: day, blob: photo });
    setSaved(true);
  };
  return (
    <div className="j-entry">
      {(prompt || entry?.f.prompt) ? <p className="j-prompt">{str(entry?.f.prompt) || prompt}</p> : null}
      <MoodScale value={mood} onChange={v => { setMood(v); setSaved(false); }} />
      <textarea className="k-in j-text" rows={7} placeholder="Write a little…" aria-label="Journal entry" value={text} onChange={e => { setText(e.target.value); setSaved(false); }} />
      <input className="k-in" placeholder="Tags, comma separated" aria-label="Tags" value={tags} onChange={e => { setTags(e.target.value); setSaved(false); }} />
      <div className="j-photo">
        <Photo blob={photo} alt="Photo for this day" />
        <label className="k-link">{photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setSaved(false); } }} /></label>
        {photo && <button className="k-link" onClick={() => { setPhoto(undefined); setSaved(false); }}>Remove photo</button>}
      </div>
      <div className="k-actions"><button className="k-btn" onClick={save} disabled={!text.trim() && !mood}>{saved ? "Saved ✓" : entry ? "Save changes" : "Save entry"}</button>
        {entry && <DeleteButton onDelete={() => removeItem(entry.id)} label="Delete entry" />}</div>
    </div>
  );
}
export function JournalWriteRight() {
  const [day, setDay] = useDay("journal");
  return <><DayNav day={day} setDay={setDay} /><EntryEditor day={day} /></>;
}

function EntryView({ it, empty }: { it: Item | null | undefined; empty: string }) {
  if (it === undefined) return null;
  if (!it) return <Empty>{empty}</Empty>;
  const m = MOODS.find(x => x.v === it.f.mood);
  return (
    <article className="j-view">
      <div className="j-view-h"><b>{prettyDay(it.date)}</b>{m && <Tag><i className="dot" style={{ background: m.c }} />{m.label}</Tag>}</div>
      {it.f.prompt ? <p className="j-prompt">{str(it.f.prompt)}</p> : null}
      <p className="k-text">{str(it.f.text)}</p>
      <Photo blob={it.blob} alt={`Photo from ${prettyDay(it.date)}`} />
      {Array.isArray(it.f.tags) && it.f.tags.length > 0 && <div className="k-chips">{(it.f.tags as string[]).map(t => <Tag key={t} tone="soft">#{t}</Tag>)}</div>}
    </article>
  );
}
export function JournalCalLeft() {
  const [day, setDay] = useDay("journal");
  const [month, setMonth] = useShared("j:month", monthStart(todayStr()));
  const all = useItems("journal", "entry");
  const hidden = useHideStreaks();
  const by = useMemo(() => new Map((all ?? []).map(e => [e.date!, e])), [all]);
  const { cur } = streaks(new Set(by.keys()));
  return (
    <>
      <PageHead eyebrow="Journal · Calendar" title="Your days" desc="Coloured by mood. Tap a day to read it." />
      <MonthGrid month={month} setMonth={setMonth} selected={day} onPick={setDay} paint={d => (by.has(d) ? moodColour(by.get(d)!.f.mood) ?? "#EBD3B0" : null)} />
      <div className="k-legend">{MOODS.map(m => <span key={m.v}><i style={{ background: m.c }} />{m.label}</span>)}</div>
      {!hidden && <p className="k-note">{cur ? `${cur}-day writing streak.` : "Write today to start a streak."}</p>}
    </>
  );
}
export function JournalCalRight() {
  const [day] = useDay("journal");
  const it = useDayItem("journal", "entry", day);
  return <EntryView it={it} empty={`Nothing written on ${prettyDay(day)}.`} />;
}
const monthAgo = (d: string) => { const x = fromYmd(d); x.setMonth(x.getMonth() - 1); return ymd(x); };
const yearAgo = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
export function OnThisDayLeft() {
  const it = useDayItem("journal", "entry", monthAgo(todayStr()));
  return <><PageHead eyebrow="Journal · On this day" title="A month ago" /><EntryView it={it} empty="You didn’t write a month ago today. Something to look back on next month." /></>;
}
export function OnThisDayRight() {
  const it = useDayItem("journal", "entry", yearAgo(todayStr()));
  return <><h3 className="k-h3">A year ago</h3><EntryView it={it} empty="No entry from a year ago today." /></>;
}

// ================= Mood =================
export function MoodCheckLeft() {
  const [day, setDay] = useDay("mood");
  const it = useDayItem("mood", "checkin", day);
  const [note, setNote] = useState("");
  useEffect(() => { setNote(it ? str(it.f.note) : ""); }, [it]);
  return (
    <>
      <PageHead eyebrow="Mood · Check in" title="How are you?" />
      <DayNav day={day} setDay={setDay} />
      <MoodScale value={it ? num(it.f.mood) : undefined} onChange={v => setDayItem("mood", "checkin", day, { mood: v })} />
      <label className="k-field wide"><span>A line about why</span>
        <textarea className="k-in" rows={3} value={note} onChange={e => setNote(e.target.value)} onBlur={() => it || note ? setDayItem("mood", "checkin", day, { note }) : null} placeholder="Slept well, finished the logo…" /></label>
    </>
  );
}
export function MoodCheckRight() {
  const all = useItems("mood", "checkin");
  const by = useMemo(() => new Map((all ?? []).map(e => [e.date!, e])), [all]);
  const t = todayStr();
  const week = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  return (
    <Section title="Last two weeks">
      <div className="m-strip">{week.map(d => { const m = MOODS.find(x => x.v === by.get(d)?.f.mood); return <div key={d} title={`${prettyDay(d)}${m ? ": " + m.label : ""}`}><i style={{ height: m ? `${m.v * 20}%` : "6%", background: m?.c ?? "#EBD3B0" }} /><small>{fromYmd(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</small></div>; })}</div>
      <ul className="k-rows">{(all ?? []).slice(0, 6).filter(e => e.f.note).map(e => <li key={e.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{MOODS.find(m => m.v === e.f.mood)?.label ?? "—"}</div><div className="k-row-m">{prettyDay(e.date)}</div><p className="k-text">{str(e.f.note)}</p></div></li>)}</ul>
    </Section>
  );
}
export function MoodMonthLeft() {
  const [day, setDay] = useDay("mood");
  const [month, setMonth] = useShared("mood:month", monthStart(todayStr()));
  const all = useItems("mood", "checkin");
  const by = useMemo(() => new Map((all ?? []).map(e => [e.date!, e])), [all]);
  return <><PageHead eyebrow="Mood · Month" title="The month in colour" /><MonthGrid month={month} setMonth={setMonth} selected={day} onPick={setDay} paint={d => moodColour(by.get(d)?.f.mood)} />
    <div className="k-legend">{MOODS.map(m => <span key={m.v}><i style={{ background: m.c }} />{m.label}</span>)}</div></>;
}
export function MoodMonthRight() {
  const [day] = useDay("mood");
  const it = useDayItem("mood", "checkin", day);
  const m = MOODS.find(x => x.v === it?.f.mood);
  return <Section title={prettyDay(day)}>{it ? <><Tag><i className="dot" style={{ background: m?.c }} />{m?.label ?? "No mood"}</Tag><p className="k-text">{str(it.f.note) || "No note."}</p></> : <Empty>No check-in that day.</Empty>}</Section>;
}
export function MoodPatternsLeft() {
  const all = useItems("mood", "checkin");
  const avg = useMemo(() => {
    const s = Array(7).fill(0), n = Array(7).fill(0);
    for (const e of all ?? []) { const v = num(e.f.mood); if (!v || !e.date) continue; const w = (fromYmd(e.date).getDay() + 6) % 7; s[w] += v; n[w]++; }
    return s.map((x, i) => (n[i] ? x / n[i] : 0));
  }, [all]);
  return (
    <>
      <PageHead eyebrow="Mood · Patterns" title="Your week, on average" desc="Average mood by day of the week." />
      <div className="m-bars">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <div key={d}><i style={{ height: `${(avg[i] / 5) * 100}%`, background: moodColour(Math.round(avg[i])) ?? "#EBD3B0" }} /><small>{d}</small></div>)}</div>
      {(all?.length ?? 0) < 7 && <p className="k-note">Patterns get clearer after a couple of weeks of check-ins.</p>}
    </>
  );
}
export function MoodPatternsRight() {
  const all = useItems("mood", "checkin");
  const lifts = (all ?? []).filter(e => num(e.f.mood) >= 4 && e.f.note).slice(0, 6), weighs = (all ?? []).filter(e => num(e.f.mood) <= 2 && e.f.note).slice(0, 6);
  const list = (a: Item[], empty: string) => a.length ? <ul className="k-plain">{a.map(e => <li key={e.id}>{str(e.f.note)} <small>{prettyDay(e.date)}</small></li>)}</ul> : <Empty>{empty}</Empty>;
  return <><Section title="What lifts you">{list(lifts, "Notes from your good days show here.")}</Section><Section title="What weighs">{list(weighs, "Notes from harder days show here.")}</Section></>;
}

// ================= Gratitude =================
export function GratitudeTodayLeft() {
  const [day, setDay] = useDay("gratitude");
  const it = useDayItem("gratitude", "day", day);
  const [v, setV] = useState(["", "", ""]);
  useEffect(() => { setV(it && Array.isArray(it.f.things) ? [0, 1, 2].map(i => str((it.f.things as string[])[i])) : ["", "", ""]); }, [it]);
  const save = () => setDayItem("gratitude", "day", day, { things: v.map(s => s.trim()) });
  return (
    <>
      <PageHead eyebrow="Gratitude · Today" title="Three good things" />
      <DayNav day={day} setDay={setDay} />
      <ol className="g-three">{v.map((x, i) => <li key={i}><input className="k-in" value={x} aria-label={`Good thing ${i + 1}`} placeholder={["The first good thing…", "Another one…", "And one more…"][i]}
        onChange={e => setV(p => p.map((y, j) => (j === i ? e.target.value : y)))} onBlur={save} /></li>)}</ol>
      <p className="k-note">Saved as you go.</p>
    </>
  );
}
export function GratitudeTodayRight() {
  const all = useItems("gratitude", "day");
  const days = (all ?? []).filter(d => Array.isArray(d.f.things) && (d.f.things as string[]).some(Boolean));
  return <Section title="Before">{days.length ? <ul className="k-rows">{days.slice(0, 12).map(d => <li key={d.id} className="k-row"><div className="k-row-main"><div className="k-row-m">{prettyDay(d.date)}</div><ul className="k-plain">{(d.f.things as string[]).filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}</ul></div></li>)}</ul> : <Empty>Your good things will collect here.</Empty>}</Section>;
}
/** Every good thing ever written, as separate slips. */
function useSlips() {
  const all = useItems("gratitude", "day");
  return useMemo(() => (all ?? []).flatMap(d => (Array.isArray(d.f.things) ? (d.f.things as string[]) : []).filter(Boolean).map((t, i) => ({ ...d, id: `${d.id}-${i}`, f: { text: t } }))), [all]);
}
export function GratitudeJarLeft() {
  const slips = useSlips();
  return <><PageHead eyebrow="Gratitude · The jar" title="The jar" desc="Pull out something you were grateful for." />
    <Jar items={slips} empty="The jar fills as you write three good things." render={it => <><b className="lib-t">{str(it.f.text)}</b><small>{prettyDay(it.date)}</small></>} /></>;
}
export function GratitudeJarRight() {
  const slips = useSlips();
  return <Section title={`All of them · ${slips.length}`}>{slips.length ? <ul className="k-plain">{slips.map(s => <li key={s.id}>{str(s.f.text)} <small>{prettyDay(s.date)}</small></li>)}</ul> : <Empty>Nothing in the jar yet.</Empty>}</Section>;
}

