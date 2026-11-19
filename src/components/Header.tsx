"use client";
import { useEffect, useState } from "react";
import { OWNER_NAME } from "@/lib/config";
import { PHASE_NAME, type SkyState } from "@/lib/sky";
import { currentPrayer, nextPrayer, type DayTimes } from "@/lib/prayer";
import { fmtMin } from "@/lib/dates";
import { MoonIcon, SunIcon } from "./Icons";

export function prayerNowText(P: DayTimes, min: number) {
  const c = currentPrayer(P, min);
  if (c) return `${c.name} time · until ${fmtMin(c.end)}`;
  const n = nextPrayer(P, min);
  return `Next: ${n.name} at ${fmtMin(n.at)}`;
}

export function Header({ P, min, sky }: { P: DayTimes; min: number; sky: SkyState }) {
  const [dates, setDates] = useState({ g: "", h: "" });
  useEffect(() => {
    const d = new Date();
    let h = "";
    try { h = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(d).replace(/\s?AH$/, "") + " AH"; } catch {}
    setDates({ g: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }), h });
  }, []);
  const g = min < P.Fajr - 30 ? "Peaceful night" : min < 720 ? "Good morning" : min < P.Maghrib - 20 ? "Good afternoon" : min < 1260 ? "Good evening" : "Good night";
  const night = sky.key === "night" || sky.key === "dusk";
  return (
    <header>
      <div>
        <h1 className="greet">{g}, {OWNER_NAME}</h1>
        <div className="dates"><span>{dates.g}</span>{dates.h && <><span className="dot-sep" /><span>{dates.h}</span></>}</div>
      </div>
      <div className="phase">{night ? <MoonIcon /> : <SunIcon />}<span>{PHASE_NAME[sky.key]} · {prayerNowText(P, min)}</span></div>
    </header>
  );
}
