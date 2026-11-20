"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, type Item } from "@/lib/db";
import { addItem, num, setDayItem, str, updateItem, useDayItem, useItems } from "@/lib/items";
import { addDays, todayStr } from "@/lib/dates";
import { useShared } from "@/lib/shared";
import { Board, Empty, Form, ItemList, MonthGrid, PageHead, Section, Tag, copyText, daysUntil, dueText, monthStart, prettyDay, streaks, type Field } from "./kit";
import { useHideStreaks } from "./privacy";

// ---------- task boards (Work board, Design Studio) ----------
const PRIORITY = ["Low", "Medium", "High"];
const taskFields: Field[] = [
  { key: "title", label: "Task", required: true }, { key: "client", label: "Client" }, { key: "deadline", label: "Deadline", type: "date" },
  { key: "priority", label: "Priority", type: "select", options: PRIORITY }, { key: "notes", label: "Notes", type: "textarea", rows: 2 },
];
const taskMeta = (it: Item, done: string) => (
  <>
    {it.f.client ? <Tag tone="soft">{str(it.f.client)}</Tag> : null}
    {it.f.priority === "High" && <Tag tone="warn">High</Tag>}
    {it.f.deadline && it.f.status !== done ? <Tag tone={daysUntil(str(it.f.deadline)) < 1 ? "warn" : undefined}>{dueText(str(it.f.deadline))}</Tag> : null}
  </>
);
function BoardSummary({ tracker, columns }: { tracker: string; columns: string[] }) {
  const all = useItems(tracker, "task");
  const done = columns[columns.length - 1];
  const soon = (all ?? []).filter(t => t.f.deadline && t.f.status !== done && daysUntil(str(t.f.deadline)) <= 7).sort((a, b) => str(a.f.deadline).localeCompare(str(b.f.deadline)));
  return (
    <>
      <div className="k-stats">{columns.map(c => <div key={c}><b>{(all ?? []).filter(t => (str(t.f.status) || columns[0]) === c).length}</b><small>{c.toLowerCase()}</small></div>)}</div>
      <Section title="Due soon">{soon.length ? <ul className="k-plain">{soon.map(t => <li key={t.id}><b>{str(t.f.title)}</b> <small>{dueText(str(t.f.deadline))}{t.f.client ? ` · ${str(t.f.client)}` : ""}</small></li>)}</ul> : <Empty>Nothing due in the next week.</Empty>}</Section>
    </>
  );
}
const TaskBoard = ({ tracker, columns }: { tracker: string; columns: string[] }) => (
  <Board tracker={tracker} kind="task" columns={columns} fields={taskFields} filterBy="client" add="Add a task"
    title={it => str(it.f.title)} meta={it => taskMeta(it, columns[columns.length - 1])} />
);

// ================= Work board =================
const WORK_COLS = ["To do", "Doing", "Done"];
export const WorkBoardLeft = () => <><PageHead eyebrow="Work board" title="This week’s work" desc="Any kind of freelance work. Drag cards or use the arrows." /><BoardSummary tracker="work" columns={WORK_COLS} /></>;
export const WorkBoardRight = () => <TaskBoard tracker="work" columns={WORK_COLS} />;
export const WorkClientsLeft = () => (
  <><PageHead eyebrow="Work board · Clients" title="Clients" />
    <ItemList tracker="work" kind="client" add="Add a client" empty="Add the people you work with."
      fields={[{ key: "name", label: "Name", required: true }, { key: "contact", label: "Contact" }, { key: "rate", label: "Rate" }, { key: "notes", label: "Notes", type: "textarea", rows: 2 }]}
      title={it => str(it.f.name)} meta={it => [it.f.contact, it.f.rate].filter(Boolean).map(str).join(" · ")} /></>
);
export function WorkClientsRight() {
  const all = useItems("work", "task");
  const open = (all ?? []).filter(t => t.f.deadline && t.f.status !== "Done").sort((a, b) => str(a.f.deadline).localeCompare(str(b.f.deadline)));
  return (
    <>
      <Section title="Deadlines">{open.length ? <ul className="k-plain">{open.map(t => <li key={t.id}><b>{str(t.f.title)}</b> <small>{prettyDay(str(t.f.deadline))} · {dueText(str(t.f.deadline))}{t.f.client ? ` · ${str(t.f.client)}` : ""}</small></li>)}</ul> : <Empty>Tasks with a deadline show here.</Empty>}</Section>
      <Section title="Invoices">
        <ItemList tracker="work" kind="invoice" add="Add an invoice" empty="Keep track of what you’re owed."
          fields={[{ key: "client", label: "Client", required: true }, { key: "amount", label: "Amount" }, { key: "due", label: "Due", type: "date" }, { key: "paid", label: "Paid?", type: "select", options: ["Not yet", "Paid"] }]}
          title={it => <>{str(it.f.client)} {it.f.amount ? `· ${str(it.f.amount)}` : ""}</>}
          meta={it => <>{it.f.paid === "Paid" ? <Tag tone="good">Paid</Tag> : it.f.due ? <Tag tone={daysUntil(str(it.f.due)) < 0 ? "warn" : undefined}>{dueText(str(it.f.due))}</Tag> : null}</>} />
      </Section>
    </>
  );
}

// ================= Design Studio =================
const DESIGN_COLS = ["To do", "Ongoing", "Done"];
export const DesignBoardLeft = () => <><PageHead eyebrow="Design Studio · Work board" title="Work board" desc="By client. Drag cards or use the arrows." /><BoardSummary tracker="design" columns={DESIGN_COLS} /></>;
export const DesignBoardRight = () => <TaskBoard tracker="design" columns={DESIGN_COLS} />;
const PROJECT_STATUS = ["Idea", "In progress", "In review", "Done"];
export function DesignProjectsLeft() {
  const all = useItems("design", "project");
  return (
    <><PageHead eyebrow="Design Studio · Projects" title="Projects" desc="One card per project, with its links and notes." />
      <div className="k-stats">{PROJECT_STATUS.map(s => <div key={s}><b>{(all ?? []).filter(p => p.f.status === s).length}</b><small>{s.toLowerCase()}</small></div>)}</div></>
  );
}
export const DesignProjectsRight = () => (
  <ItemList tracker="design" kind="project" add="Add a project" empty="Add your first project." defaults={{ status: "In progress" }}
    fields={[{ key: "name", label: "Project", required: true }, { key: "client", label: "Client" }, { key: "status", label: "Status", type: "select", options: PROJECT_STATUS, required: true }, { key: "links", label: "Links", type: "textarea", rows: 2, placeholder: "Figma, Drive, live site…" }, { key: "notes", label: "Notes", type: "textarea", rows: 3 }]}
    title={it => str(it.f.name)} meta={it => <>{it.f.status ? <Tag>{str(it.f.status)}</Tag> : null}{it.f.client ? <Tag tone="soft">{str(it.f.client)}</Tag> : null}</>}
    body={it => <>{it.f.links ? <p className="k-links">{str(it.f.links).split(/\s+/).filter(Boolean).map(l => /^https?:\/\//.test(l) ? <a key={l} href={l} target="_blank" rel="noreferrer">{l.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}</a> : <span key={l}>{l} </span>)}</p> : null}{it.f.notes ? <p className="k-text">{str(it.f.notes)}</p> : null}</>} />
);
export const PILLARS = ["Process", "Case studies", "Tools & tips", "Career", "Opinions", "Behind the scenes"];
export function DesignNotebookLeft() {
  const [pillar, setPillar] = useShared("nb:pillar", PILLARS[0]);
  return (
    <><PageHead eyebrow="Design Studio · Notebook" title="Notebook" desc="Notes by content pillar. Any of them can become a post." />
      <div className="k-chips">{PILLARS.map(p => <button key={p} className={"k-chip" + (p === pillar ? " on" : "")} onClick={() => setPillar(p)}>{p}</button>)}</div>
      <Form fields={[{ key: "text", label: `A note for ${pillar}`, type: "textarea", rows: 4, required: true }]} submit="Add note"
        onSubmit={v => addItem("design", "note", { ...v, pillar }, { date: todayStr() })} /></>
  );
}
export function DesignNotebookRight() {
  const [pillar] = useShared("nb:pillar", PILLARS[0]);
  const [sent, setSent] = useState<string[]>([]);
  return (
    <><h3 className="k-h3">{pillar}</h3>
      <ItemList tracker="design" kind="note" add="Add" empty="No notes for this pillar yet." filter={it => it.f.pillar === pillar}
        fields={[{ key: "text", label: "Note", type: "textarea", rows: 4, required: true }]} defaults={{ pillar }} dated
        title={it => <span className="k-text">{str(it.f.text)}</span>} meta={it => prettyDay(it.date)}
        actions={it => <button className="k-link" disabled={sent.includes(it.id)} onClick={async () => {
          const text = str(it.f.text);
          await addItem("content", "post", { title: text.split("\n")[0].slice(0, 70), text, status: "Idea", platform: "LinkedIn", from: pillar });
          setSent(s => [...s, it.id]);
        }}>{sent.includes(it.id) ? "In Content Studio ✓" : "Turn into a post →"}</button>} /></>
  );
}

// ================= Content Studio =================
export const PLATFORMS: Record<string, number> = { LinkedIn: 3000, Instagram: 2200, YouTube: 5000 };
const PIPE = ["Idea", "Drafting", "Ready", "Posted"];
const postFields: Field[] = [
  { key: "title", label: "Idea", required: true }, { key: "platform", label: "Platform", type: "select", options: Object.keys(PLATFORMS) },
  { key: "date", label: "Planned for", type: "date" }, { key: "status", label: "Stage", type: "select", options: PIPE, required: true },
];
export function ContentIdeasLeft() {
  const [, setOpen] = useShared<string | null>("post:open", null);
  return (
    <><PageHead eyebrow="Content Studio · Ideas" title="Idea bank" desc="LinkedIn, Instagram or YouTube. Draft any idea on the right." />
      <ItemList tracker="content" kind="post" add="Add an idea" empty="Ideas you jot down (or send from the Design notebook) land here."
        fields={postFields.filter(f => f.key !== "status")} defaults={{ status: "Idea", platform: "LinkedIn" }} filter={it => (str(it.f.status) || "Idea") === "Idea"}
        title={it => str(it.f.title)} meta={it => <>{it.f.platform ? <Tag tone="soft">{str(it.f.platform)}</Tag> : null}{it.f.from ? <Tag tone="soft">from {str(it.f.from)}</Tag> : null}</>}
        actions={it => <button className="k-link" onClick={async () => { await updateItem(it.id, { status: "Drafting" }); setOpen(it.id); }}>Draft it →</button>} /></>
  );
}
export function ContentIdeasRight() {
  const all = useItems("content", "post");
  const [open, setOpen] = useShared<string | null>("post:open", null);
  const drafts = (all ?? []).filter(p => p.f.status === "Drafting" || p.f.status === "Ready");
  const post = (all ?? []).find(p => p.id === open) ?? drafts[0];
  const [text, setText] = useState(""), [title, setTitle] = useState(""), [platform, setPlatform] = useState("LinkedIn");
  const [msg, setMsg] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setText(str(post?.f.text)); setTitle(str(post?.f.title)); setPlatform(str(post?.f.platform) || "LinkedIn"); setMsg(""); }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!post) return <Section title="Draft"><Empty>Pick an idea on the left and tap “Draft it”.</Empty></Section>;
  const limit = PLATFORMS[platform] ?? 3000, over = text.length > limit;
  const save = (extra: Record<string, unknown> = {}) => updateItem(post.id, { text, title, platform, ...extra });
  return (
    <div className="c-editor">
      {drafts.length > 1 && <label className="k-field"><span>Drafts</span><select className="k-in" value={post.id} onChange={e => { save(); setOpen(e.target.value); }}>{drafts.map(d => <option key={d.id} value={d.id}>{str(d.f.title) || "Untitled"}</option>)}</select></label>}
      <input className="k-in c-title" value={title} aria-label="Title" onChange={e => setTitle(e.target.value)} onBlur={() => save()} />
      <div className="k-chips">{Object.keys(PLATFORMS).map(p => <button key={p} className={"k-chip" + (p === platform ? " on" : "")} onClick={() => setPlatform(p)}>{p}</button>)}</div>
      <textarea ref={area} className="k-in c-text" rows={10} value={text} aria-label="Draft" placeholder="Write the post…" onChange={e => setText(e.target.value)} onBlur={() => save()} />
      <div className={"c-count" + (over ? " over" : "")}>{text.length.toLocaleString()} / {limit.toLocaleString()} characters{over ? ` · ${text.length - limit} over` : ""}</div>
      <div className="k-actions">
        <button className="k-btn" onClick={async () => { const ok = await copyText(text, area.current); setMsg(ok ? "Copied. Paste it into " + platform + "." : "Selected. Press Ctrl/Cmd + C to copy."); }}>Copy</button>
        <button className="k-btn ghost" onClick={async () => { await save({ status: "Ready" }); setMsg("Marked ready."); }}>Mark ready</button>
        <button className="k-btn ghost" onClick={async () => { await save({ status: "Posted", date: str(post.f.date) || todayStr() }); setMsg("Moved to posted."); }}>I posted it</button>
      </div>
      {msg && <p className="k-note" role="status">{msg}</p>}
    </div>
  );
}
export function ContentPipeLeft() {
  const all = useItems("content", "post");
  return <><PageHead eyebrow="Content Studio · Pipeline" title="Pipeline" desc="Idea → Drafting → Ready → Posted. Nothing is posted for you." />
    <div className="k-stats">{PIPE.map(s => <div key={s}><b>{(all ?? []).filter(p => (str(p.f.status) || "Idea") === s).length}</b><small>{s.toLowerCase()}</small></div>)}</div></>;
}
export const ContentPipeRight = () => (
  <Board tracker="content" kind="post" columns={PIPE} fields={postFields} add="Add an idea" filterBy="platform"
    title={it => str(it.f.title) || "Untitled"} meta={it => <>{it.f.platform ? <Tag tone="soft">{str(it.f.platform)}</Tag> : null}{it.f.date ? <Tag>{prettyDay(str(it.f.date))}</Tag> : null}</>} />
);
export function ContentCalLeft() {
  const all = useItems("content", "post");
  const [day, setDay] = useShared("post:day", todayStr());
  const [month, setMonth] = useShared("post:month", monthStart(todayStr()));
  const dated = useMemo(() => new Set((all ?? []).map(p => str(p.f.date)).filter(Boolean)), [all]);
  return <><PageHead eyebrow="Content Studio · Calendar" title="Posting calendar" /><MonthGrid month={month} setMonth={setMonth} selected={day} onPick={setDay} paint={d => (dated.has(d) ? "#F2D27A" : null)} /></>;
}
export function ContentCalRight() {
  const all = useItems("content", "post");
  const [day] = useShared("post:day", todayStr());
  const onDay = (all ?? []).filter(p => p.f.date === day), loose = (all ?? []).filter(p => !p.f.date && p.f.status !== "Posted");
  const row = (p: Item, withDate: boolean) => (
    <li key={p.id} className="k-row"><div className="k-row-main"><div className="k-row-t">{str(p.f.title) || "Untitled"}</div><div className="k-row-m"><Tag tone="soft">{str(p.f.platform) || "—"}</Tag><Tag>{str(p.f.status) || "Idea"}</Tag></div></div>
      {withDate && <div className="k-row-a"><input type="date" className="k-in sm" aria-label={`Plan ${str(p.f.title)} for`} onChange={e => e.target.value && updateItem(p.id, { date: e.target.value })} /></div>}</li>
  );
  return <><Section title={prettyDay(day)}>{onDay.length ? <ul className="k-rows">{onDay.map(p => row(p, false))}</ul> : <Empty>Nothing planned that day.</Empty>}</Section>
    <Section title="Not scheduled yet">{loose.length ? <ul className="k-rows">{loose.map(p => row(p, true))}</ul> : <Empty>Everything has a date.</Empty>}</Section></>;
}

// ================= Code corner =================
const CODE_STATUS = ["Idea", "Building", "Shipped", "Paused"];
export function CodeProjectsLeft() {
  const all = useItems("code", "project");
  const building = (all ?? []).filter(p => p.f.status === "Building");
  return <><PageHead eyebrow="Code corner · Projects" title="Side projects" desc="What you’re building and the next step on each." />
    <Section title="Next steps">{building.length ? <ul className="k-plain">{building.map(p => <li key={p.id}><b>{str(p.f.name)}</b> <small>{str(p.f.next) || "no next step yet"}</small></li>)}</ul> : <Empty>Projects you’re building show their next step here.</Empty>}</Section></>;
}
export const CodeProjectsRight = () => (
  <ItemList tracker="code" kind="project" add="Add a project" empty="Add a project you’re building or dreaming about." defaults={{ status: "Building" }}
    fields={[{ key: "name", label: "Project", required: true }, { key: "status", label: "Status", type: "select", options: CODE_STATUS, required: true }, { key: "stack", label: "Stack" }, { key: "next", label: "Next step" }, { key: "link", label: "Link", type: "url" }]}
    title={it => str(it.f.name)} meta={it => <>{it.f.status ? <Tag>{str(it.f.status)}</Tag> : null}{it.f.stack ? <Tag tone="soft">{str(it.f.stack)}</Tag> : null}</>}
    body={it => <>{it.f.next ? <p className="k-text">Next: {str(it.f.next)}</p> : null}{it.f.link ? <p className="k-links"><a href={str(it.f.link)} target="_blank" rel="noreferrer">{str(it.f.link).replace(/^https?:\/\//, "")}</a></p> : null}</>} />
);
export const CodeLearnLeft = () => (
  <><PageHead eyebrow="Code corner · Learning" title="Learning list" />
    <ItemList tracker="code" kind="learn" add="Add something to learn" empty="Courses, docs, talks…" defaults={{ status: "To learn" }}
      fields={[{ key: "title", label: "What", required: true }, { key: "link", label: "Link", type: "url" }, { key: "status", label: "Status", type: "select", options: ["To learn", "Learning", "Done"], required: true }]}
      title={it => str(it.f.title)} meta={it => <Tag tone={it.f.status === "Done" ? "good" : undefined}>{str(it.f.status)}</Tag>}
      body={it => (it.f.link ? <p className="k-links"><a href={str(it.f.link)} target="_blank" rel="noreferrer">{str(it.f.link).replace(/^https?:\/\//, "").slice(0, 48)}</a></p> : null)} /></>
);
export const CodeLearnRight = () => (
  <><h3 className="k-h3">Snippets</h3>
    <ItemList tracker="code" kind="snippet" add="Add a snippet" empty="Bits of code worth keeping."
      fields={[{ key: "title", label: "Title", required: true }, { key: "lang", label: "Language" }, { key: "code", label: "Code", type: "textarea", rows: 5 }]}
      title={it => str(it.f.title)} meta={it => (it.f.lang ? <Tag tone="soft">{str(it.f.lang)}</Tag> : null)} body={it => (it.f.code ? <pre className="k-code">{str(it.f.code)}</pre> : null)} /></>
);
export const CodeLogLeft = () => (
  <><PageHead eyebrow="Code corner · Ship log" title="What did you ship?" desc="Small wins count." />
    <Form fields={[{ key: "what", label: "Shipped", required: true }, { key: "project", label: "Project" }]} submit="Log it" onSubmit={v => addItem("code", "ship", v, { date: todayStr() })} /></>
);
export const CodeLogRight = () => (
  <ItemList tracker="code" kind="ship" add="Log something" dated empty="Your ship log starts with the first thing you finish."
    fields={[{ key: "what", label: "Shipped", required: true }, { key: "project", label: "Project" }]}
    title={it => str(it.f.what)} meta={it => <>{prettyDay(it.date)}{it.f.project ? <> · {str(it.f.project)}</> : null}</>} />
);

// ================= Writer's nook =================
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
export function WriterDraftsLeft() {
  const [, setOpen] = useShared<string | null>("piece:open", null);
  return (
    <><PageHead eyebrow="Writer’s nook · Drafts" title="Pieces" />
      <ItemList tracker="writer" kind="piece" add="Start a piece" empty="Start a piece and write it on the right." defaults={{ status: "Drafting" }}
        fields={[{ key: "title", label: "Title", required: true }, { key: "type", label: "Kind", type: "select", options: ["Essay", "Story", "Poem", "Article", "Other"] }, { key: "status", label: "Status", type: "select", options: ["Drafting", "Editing", "Finished"], required: true }]}
        title={it => str(it.f.title)} meta={it => <>{it.f.type ? <Tag tone="soft">{str(it.f.type)}</Tag> : null}<Tag>{str(it.f.status)}</Tag><small>{words(str(it.f.text)).toLocaleString()} words</small></>}
        actions={it => <button className="k-link" onClick={() => setOpen(it.id)}>Open →</button>} /></>
  );
}
export function WriterDraftsRight() {
  const all = useItems("writer", "piece");
  const [open] = useShared<string | null>("piece:open", null);
  const piece = (all ?? []).find(p => p.id === open) ?? (all ?? [])[0];
  const [text, setText] = useState("");
  const base = useRef(0);
  useEffect(() => { setText(str(piece?.f.text)); base.current = words(str(piece?.f.text)); }, [piece?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!piece) return <Section title="Editor"><Empty>Start a piece on the left.</Empty></Section>;
  const save = async () => {
    await updateItem(piece.id, { text });
    const gained = words(text) - base.current; base.current = words(text);
    if (gained > 0) { const t = todayStr(); const cur = await db.items.where("[tracker+kind+date]").equals(["writer", "words", t]).first(); await setDayItem("writer", "words", t, { n: num(cur?.f.n) + gained }); }
  };
  return (
    <div className="c-editor">
      <h3 className="k-h3">{str(piece.f.title)}</h3>
      <textarea className="k-in w-text" rows={16} value={text} aria-label={`Text of ${str(piece.f.title)}`} placeholder="Begin anywhere." onChange={e => setText(e.target.value)} onBlur={save} />
      <div className="c-count">{words(text).toLocaleString()} words · saved when you click away</div>
    </div>
  );
}
export const WriterIdeasLeft = () => <><PageHead eyebrow="Writer’s nook · Ideas" title="Ideas" desc="Lines, titles and what-ifs." /><Form fields={[{ key: "text", label: "An idea", type: "textarea", rows: 3, required: true }]} submit="Keep it" onSubmit={v => addItem("writer", "idea", v, { date: todayStr() })} /></>;
export const WriterIdeasRight = () => <ItemList tracker="writer" kind="idea" dated add="Add" empty="Ideas you keep land here." fields={[{ key: "text", label: "Idea", type: "textarea", rows: 3, required: true }]} title={it => <span className="k-text">{str(it.f.text)}</span>} meta={it => prettyDay(it.date)} />;
export function WriterWordsLeft() {
  const t = todayStr();
  const it = useDayItem("writer", "words", t);
  const all = useItems("writer", "words");
  const hidden = useHideStreaks();
  const { cur, best } = streaks(new Set((all ?? []).filter(d => num(d.f.n) > 0).map(d => d.date!)));
  const [n, setN] = useState("");
  return (
    <><PageHead eyebrow="Writer’s nook · Word count" title="Words today" desc="Words you add in the editor count automatically. You can also log words written elsewhere." />
      <div className="k-big">{num(it?.f.n).toLocaleString()}<small>words today</small></div>
      <form className="k-inline" onSubmit={e => { e.preventDefault(); const v = parseInt(n, 10); if (v > 0) { setDayItem("writer", "words", t, { n: num(it?.f.n) + v }); setN(""); } }}>
        <input className="k-in" inputMode="numeric" placeholder="Add words" aria-label="Words to add" value={n} onChange={e => setN(e.target.value)} /><button className="k-btn">Add</button>
      </form>
      {!hidden && <div className="k-stats"><div><b>{cur}</b><small>day streak</small></div><div><b>{best}</b><small>best streak</small></div></div>}</>
  );
}
export function WriterWordsRight() {
  const all = useItems("writer", "words");
  const by = new Map((all ?? []).map(d => [d.date!, num(d.f.n)]));
  const days = Array.from({ length: 30 }, (_, i) => addDays(todayStr(), i - 29));
  const max = Math.max(500, ...days.map(d => by.get(d) ?? 0));
  return <Section title="Last 30 days"><div className="m-bars thin">{days.map(d => <div key={d} title={`${prettyDay(d)}: ${by.get(d) ?? 0} words`}><i style={{ height: `${((by.get(d) ?? 0) / max) * 100}%`, background: "#E9A23B" }} /><small>{d.slice(8) === "01" || d === days[0] ? Number(d.slice(8)) : ""}</small></div>)}</div>
    <p className="k-note">Total: {[...by.values()].reduce((a, b) => a + b, 0).toLocaleString()} words.</p></Section>;
}
