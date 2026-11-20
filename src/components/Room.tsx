"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Theme } from "@/room/theme";
import type { Layout } from "@/room/layout";
import { TRACKER } from "@/room/catalogue";
import { drawProp, ghost, tintId } from "@/room/props";
import type { SkyState } from "@/lib/sky";
import type { DayTimes } from "@/lib/prayer";
import type { FocusView } from "@/hooks/useFocus";

export type RoomLabel = { title: string; sub: string };
type Props = {
  theme: Theme; layout: Layout; arranging: boolean;
  sky: SkyState; P: DayTimes; min: number;
  prayedDots: boolean[];
  focus: FocusView;
  /** Label for a spot id (a theme spot or a fixed object). */
  label: (spot: string) => RoomLabel;
  onEnter: (spot: string) => void;
  zoomSpot: string | null; zoomFade: boolean;
};

const sl = (x: number) => (x - 153.5) * 0.5774; // slant of the window glass

function windowSky(min: number, P: DayTimes, sky: SkyState) {
  const day = min >= P.Sunrise - 20 && min <= P.Maghrib + 15;
  let s = "";
  if (day) {
    const t = Math.min(1, Math.max(0, (min - P.Sunrise) / (P.Maghrib - P.Sunrise)));
    const x = 162 + 50 * t, y = 183 - 36 * Math.sin(Math.PI * t) - sl(x);
    s += `<circle cx="${x}" cy="${y}" r="14" fill="#FFD36B" opacity=".25"/><circle cx="${x}" cy="${y}" r="7.5" fill="#FFD36B"/>`;
    const cx = 158 + ((min / 3) % 60), op = (sky.c * 0.85).toFixed(2);
    s += `<ellipse cx="${cx}" cy="${152 - sl(cx)}" rx="9" ry="3" fill="#fff" opacity="${op}"/><ellipse cx="${cx + 5}" cy="${150.5 - sl(cx + 5)}" rx="5" ry="3" fill="#fff" opacity="${op}"/>`;
  } else {
    const mx = 200, my = 152 - sl(200);
    s += `<circle cx="${mx}" cy="${my}" r="10" fill="#FFF3D2" opacity=".18"/><circle cx="${mx}" cy="${my}" r="6" fill="#FFF3D2"/><circle cx="${mx + 2.6}" cy="${my - 1.8}" r="5.2" fill="${sky.wt}"/>`;
    [[160, 170], [168, 150], [178, 162], [186, 146], [214, 160], [218, 170], [192, 172], [208, 146], [172, 176]].forEach(([x, v], i) => {
      s += `<circle cx="${x}" cy="${v - sl(x)}" r="${i % 3 ? 0.6 : 0.95}" fill="#FFF3D6" opacity="${(0.4 + 0.6 * sky.s).toFixed(2)}"/>`;
    });
  }
  return s;
}


const SPARK = (x: number, y: number, spot: string, i: number) =>
  `<path class="spark" data-spot="${spot}" style="animation-delay:${(i * 0.37) % 2.8}s" d="M${x} ${y - 4.5}Q${x + 0.6} ${y - 0.6} ${x + 4.5} ${y}Q${x + 0.6} ${y + 0.6} ${x} ${y + 4.5}Q${x - 0.6} ${y + 0.6} ${x - 4.5} ${y}Q${x - 0.6} ${y - 0.6} ${x} ${y - 4.5}Z" fill="#FFE2A3"/>`;
const BADGE = (x: number, y: number, spot: string, colour: string | null) =>
  `<g class="badge" data-spot="${spot}" transform="translate(${x} ${y})"><circle r="5.2" fill="${colour ?? "#FFF6E8"}" stroke="#3A2316" stroke-width="1"/>` +
  (colour ? `<path d="M-2.2 1.6l3.6-3.6 1 1-3.6 3.6h-1z" fill="#3A2316"/>` : `<path d="M-2.4 0h4.8M0 -2.4v4.8" stroke="#3A2316" stroke-width="1.3" stroke-linecap="round"/>`) + `</g>`;

/**
 * The isometric room. Each spot shows the art's own object, or another tracker's object drawn in its colours.
 * Every object in the room lifts, glows and shows a label; the screens, window, lamps and clock are live.
 * In arrange mode every spot is clickable and shows a badge (+ when empty).
 */
export function Room({ theme, layout, arranging, sky, P, min, prayedDots, focus, label, onEnter, zoomSpot, zoomFade }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const armed = useRef<string | null>(null);
  const html = useMemo(() => ({ __html: theme.art }), [theme]);
  const labelRef = useRef(label); labelRef.current = label;
  const enterRef = useRef(onEnter); enterRef.current = onEnter;
  const arrangingRef = useRef(arranging); arrangingRef.current = arranging;

  const svg = () => stage.current?.querySelector<SVGSVGElement>("#room") ?? null;
  const groupsOf = (spot: string) => Array.from(stage.current?.querySelectorAll<SVGGElement>(`.spot.hot[data-spot="${spot}"]`) ?? []);
  const rectOf = (spot: string) => {
    const s = stage.current!.getBoundingClientRect(), rs = groupsOf(spot).map(g => g.getBoundingClientRect()).filter(r => r.width || r.height);
    if (!rs.length) return { x: s.width / 2, y: s.height / 2, cy: s.height / 2, w: s.width, h: s.height };
    const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
    return { x: (l + r) / 2 - s.left, y: t - s.top, cy: (t + b) / 2 - s.top, w: s.width, h: s.height };
  };

  // wire up every spot once per theme; handlers only act while the spot is "hot"
  useEffect(() => {
    const root = stage.current!;
    const offs: (() => void)[] = [];
    root.querySelectorAll<SVGGElement>(".spot").forEach(g => {
      const spot = g.dataset.spot!;
      const on = (type: string, fn: EventListener) => {
        const h: EventListener = e => { if (g.classList.contains("hot")) fn(e); };
        g.addEventListener(type, h); offs.push(() => g.removeEventListener(type, h));
      };
      on("pointerenter", (e) => { if ((e as PointerEvent).pointerType !== "touch") setActive(spot); });
      on("pointerleave", (e) => { if ((e as PointerEvent).pointerType !== "touch") setActive(a => (a === spot ? null : a)); });
      on("focus", () => setActive(spot));
      on("blur", () => setActive(a => (a === spot ? null : a)));
      on("keydown", (e) => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); setActive(null); enterRef.current(spot); } });
      on("click", (e) => {
        if (!arrangingRef.current && matchMedia("(hover:none)").matches && armed.current !== spot) { armed.current = spot; setActive(spot); e.stopPropagation(); return; }
        armed.current = null; setActive(null); enterRef.current(spot);
      });
    });
    const outside = (e: MouseEvent) => { if (!(e.target as Element).closest(".spot.hot")) { armed.current = null; setActive(null); } };
    document.addEventListener("click", outside);
    return () => { offs.forEach(f => f()); document.removeEventListener("click", outside); };
  }, [theme]);

  // put each tracker's object on its spot
  useEffect(() => {
    const root = stage.current!;
    const all = <T extends Element>(s: string) => Array.from(root.querySelectorAll<T>(s));
    const ctx = { prayedDots };
    const hot: string[] = [];
    for (const spot of theme.spots) {
      const p = layout.spots[spot.id], t = p ? TRACKER[p.tracker] : undefined;
      const own = !!t && spot.native?.tracker === t.id, tint = !!t && !own && spot.prop.kind === "tint";
      const nativeShows = t ? own || tint : !!spot.decor;
      all<SVGGElement>(`.native[data-spot="${spot.id}"]`).forEach(g => {
        g.style.display = nativeShows ? "" : "none";
        if (tint) g.setAttribute("filter", `url(#${tintId(spot)})`); else g.removeAttribute("filter");
      });
      const alt = t && !own ? drawProp(spot, t, ctx) : !t && arranging ? ghost(spot) : "";
      all(`.alt[data-spot="${spot.id}"]`).forEach(g => { if (g.innerHTML !== alt) g.innerHTML = alt; });
      if (t || arranging) hot.push(spot.id);
    }
    if (!arranging) hot.push(...theme.fixed.map(f => f.id));
    const isHot = new Set(hot);
    const firsts = new Set<string>();
    all<SVGGElement>(".spot").forEach(g => {
      const id = g.dataset.spot!, on = isHot.has(id);
      g.classList.toggle("hot", on);
      const first = on && !firsts.has(id); if (first) firsts.add(id);
      if (first) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", labelRef.current(id).title); }
      else { g.removeAttribute("tabindex"); g.removeAttribute("role"); g.removeAttribute("aria-label"); }
    });
    root.classList.toggle("arranging", arranging);
    // sparkles hint at clickable things; in arrange mode, badges mark every spot
    const layer = root.querySelector("#sparkles")!;
    layer.innerHTML = hot.map((id, i) => {
      const bbs = groupsOf(id).map(g => g.getBBox()).filter(b => b.width || b.height);
      if (!bbs.length) return "";
      const x = Math.max(...bbs.map(b => b.x + b.width)) - 4, y = Math.min(...bbs.map(b => b.y)) - 2;
      if (!arranging) return SPARK(x, y, id, i);
      const p = layout.spots[id];
      return BADGE(x, y + 2, id, p ? TRACKER[p.tracker].colour : null);
    }).join("");
    setActive(a => (a && isHot.has(a) ? a : null));
  }, [theme, layout, arranging, prayedDots]);

  // highlight + label for the active object
  useEffect(() => {
    const root = stage.current!;
    root.querySelectorAll(".spot.on").forEach(g => g.classList.remove("on"));
    root.querySelectorAll(".spark.hide").forEach(s => s.classList.remove("hide"));
    if (!active) { setPos(null); return; }
    groupsOf(active).forEach(g => g.classList.add("on"));
    root.querySelectorAll(`.spark[data-spot="${active}"]`).forEach(s => s.classList.add("hide"));
    const r = rectOf(active); setPos({ x: r.x, y: r.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, layout, arranging]);

  // light and window follow the time of day
  useEffect(() => {
    const root = stage.current!;
    const q = <T extends Element>(s: string) => root.querySelector<T>(s);
    q("#tint")?.setAttribute("fill", sky.tc); q("#tint")?.setAttribute("opacity", sky.to.toFixed(3));
    q("#lamps")?.setAttribute("opacity", sky.l.toFixed(3));
    q("#swTop")?.setAttribute("stop-color", sky.wt); q("#swBot")?.setAttribute("stop-color", sky.wb);
    const win = q("#winSky"); if (win) win.innerHTML = windowSky(min, P, sky);
    root.classList.toggle("lights", sky.l > 0.4);
  }, [sky, min, P]);

  // the wall clock: real time when idle, a countdown wedge while focusing
  useEffect(() => {
    const root = stage.current!;
    const set = (id: string, deg: number) => root.querySelector(`#${id}`)?.setAttribute("transform", `rotate(${deg})`);
    const tick = () => {
      const w = root.querySelector("#ckWedge"); if (!w) return;
      const left = focus.left(), active = focus.running || focus.paused;
      if (active) {
        const frac = left / focus.dur, a = frac * 2 * Math.PI, r = 5.8;
        w.setAttribute("d", frac >= 0.999 ? `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z` : frac <= 0 ? "" : `M0 0L0 ${-r}A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${(r * Math.sin(a)).toFixed(3)} ${(-r * Math.cos(a)).toFixed(3)}Z`);
        set("ckMin", frac * 360); set("ckHour", frac * 30); set("ckSec", (Math.floor(left) % 60) * -6);
      } else {
        w.setAttribute("d", "");
        const d = new Date(), h = d.getHours() % 12, m = d.getMinutes(), s = d.getSeconds();
        set("ckHour", (h + m / 60) * 30); set("ckMin", (m + s / 60) * 6); set("ckSec", s * 6);
      }
      root.querySelector(".clock")?.classList.toggle("running", focus.running);
    };
    tick(); const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [focus]);

  // ring the clock when a session finishes
  useEffect(() => {
    if (!focus.justFinished) return;
    const c = stage.current?.querySelector(".clock"); if (!c) return;
    c.classList.remove("ring"); void (c as SVGGElement).getBBox(); c.classList.add("ring");
    const t = setTimeout(() => c.classList.remove("ring"), 3200);
    return () => clearTimeout(t);
  }, [focus.justFinished]);

  // zoom toward an object when entering it
  useEffect(() => {
    const s = svg(); if (!s) return;
    if (!zoomSpot) { s.style.transform = ""; s.classList.remove("zoom"); return; }
    const r = rectOf(zoomSpot);
    s.style.transformOrigin = `${(r.x / r.w) * 100}% ${(r.cy / r.h) * 100}%`;
    s.style.transform = zoomFade ? "scale(2.4)" : "scale(1.08)";
    s.classList.toggle("zoom", zoomFade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSpot, zoomFade]);

  const L = active ? label(active) : null;
  return (
    <div className="stage" ref={stage}>
      <div className="room-svg" dangerouslySetInnerHTML={html} />
      <div className="shadow-floor" />
      <div id="label" className={L && pos ? "show" : ""} style={pos ? { left: pos.x, top: pos.y } : undefined} role="status" aria-live="polite">
        <b>{L?.title}</b><small>{L?.sub}</small><span className="tap">{arranging ? "" : "Tap again to enter"}</span>
      </div>
    </div>
  );
}
