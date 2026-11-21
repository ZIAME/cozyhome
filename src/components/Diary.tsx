"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SECTIONS } from "@/data/sections";
import { PAGES } from "@/pages-registry";
import { useMedia } from "@/hooks/useMedia";
import { useShared } from "@/lib/shared";
import { STICKERS } from "./Stickers";
import { HomeIcon } from "./Icons";

const TAB_COLORS = ["#F2B866", "#E58A4E", "#B7BE76", "#E8A091", "#D9B07C", "#F2D27A", "#C9A0B4", "#9CC3B8"];
const FLIP_MS = 850;

function Placeholder({ sec, i, side }: { sec: string; i: number; side: "left" | "right" }) {
  const S = SECTIONS[sec], tab = S.tabs[i];
  const d = new Date();
  if (side === "left") return (
    <>
      <div className="p-eye">{S.title} · {i + 1} of {S.tabs.length}</div>
      <h2 className="p-title">{tab.label}</h2><p className="p-desc">{tab.desc}</p>
      <div className="p-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString("en-GB", { weekday: "long", month: "long" })}</span></div>
      <div className="p-sticker">{STICKERS[S.sticker]}</div>
    </>
  );
  return (
    <>
      <span className="washi" />
      <div className="slots">{tab.blocks.map(([t, sub], k) => <div className="slot" key={k}><i>{["✿", "❀", "✦"][k % 3]}</i><div>{t}{sub && <em>{sub}</em>}</div></div>)}</div>
      <div className="soon">being built</div>
    </>
  );
}

function PageSide({ sec, i, side }: { sec: string; i: number; side: "left" | "right" }) {
  const tab = SECTIONS[sec].tabs[i];
  const Real = PAGES[sec]?.[tab.id]?.[side];
  return Real ? <Real /> : <Placeholder sec={sec} i={i} side={side} />;
}

type Target = { sec: string; tab?: string } | null;

/** The diary every room opens into: a leather cover that swings open, tabs down the side, and pages that flip. */
export function Diary({ target, onClosed }: { target: Target; onClosed: () => void }) {
  const [sec, setSec] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"" | "show" | "open" | "opened">("");
  const [flip, setFlip] = useState<{ from: number; to: number; fromHalf: 0 | 1 } | null>(null);
  /** Phones show one side of the spread at a time: 0 = left page, 1 = right page. */
  const [half, setHalf] = useState<0 | 1>(0);
  const single = useMedia("(max-width:760px)");
  const busy = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    const S = SECTIONS[target.sec];
    setSec(target.sec); setHalf(0); setIdx(Math.max(0, S.tabs.findIndex(t => t.id === target.tab)));
    setPhase("show"); busy.current = true;
    const a = setTimeout(() => setPhase("open"), 300);
    const b = setTimeout(() => { setPhase("opened"); busy.current = false; tabsRef.current?.querySelector<HTMLButtonElement>(".tab.on")?.focus({ preventScroll: true }); }, 1350);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [target]);

  const close = useCallback(() => {
    if (busy.current) return; busy.current = true;
    setPhase("open");
    requestAnimationFrame(() => setPhase("show"));
    setTimeout(() => { setPhase(""); busy.current = false; setSec(null); onClosed(); }, 1000);
  }, [onClosed]);

  /** Turn to another tab. On phones it opens on its left page (or its right page when going back by swipe). */
  const goto = useCallback((i: number, toHalf: 0 | 1 = 0) => {
    if (busy.current || !sec || i === idx) return;
    busy.current = true; setFlip({ from: idx, to: i, fromHalf: half }); setIdx(i); setHalf(toHalf);
    setTimeout(() => { setFlip(null); busy.current = false; }, FLIP_MS + 20);
  }, [sec, idx, half]);

  // on phones, a page can ask to show the other side (e.g. tapping a day in a calendar opens it on the left)
  const [showSide, setShowSide] = useShared<null | "left" | "right">("diary:side", null);
  useEffect(() => { if (!showSide) return; setHalf(showSide === "left" ? 0 : 1); setShowSide(null); }, [showSide, setShowSide]);

  // a page can ask the diary to turn to another tab (e.g. saving an image turns to the scrapbook)
  const [turnTo, setTurnTo] = useShared<string | null>("diary:goto", null);
  useEffect(() => {
    if (!turnTo || !sec) return;
    const i = SECTIONS[sec].tabs.findIndex(t => t.id === turnTo);
    setTurnTo(null);
    if (i >= 0) goto(i);
  }, [turnTo, sec, goto, setTurnTo]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && phase === "opened") close(); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [phase, close]);

  // swipe between tabs on phones
  const x0 = useRef<number | null>(null);
  if (!sec) return <div id="diary" aria-hidden="true" />;
  const S = SECTIONS[sec], n = S.tabs.length;
  const fwd = flip ? flip.to > flip.from : true;
  const cls = ["show", "open", "opened"].slice(0, ["", "show", "open", "opened"].indexOf(phase)).join(" ");

  let left: React.ReactNode, right: React.ReactNode, leaf: React.ReactNode = null;
  const sideOf = (h: 0 | 1) => (h ? "right" : "left") as "left" | "right";
  if (single) {
    left = null;
    // during a tab turn, the page underneath is the one being revealed
    right = flip && !fwd ? <PageSide sec={sec} i={flip.from} side={sideOf(flip.fromHalf)} />
      : <div key={`${idx}-${half}`} className="half-in"><PageSide sec={sec} i={idx} side={sideOf(half)} /></div>;
    if (flip) leaf = (
      <div className={"leaf " + (fwd ? "fwd" : "bwd")} style={{ ["--fd" as string]: FLIP_MS + "ms" }}>
        <div className="face front"><div className={"pin" + (fwd ? (flip.fromHalf ? " lined" : "") : half ? " lined" : "")}>
          {fwd ? <PageSide sec={sec} i={flip.from} side={sideOf(flip.fromHalf)} /> : <PageSide sec={sec} i={flip.to} side={sideOf(half)} />}
        </div></div>
        {fwd && <div className="face back"><div className="pin" /></div>}
      </div>
    );
  } else {
    const L = flip ? (fwd ? flip.from : flip.to) : idx, R = flip ? (fwd ? flip.to : flip.from) : idx;
    left = <PageSide sec={sec} i={L} side="left" />;
    right = <PageSide sec={sec} i={R} side="right" />;
    if (flip) leaf = (
      <div className={"leaf " + (fwd ? "fwd" : "bwd")} style={{ ["--fd" as string]: FLIP_MS + "ms" }}>
        <div className="face front"><div className={"pin" + (fwd ? " lined" : "")}><PageSide sec={sec} i={flip.from} side={fwd ? "right" : "left"} /></div></div>
        <div className="face back"><div className={"pin" + (fwd ? "" : " lined")}><PageSide sec={sec} i={flip.to} side={fwd ? "left" : "right"} /></div></div>
      </div>
    );
  }

  return (
    <div id="diary" className={cls} aria-hidden={!phase}>
      <button className="d-home" onClick={close}><HomeIcon />Home</button>
      <div className="d-title">{S.title}<small>{S.sub}</small></div>
      <div className="book"
        onTouchStart={e => { x0.current = (e.target as Element).closest(".k-board, input, textarea, select, .i-board") ? null : e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (x0.current == null) return; const dx = e.changedTouches[0].clientX - x0.current; x0.current = null;
          if (Math.abs(dx) < 60) return;
          if (!single) { goto(dx < 0 ? Math.min(n - 1, idx + 1) : Math.max(0, idx - 1)); return; }
          // phones read like a book: left page, right page, then the next tab
          if (dx < 0) { if (half === 0) setHalf(1); else if (idx < n - 1) goto(idx + 1, 0); }
          else { if (half === 1) setHalf(0); else if (idx > 0) goto(idx - 1, 1); }
        }}>
        <div className="board" />
        <div className="page left"><div className="pin" id="pL">{left}</div></div>
        <div className="page right"><div className={"pin" + (!single || half === 1 ? " lined" : "")} id="pR">{right}</div></div>
        <div className="rings" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>
        <div className="tabs" role="tablist" ref={tabsRef}
          onKeyDown={e => {
            if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); goto(Math.min(n - 1, idx + 1)); }
            if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); goto(Math.max(0, idx - 1)); }
          }}>
          {S.tabs.map((t, i) => (
            <button key={t.id} className={"tab" + (i === idx ? " on" : "")} role="tab" aria-selected={i === idx} style={{ ["--tc" as string]: TAB_COLORS[i % TAB_COLORS.length] }} onClick={() => goto(i)}>{t.label}</button>
          ))}
        </div>
        <div className="cover">
          <div className="face front"><div className="plate"><b>{S.title}</b><small>{S.sub}</small></div><div className="clasp" /></div>
          <div className="face back"><div className="pin">{!single && <PageSide sec={sec} i={idx} side="left" />}</div></div>
        </div>
        {leaf}
      </div>
      {single && phase === "opened" && (
        <nav className="half-nav" aria-label="Pages">
          <button aria-label="Left page" disabled={half === 0} onClick={() => setHalf(0)}>‹</button>
          <span aria-live="polite">{half === 0 ? "Left page" : "Right page"} · {half + 1} of 2</span>
          <button aria-label="Right page" disabled={half === 1} onClick={() => setHalf(1)}>›</button>
        </nav>
      )}
    </div>
  );
}
