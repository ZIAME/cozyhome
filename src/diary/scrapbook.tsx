"use client";
/**
 * The scrapbook: a free two-page spread in the Hobbies diary. Place images from the inspiration board, write text,
 * stick notes and washi tape anywhere; drag to move, the corner handle to resize, the top handle to rotate.
 * Each spread is one record (hobbies/spread) holding its elements; positions are % of the page, so a spread looks
 * the same on a phone and a laptop.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { db, type Item } from "@/lib/db";
import { addItem, str, updateItem, useItems } from "@/lib/items";
import { useShared } from "@/lib/shared";
import { todayStr } from "@/lib/dates";
import { Photo } from "./mind";

export type ElType = "image" | "text" | "note" | "washi";
export type Font = "hand" | "round" | "clean" | "arabic";
export type Pattern = "stripes" | "dots" | "grid" | "plain";
export type El = {
  id: string; type: ElType; side: "left" | "right";
  /** Centre, in % of the page's width and height. */
  x: number; y: number;
  /** Width in % of the page's width (washi height too). */
  w: number; h?: number;
  rot: number; z: number;
  src?: string; text?: string; font?: Font; size?: number; color?: string; pattern?: Pattern;
};

const INK = ["#3A2316", "#D2692A", "#B5521C", "#E9A23B", "#6E7A2A", "#5B87A6", "#A0457A"];
const PAPER = ["#F2D27A", "#F4C2B5", "#CFD8A8", "#BFD7E6", "#FFF1D6"];
const TAPE = ["#E9A23B", "#E8A091", "#B7BE76", "#9CC3D5", "#D2692A", "#C9A0B4"];
const FONTS: Record<Font, { label: string; family: string }> = {
  hand: { label: "Handwritten", family: "var(--font-hand), 'Caveat', cursive" },
  round: { label: "Bubbly", family: "var(--font-fredoka), 'Fredoka', sans-serif" },
  clean: { label: "Clean", family: "var(--font-nunito), 'Nunito', sans-serif" },
  arabic: { label: "Arabic", family: "var(--font-amiri), 'Amiri', serif" },
};
/** Washi tape prints, drawn in white over the tape colour. */
const PATTERNS: Record<Pattern, React.CSSProperties> = {
  stripes: { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 1.1cqw, transparent 1.1cqw 2.2cqw)" },
  dots: { backgroundImage: "radial-gradient(rgba(255,255,255,.7) 24%, transparent 27%)", backgroundSize: "2.2cqw 2.2cqw" },
  grid: { backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "1.8cqw 1.8cqw" },
  plain: {},
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const newId = () => Math.random().toString(36).slice(2, 10);

// ---------- data ----------
function useSpreads() {
  const all = useItems("hobbies", "spread");
  return useMemo(() => (all ? [...all].sort((a, b) => a.created - b.created) : undefined), [all]);
}
function useCurrent() {
  const spreads = useSpreads();
  const [id, setId] = useShared<string | null>("scrap:spread", null);
  const cur = spreads?.find(s => s.id === id) ?? spreads?.[spreads.length - 1];
  return { spreads, cur, setId };
}
const elsOf = (s?: Item | null) => (Array.isArray(s?.f.elements) ? (s!.f.elements as El[]) : []);
async function change(spreadId: string, fn: (els: El[]) => El[]) {
  const s = await db.items.get(spreadId);
  if (s) await updateItem(spreadId, { elements: fn(elsOf(s)) });
}
export async function newSpread() {
  return addItem("hobbies", "spread", { elements: [] }, { date: todayStr() });
}
/** Add an element to a spread (made if there's none yet). Returns the element's id. */
export async function addElement(spreadId: string | null, el: Omit<El, "id" | "z">) {
  const id = newId();
  let sid = spreadId;
  if (!sid) sid = (await newSpread()).id;
  await change(sid, els => [...els, { ...el, id, z: Math.max(0, ...els.map(e => e.z)) + 1 }]);
  return { id, spreadId: sid };
}

// ---------- one page of the spread ----------
function Canvas({ side }: { side: "left" | "right" }) {
  const { cur } = useCurrent();
  const inspo = useItems("hobbies", "inspo");
  const [sel, setSel] = useShared<string | null>("scrap:sel", null);
  const [live, setLive] = useState<{ id: string; patch: Partial<El> } | null>(null);
  const dragging = useRef(false);
  const page = useRef<HTMLDivElement>(null);
  // once the saved spread changes after a drag, drop the live preview
  useEffect(() => { if (!dragging.current) setLive(null); }, [cur?.updated]);
  const blobs = useMemo(() => new Map((inspo ?? []).map(i => [i.id, i.blob])), [inspo]);
  const els = elsOf(cur).filter(e => e.side === side).map(e => (live?.id === e.id ? { ...e, ...live.patch } : e)).sort((a, b) => a.z - b.z);

  const drag = (ev: React.PointerEvent, el: El, kind: "move" | "resize" | "rotate") => {
    if (!cur || !page.current) return;
    ev.stopPropagation(); ev.preventDefault(); setSel(el.id);
    const r = page.current.getBoundingClientRect();
    const cx = r.left + (el.x / 100) * r.width, cy = r.top + (el.y / 100) * r.height;
    const d0 = Math.hypot(ev.clientX - cx, ev.clientY - cy) || 1;
    const start = { px: ev.clientX, py: ev.clientY };
    let patch: Partial<El> = {};
    dragging.current = true;
    const move = (e: PointerEvent) => {
      if (kind === "move") patch = { x: clamp(el.x + ((e.clientX - start.px) / r.width) * 100, 2, 98), y: clamp(el.y + ((e.clientY - start.py) / r.height) * 100, 2, 98) };
      else if (kind === "resize") { const k = Math.hypot(e.clientX - cx, e.clientY - cy) / d0; patch = { w: clamp(el.w * k, 5, 100), ...(el.h ? { h: clamp(el.h * k, 1.5, 30) } : {}) }; }
      else patch = { rot: Math.round(Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90) };
      setLive({ id: el.id, patch });
    };
    const up = () => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); dragging.current = false;
      if (Object.keys(patch).length) change(cur.id, all => all.map(x => (x.id === el.id ? { ...x, ...patch } : x))); else setLive(null);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  };

  return (
    <div className={"sb-page " + side} ref={page} onPointerDown={() => setSel(null)} aria-label={`Scrapbook, ${side} page`}>
      {!cur && side === "right" && <p className="sb-hint">Add a photo, some words, a sticky note or washi tape with the tools on the left page.</p>}
      {els.map(el => (
        <div key={el.id} className={`sb-el sb-${el.type}` + (sel === el.id ? " sel" : "")} onPointerDown={e => drag(e, el, "move")}
          style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, zIndex: el.z, transform: `translate(-50%,-50%) rotate(${el.rot}deg)`, ...elStyle(el) }}>
          {el.type === "image" && (blobs.get(el.src ?? "") ? <Photo blob={blobs.get(el.src!)} alt="Scrapbook photo" /> : <span className="sb-missing">Image removed</span>)}
          {(el.type === "text" || el.type === "note") && <span className="sb-text">{el.text || (el.type === "note" ? "A note…" : "Your words")}</span>}
          {sel === el.id && <>
            <span className="sb-h rot" title="Rotate" onPointerDown={e => drag(e, el, "rotate")} />
            <span className="sb-h size" title="Resize" onPointerDown={e => drag(e, el, "resize")} />
          </>}
        </div>
      ))}
    </div>
  );
}
function elStyle(el: El): React.CSSProperties {
  if (el.type === "text") return { color: el.color ?? INK[0], fontFamily: FONTS[el.font ?? "hand"].family, fontSize: `${el.size ?? 5}cqw` };
  if (el.type === "note") return { background: el.color ?? PAPER[0], fontFamily: FONTS[el.font ?? "hand"].family, fontSize: `${el.size ?? 3.6}cqw` };
  if (el.type === "washi") return { height: `${el.h ?? 5}cqw`, ["--tape" as string]: el.color ?? TAPE[0], ...PATTERNS[el.pattern ?? "stripes"] } as React.CSSProperties;
  return {};
}

// ---------- tools ----------
function Tools() {
  const { spreads, cur, setId } = useCurrent();
  const inspo = useItems("hobbies", "inspo");
  const [sel, setSel] = useShared<string | null>("scrap:sel", null);
  const [picker, setPicker] = useState(false);
  const el = elsOf(cur).find(e => e.id === sel);
  const n = spreads?.length ?? 0, i = cur ? spreads!.indexOf(cur) : -1;

  // new things land a little scattered, so they don't stack exactly on top of each other
  const scatter = () => ({ x: 28 + Math.random() * 44, y: 22 + Math.random() * 46 });
  const add = async (e: Omit<El, "id" | "z">) => { const r = await addElement(cur?.id ?? null, { ...e, ...scatter() }); setId(r.spreadId); setSel(r.id); };
  const patch = (p: Partial<El>) => { if (cur && el) change(cur.id, all => all.map(x => (x.id === el.id ? { ...x, ...p } : x))); };
  const remove = () => { if (cur && el) { change(cur.id, all => all.filter(x => x.id !== el.id)); setSel(null); } };
  const zs = elsOf(cur).map(e => e.z);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!el || t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(); }
      const step = e.shiftKey ? 5 : 1, d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (d[e.key]) { e.preventDefault(); patch({ x: clamp(el.x + d[e.key][0], 2, 98), y: clamp(el.y + d[e.key][1], 2, 98) }); }
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  });

  return (
    <div className="sb-tools" onPointerDown={e => e.stopPropagation()}>
      <div className="sb-row">
        <button className="sb-tool" onClick={() => add({ type: "text", side: "left", x: 50, y: 30, w: 60, rot: 0, text: "", font: "hand", size: 5, color: INK[0] })}>Aa Text</button>
        <button className="sb-tool" onClick={() => add({ type: "note", side: "left", x: 50, y: 40, w: 32, rot: -3, text: "", font: "hand", color: PAPER[0] })}>Sticky note</button>
        <button className="sb-tool" onClick={() => add({ type: "washi", side: "left", x: 50, y: 20, w: 45, h: 5, rot: -8, color: TAPE[0], pattern: "stripes" })}>Washi tape</button>
        <button className="sb-tool" aria-expanded={picker} onClick={() => setPicker(p => !p)}>Photo</button>
        <span className="sb-spread">
          <button className="k-arrow" aria-label="Previous spread" disabled={i <= 0} onClick={() => { setId(spreads![i - 1].id); setSel(null); }}>‹</button>
          <small>{n ? `${i + 1} of ${n}` : "new"}</small>
          <button className="k-arrow" aria-label="Next spread" disabled={i < 0 || i >= n - 1} onClick={() => { setId(spreads![i + 1].id); setSel(null); }}>›</button>
          <button className="k-link" onClick={async () => { const s = await newSpread(); setId(s.id); setSel(null); }}>+ New spread</button>
        </span>
      </div>
      {picker && (
        <div className="sb-picker">
          {(inspo ?? []).map(im => (
            <button key={im.id} className="sb-thumb" aria-label={`Add ${str(im.f.note) || "image"}`} onClick={() => { setPicker(false); add({ type: "image", side: "left", x: 50, y: 50, w: 46, rot: (Math.random() * 8 - 4) | 0, src: im.id }); }}>
              <Photo blob={im.blob} alt={str(im.f.note) || "Inspiration image"} />
            </button>
          ))}
          <label className="sb-thumb up">+ Upload<input type="file" accept="image/*" hidden onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            const im = await addItem("hobbies", "inspo", { note: "" }, { date: todayStr(), blob: f });
            setPicker(false); add({ type: "image", side: "left", x: 50, y: 50, w: 46, rot: 0, src: im.id });
          }} /></label>
        </div>
      )}
      {el && (
        <div className="sb-row sb-edit">
          {(el.type === "text" || el.type === "note") && <>
            <textarea className="k-in sb-words" rows={2} value={el.text ?? ""} placeholder="Write here…" aria-label="Text" onChange={e => patch({ text: e.target.value })} />
            <select className="k-in sm" value={el.font ?? "hand"} aria-label="Font" onChange={e => patch({ font: e.target.value as Font })}>
              {(Object.keys(FONTS) as Font[]).map(f => <option key={f} value={f}>{FONTS[f].label}</option>)}
            </select>
            <span className="sb-step"><button aria-label="Smaller text" onClick={() => patch({ size: clamp((el.size ?? 5) - 0.5, 2, 14) })}>A−</button><button aria-label="Bigger text" onClick={() => patch({ size: clamp((el.size ?? 5) + 0.5, 2, 14) })}>A+</button></span>
          </>}
          {el.type !== "image" && (
            <span className="sb-swatches" role="radiogroup" aria-label="Colour">
              {(el.type === "text" ? INK : el.type === "note" ? PAPER : TAPE).map(c => <button key={c} role="radio" aria-checked={el.color === c} aria-label={c} style={{ background: c }} className={el.color === c ? "on" : ""} onClick={() => patch({ color: c })} />)}
            </span>
          )}
          {el.type === "washi" && (
            <select className="k-in sm" value={el.pattern ?? "stripes"} aria-label="Pattern" onChange={e => patch({ pattern: e.target.value as Pattern })}>
              <option value="stripes">Stripes</option><option value="dots">Dots</option><option value="grid">Grid</option><option value="plain">Plain</option>
            </select>
          )}
          <span className="sb-step">
            <button aria-label="Rotate left" onClick={() => patch({ rot: el.rot - 10 })}>⟲</button>
            <button aria-label="Rotate right" onClick={() => patch({ rot: el.rot + 10 })}>⟳</button>
            <button aria-label="Bring to front" onClick={() => patch({ z: Math.max(...zs) + 1 })}>Front</button>
            <button aria-label="Send to back" onClick={() => patch({ z: Math.min(...zs) - 1 })}>Back</button>
            <button onClick={() => patch({ side: el.side === "left" ? "right" : "left" })}>To {el.side === "left" ? "right" : "left"} page</button>
          </span>
          <button className="k-link danger" onClick={remove}>Remove</button>
        </div>
      )}
    </div>
  );
}

export function ScrapLeft() {
  return <><Canvas side="left" /><Tools /></>;
}
export function ScrapRight() {
  return <Canvas side="right" />;
}
