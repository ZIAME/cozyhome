"use client";
import { useEffect, useMemo, useState } from "react";
import type { SkyState } from "@/lib/sky";
import type { DayTimes } from "@/lib/prayer";

type Star = { left: number; top: number; delay: number; dur: number; big: boolean };
type Flake = { left: number; size: number; dx: number; dur: number; delay: number; op: number };

/** The sky behind the room: gradient, stars, clouds, snow, hills, and the sun or moon on its arc. */
export function Sky({ sky, P, min }: { sky: SkyState; P: DayTimes; min: number }) {
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [decor, setDecor] = useState<{ stars: Star[]; flakes: Flake[] } | null>(null);
  useEffect(() => {
    const on = () => setSize({ w: innerWidth, h: innerHeight });
    on(); addEventListener("resize", on);
    // random decor is made on the client only, so server and client HTML match
    setDecor({
      stars: Array.from({ length: 90 }, () => ({ left: Math.random() * 100, top: Math.random() * 70, delay: -Math.random() * 4, dur: 2.5 + Math.random() * 3, big: Math.random() < 0.12 })),
      flakes: Array.from({ length: 46 }, () => ({ left: Math.random() * 100, size: 2 + Math.random() * 3.5, dx: Math.random() * 80 - 40, dur: 9 + Math.random() * 12, delay: -Math.random() * 20, op: 0.4 + Math.random() * 0.5 })),
    });
    return () => removeEventListener("resize", on);
  }, []);

  const body = useMemo(() => {
    const arc = (t: number) => ({ x: size.w * (0.06 + 0.88 * t), y: size.h * (0.62 - 0.5 * Math.sin(Math.PI * t)) });
    const rise = P.Sunrise, set = P.Maghrib;
    if (min >= rise - 20 && min <= set + 15) {
      const t = Math.min(1, Math.max(0, (min - rise) / (set - rise)));
      const p = arc(t);
      return { sun: { left: p.x, top: p.y + (t < 0.03 || t > 0.97 ? 40 : 0) }, moon: null };
    }
    const nightLen = 1440 - set + rise, since = min > set ? min - set : min + 1440 - set;
    return { sun: null, moon: arc(Math.min(1, Math.max(0, since / nightLen))) };
  }, [min, P, size]);

  return (
    <div id="sky" style={{ background: `linear-gradient(180deg,${sky.t} 0%,${sky.m} 55%,${sky.b} 100%)` }} aria-hidden="true">
      <div id="stars" style={{ opacity: sky.s }}>
        {decor?.stars.map((s, i) => <i key={i} className={"star" + (s.big ? " big" : "")} style={{ left: s.left + "%", top: s.top + "%", animationDelay: s.delay + "s", animationDuration: s.dur + "s" }} />)}
      </div>
      <div id="sun" style={body.sun ? { left: body.sun.left, top: body.sun.top, opacity: 1 } : { opacity: 0 }} />
      <div id="moon" style={body.moon ? { left: body.moon.x, top: body.moon.y, opacity: 1 } : { opacity: 0 }} />
      <div id="clouds" style={{ opacity: sky.c }}>
        {[[12, 140, 70], [34, 200, 95], [58, 110, 60], [22, 170, 120]].map(([top, w, dur], i) => (
          <div key={i} className="cloud" style={{ top: top + "%", width: w, animationDuration: dur + "s", animationDelay: -dur * i * 0.31 + "s" }} />
        ))}
      </div>
      <div id="snow" style={{ opacity: sky.sn }}>
        {decor?.flakes.map((f, i) => <i key={i} className="flake" style={{ width: f.size, height: f.size, left: f.left + "%", ["--dx" as string]: f.dx + "px", animationDuration: f.dur + "s", animationDelay: f.delay + "s", opacity: f.op }} />)}
      </div>
      <svg id="hills" viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0 120 C 180 60 340 90 520 110 S 860 60 1200 100 V200 H0Z" fill={sky.h1} />
        <path d="M0 160 C 200 120 420 140 640 150 S 980 120 1200 140 V200 H0Z" fill={sky.h2} />
      </svg>
    </div>
  );
}
