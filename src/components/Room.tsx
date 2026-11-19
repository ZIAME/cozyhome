"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CABIN_SVG } from "@/data/cabinSvg";
import type { SkyState } from "@/lib/sky";
import type { DayTimes } from "@/lib/prayer";
import type { FocusView } from "@/hooks/useFocus";

export type RoomLabel = { title: string; sub: string };
type Props = {
  sky: SkyState; P: DayTimes; min: number;
  prayedDots: boolean[];
  focus: FocusView;
  label: (room: string) => RoomLabel;
  onEnter: (room: string) => void;
  zoomRoom: string | null; zoomFade: boolean;
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

/** The isometric room: every clickable object lifts, glows and shows a label; the screens, window, lamps and clock are live. */
export function Room({ sky, P, min, prayedDots, focus, label, onEnter, zoomRoom, zoomFade }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const armed = useRef<string | null>(null);
  const html = useMemo(() => ({ __html: CABIN_SVG }), []);
  const labelRef = useRef(label); labelRef.current = label;
  const enterRef = useRef(onEnter); enterRef.current = onEnter;

  const svg = () => stage.current?.querySelector<SVGSVGElement>("#room") ?? null;
  const groupsOf = (room: string) => Array.from(stage.current?.querySelectorAll<SVGGElement>(`.hot[data-room="${room}"]`) ?? []);
  const rectOf = (room: string) => {
    const s = stage.current!.getBoundingClientRect(), rs = groupsOf(room).map(g => g.getBoundingClientRect());
    const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
    return { x: (l + r) / 2 - s.left, y: t - s.top, cy: (t + b) / 2 - s.top, w: s.width, h: s.height };
  };

  // wire up the objects once
  useEffect(() => {
    const root = stage.current!;
    const groups = Array.from(root.querySelectorAll<SVGGElement>(".hot"));
    const rooms = [...new Set(groups.map(g => g.dataset.room!))];
    rooms.forEach(room => {
      const first = groupsOf(room)[0];
      first.setAttribute("tabindex", "0"); first.setAttribute("role", "button");
      first.setAttribute("aria-label", labelRef.current(room).title);
    });
    const activate = (room: string | null) => setActive(room);
    const offs: (() => void)[] = [];
    groups.forEach(g => {
      const room = g.dataset.room!;
      const on = (type: string, fn: EventListener) => { g.addEventListener(type, fn); offs.push(() => g.removeEventListener(type, fn)); };
      on("pointerenter", (e) => { if ((e as PointerEvent).pointerType !== "touch") activate(room); });
      on("pointerleave", (e) => { if ((e as PointerEvent).pointerType !== "touch") setActive(a => (a === room ? null : a)); });
      on("focus", () => activate(room));
      on("blur", () => setActive(a => (a === room ? null : a)));
      on("keydown", (e) => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); setActive(null); enterRef.current(room); } });
      on("click", (e) => {
        if (matchMedia("(hover:none)").matches && armed.current !== room) { armed.current = room; activate(room); e.stopPropagation(); return; }
        armed.current = null; setActive(null); enterRef.current(room);
      });
    });
    const outside = (e: MouseEvent) => { if (!(e.target as Element).closest(".hot")) { armed.current = null; setActive(null); } };
    document.addEventListener("click", outside);
    // sparkles: small hints above each clickable thing
    const layer = root.querySelector("#sparkles")!;
    layer.innerHTML = rooms.map((room, i) => {
      const bbs = groupsOf(room).map(g => g.getBBox());
      const x = Math.max(...bbs.map(b => b.x + b.width)) - 4, y = Math.min(...bbs.map(b => b.y)) - 2;
      return `<path class="spark" data-room="${room}" style="animation-delay:${(i * 0.37) % 2.8}s" d="M${x} ${y - 4.5}Q${x + 0.6} ${y - 0.6} ${x + 4.5} ${y}Q${x + 0.6} ${y + 0.6} ${x} ${y + 4.5}Q${x - 0.6} ${y + 0.6} ${x - 4.5} ${y}Q${x - 0.6} ${y - 0.6} ${x} ${y - 4.5}Z" fill="#FFE2A3"/>`;
    }).join("");
    return () => { offs.forEach(f => f()); document.removeEventListener("click", outside); };
  }, []);

  // highlight + label for the active object
  useEffect(() => {
    const root = stage.current!;
    root.querySelectorAll(".hot.on").forEach(g => g.classList.remove("on"));
    root.querySelectorAll(".spark.hide").forEach(s => s.classList.remove("hide"));
    if (!active) { setPos(null); return; }
    groupsOf(active).forEach(g => g.classList.add("on"));
    root.querySelectorAll(`.spark[data-room="${active}"]`).forEach(s => s.classList.add("hide"));
    const r = rectOf(active); setPos({ x: r.x, y: r.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // light, window, screens: follow the time of day
  useEffect(() => {
    const root = stage.current!;
    const q = <T extends Element>(s: string) => root.querySelector<T>(s);
    q("#tint")?.setAttribute("fill", sky.tc); q("#tint")?.setAttribute("opacity", sky.to.toFixed(3));
    q("#lamps")?.setAttribute("opacity", sky.l.toFixed(3));
    q("#swTop")?.setAttribute("stop-color", sky.wt); q("#swBot")?.setAttribute("stop-color", sky.wb);
    const win = q("#winSky"); if (win) win.innerHTML = windowSky(min, P, sky);
    root.classList.toggle("lights", sky.l > 0.4);
    const dots = q("#scrDots");
    if (dots) dots.innerHTML = prayedDots.map((y, i) => `<circle cx="${22 + i * 9}" cy="30" r="3" fill="${y ? "#E9A23B" : "#6B4A33"}"/>`).join("");
    q("#scrBar")?.setAttribute("width", String((68 * prayedDots.filter(Boolean).length) / 5));
  }, [sky, min, P, prayedDots]);

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
    if (!zoomRoom) { s.style.transform = ""; s.classList.remove("zoom"); return; }
    const r = rectOf(zoomRoom);
    s.style.transformOrigin = `${(r.x / r.w) * 100}% ${(r.cy / r.h) * 100}%`;
    s.style.transform = zoomFade ? "scale(2.4)" : "scale(1.08)";
    s.classList.toggle("zoom", zoomFade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomRoom, zoomFade]);

  const L = active ? label(active) : null;
  return (
    <div className="stage" ref={stage}>
      <div className="room-svg" dangerouslySetInnerHTML={html} />
      <div className="shadow-floor" />
      <div id="label" className={L && pos ? "show" : ""} style={pos ? { left: pos.x, top: pos.y } : undefined} role="status" aria-live="polite">
        <b>{L?.title}</b><small>{L?.sub}</small><span className="tap">Tap again to enter</span>
      </div>
    </div>
  );
}
