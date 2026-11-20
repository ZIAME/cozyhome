"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NextTask } from "@/lib/due";

/**
 * The room cat. An orange tabby that wanders the open floor, sits now and then to tell you your next task,
 * and opens that task when tapped. At night it sleeps on the rug. It lives inside the room SVG (so it zooms and
 * takes on the night tint with the room); its speech bubble is HTML, placed over it.
 */
type Pt = [number, number];
/**
 * Open floor in the cabin, in room SVG units: in front of the furniture so the cat never walks through it,
 * and off the rug, so it never sits or sleeps on a prayer mat.
 */
const SPOTS: Pt[] = [[118, 372], [160, 398], [198, 425], [262, 446], [305, 432], [350, 412], [392, 392]];
const BED: Pt = [148, 386]; // in front of the sofa
const SPEED = 14; // units per second
const ORANGE = "#E8862E", STRIPE = "#C0621C", CREAM = "#FFE7C4", PINK = "#E8A091", INK = "#3A2316";

type Mode = "sit" | "walk" | "sleep";
type Props = {
  stage: React.RefObject<HTMLDivElement | null>;
  /** Hidden while arranging or while the room builds itself. */
  hidden: boolean;
  night: boolean;
  next: NextTask;
  /** Where the speech bubble's "clear day" line sends you (the planner, or the drawer). */
  onOpen: (task: NextTask) => void;
};

function Walking() {
  return (
    <g className="cat-walk">
      <path className="cat-tail" d="M-10 -9 C -16 -10 -18 -16 -15 -21" stroke={ORANGE} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <g className="cat-legs-b"><rect x="-9.5" y="-6" width="2.6" height="6" rx="1.2" fill={STRIPE} /><rect x="6" y="-6" width="2.6" height="6" rx="1.2" fill={STRIPE} /></g>
      <ellipse cx="0" cy="-8.5" rx="11.5" ry="5.6" fill={ORANGE} />
      <ellipse cx="2" cy="-6" rx="7" ry="2.6" fill={CREAM} opacity=".8" />
      <path d="M-6 -13.6 q1 3 0 5.4 M-2 -14 q1 3 0 5.6 M2 -13.8 q1 3 0 5.2" stroke={STRIPE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <g className="cat-legs-a"><rect x="-6.5" y="-6" width="2.6" height="6" rx="1.2" fill={ORANGE} /><rect x="9" y="-6" width="2.6" height="6" rx="1.2" fill={ORANGE} /></g>
      <Head x={11} y={-13} />
    </g>
  );
}
function Sitting() {
  return (
    <g>
      <path className="cat-tail" d="M-5 -1.2 C 2 1.5 9 1.2 11 -1.5" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="-2.5" cy="-4.5" rx="7" ry="4.5" fill={ORANGE} />
      <ellipse cx="1" cy="-9" rx="6" ry="7.8" fill={ORANGE} />
      <ellipse cx="3" cy="-8" rx="3" ry="5" fill={CREAM} />
      <path d="M-4.5 -12 q2 1 1 4 M-2 -14 q2 1 1.5 4" stroke={STRIPE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <rect x="1.6" y="-6" width="2.4" height="6" rx="1.2" fill={ORANGE} /><rect x="4.4" y="-6" width="2.4" height="6" rx="1.2" fill={ORANGE} />
      <Head x={3.5} y={-18} />
    </g>
  );
}
function Sleeping() {
  return (
    <g>
      <ellipse cx="0" cy="-4.6" rx="11" ry="5" fill={ORANGE} />
      <path d="M-7 -8.6 q1.5 2.6 0 4.6 M-3 -9.4 q1.5 2.8 0 5 M1 -9.4 q1.5 2.8 0 5" stroke={STRIPE} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M-10 -2.5 C -6 1 6 1 10 -1.5" stroke={STRIPE} strokeWidth="3" strokeLinecap="round" fill="none" />
      <g transform="translate(7 -6)">
        <circle r="4.6" fill={ORANGE} />
        <path d="M-3.6 -2.4 L-3 -7 L-0.6 -3.8 Z M0.8 -4 L3.4 -6.8 L3.8 -2.2 Z" fill={ORANGE} />
        <path d="M-2.8 -0.4 q1 .8 2 0 M0.8 -0.6 q1 .8 2 0" stroke={INK} strokeWidth=".7" fill="none" strokeLinecap="round" />
        <circle cx="0.4" cy="1.6" r=".7" fill={PINK} />
      </g>
      <g className="cat-z" fill={CREAM} fontFamily="Fredoka, sans-serif" fontWeight="700"><text x="10" y="-14" fontSize="5">z</text><text x="14" y="-20" fontSize="4">z</text></g>
    </g>
  );
}
function Head({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4.4 -2.6 L-3.6 -8.4 L-0.4 -4.4 Z M1 -4.6 L4.2 -8.2 L4.6 -2.4 Z" fill={ORANGE} />
      <path d="M-3.4 -3.6 L-3 -6.6 L-1.4 -4.6 Z M1.8 -4.6 L3.6 -6.6 L3.8 -3.4 Z" fill={PINK} />
      <circle r="5.2" fill={ORANGE} />
      <path d="M-1.6 -4.9 q.6 1.6 0 2.6 M1 -5 q.6 1.6 0 2.6" stroke={STRIPE} strokeWidth="1" fill="none" strokeLinecap="round" />
      <ellipse cx="2.6" cy="1.6" rx="2.8" ry="2" fill={CREAM} />
      <circle cx="3.2" cy="0.6" r=".75" fill={PINK} />
      <g className="cat-eyes"><ellipse cx="0.8" cy="-1" rx=".8" ry="1.1" fill={INK} /><ellipse cx="3.8" cy="-1.1" rx=".75" ry="1.05" fill={INK} /></g>
      <path d="M4.6 1.8 l3 -.6 M4.6 2.6 l3 .4" stroke={CREAM} strokeWidth=".4" strokeLinecap="round" />
    </g>
  );
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function Cat({ stage, hidden, night, next, onOpen }: Props) {
  const [layer, setLayer] = useState<SVGGElement | null>(null);
  const [pos, setPos] = useState<Pt>(SPOTS[1]);
  const [dur, setDur] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [mode, setMode] = useState<Mode>("sit");
  const [say, setSay] = useState(false);
  const [bubbleAt, setBubbleAt] = useState<{ x: number; y: number } | null>(null);
  const cat = useRef<SVGGElement>(null);
  const armed = useRef(false);

  // a layer in the room SVG, under the light overlay so the night tint falls on the cat too
  useEffect(() => {
    const svg = stage.current?.querySelector<SVGSVGElement>("#room");
    if (!svg) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", "catLayer");
    svg.insertBefore(g, svg.querySelector("#lightLayer"));
    setLayer(g);
    return () => { g.remove(); };
  }, [stage]);

  const at = useRef<Pt>(SPOTS[1]);
  const arrive = useRef<Mode>("sit");
  /** Walk to a point, then sit (or sleep). With reduced motion the cat just appears there. */
  const walkTo = useCallback((to: Pt, then: Mode) => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = still ? 0 : dist(at.current, to);
    setDir(to[0] >= at.current[0] ? 1 : -1); setDur(d / SPEED); setSay(false);
    at.current = to; arrive.current = then; setPos(to); setMode("walk");
  }, []);

  // sit a while, sometimes say the next task, wander somewhere else. At night: go to the rug and sleep.
  useEffect(() => {
    if (hidden) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    if (mode === "walk") later(() => setMode(arrive.current), dur * 1000 + 30);
    else if (night && mode !== "sleep") walkTo(BED, "sleep");
    else if (!night && mode === "sleep") setMode("sit");
    else if (mode === "sit" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (Math.random() < 0.55) { later(() => setSay(true), 700); later(() => setSay(false), 6200); }
      later(() => walkTo(pick(SPOTS.filter(p => dist(p, at.current) > 30)), "sit"), 7000 + Math.random() * 7000);
    }
    return () => timers.forEach(clearTimeout);
  }, [mode, night, hidden, dur, walkTo]);

  // keep the bubble over the cat while it shows
  useEffect(() => {
    if (!say || hidden) { setBubbleAt(null); return; }
    let raf = 0;
    const tick = () => {
      const s = stage.current?.getBoundingClientRect(), c = cat.current?.getBoundingClientRect();
      if (s && c) setBubbleAt({ x: c.left + c.width / 2 - s.left, y: c.top - s.top });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [say, hidden, stage]);

  useEffect(() => {
    if (!say) return;
    const away = (e: Event) => { if (!(e.target as Element).closest?.("#cat, .cat-bubble")) { setSay(false); armed.current = false; } };
    document.addEventListener("click", away);
    return () => document.removeEventListener("click", away);
  }, [say]);

  const tap = () => {
    // first tap (or a tap while it's quiet) says the task; a tap while it's talking opens it
    if (say && (armed.current || !matchMedia("(hover:none)").matches)) { setSay(false); armed.current = false; onOpen(next); return; }
    setSay(true); armed.current = true;
  };
  const line = mode === "sleep" ? "Zzz… see you after Fajr." : next ? next.title : "Your day is clear. Plan something?";
  const sub = mode === "sleep" ? "" : next ? `${next.from} · ${next.note}` : "";

  if (!layer) return null;
  return <>
    {createPortal(
      <g id="cat" ref={cat} className={"cat " + mode + (hidden ? " gone" : "")} role="button" tabIndex={hidden ? -1 : 0}
        aria-label={next ? `Cat: your next task is ${next.title}. Open it.` : "Cat: your day is clear."}
        style={{ transform: `translate(${pos[0]}px, ${pos[1]}px)`, transition: mode === "walk" ? `transform ${dur}s linear` : "none" }}
        onClick={e => { e.stopPropagation(); tap(); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(next); } }}
        onPointerEnter={e => { if (e.pointerType !== "touch") setSay(true); }} onPointerLeave={e => { if (e.pointerType !== "touch") setSay(false); }}>
        <ellipse cx="0" cy="0" rx="11" ry="2.8" fill="#3A2316" opacity=".18" />
        <g style={{ transform: `scale(${0.95 * dir}, 0.95)` }}>{mode === "walk" ? <Walking /> : mode === "sleep" ? <Sleeping /> : <Sitting />}</g>
      </g>, layer)}
    <div className={"cat-bubble" + (bubbleAt ? " show" : "")} style={bubbleAt ? { left: bubbleAt.x, top: bubbleAt.y } : undefined} role="status" aria-live="polite"
      onClick={() => { if (mode !== "sleep") { setSay(false); onOpen(next); } }}>
      <b>{line}</b>{sub && <small>{sub}</small>}{mode !== "sleep" && <span className="go">{next ? "Tap to open →" : "Open the planner →"}</span>}
    </div>
  </>;
}
