"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useClock } from "@/hooks/useClock";
import { useFocus, mmss } from "@/hooks/useFocus";
import { skyAt } from "@/lib/sky";
import { currentPrayer, nextPrayer, FIVE } from "@/lib/prayer";
import { addDays, fmtMin } from "@/lib/dates";
import { db } from "@/lib/db";
import { demoDay, isPrayed, togglePrayed } from "@/lib/salah";
import { ROOM_TITLES, ROOM_TO_SECTION, SURPRISES } from "@/data/sections";
import { Sky } from "./Sky";
import { Room } from "./Room";
import { Header } from "./Header";
import { Pills } from "./Pills";
import { Diary } from "./Diary";
import { Sheet } from "./Sheet";
import { TimePreview } from "./TimePreview";

export function Home() {
  const clock = useClock();
  const { P, min, today } = clock;
  const [toast, setToast] = useState("");
  const focus = useFocus(task => showToast(`Focus done${task ? ": " + task : ""}. Take a little break ☕`));
  const sky = useMemo(() => skyAt(P, min), [P, min]);
  const cur = currentPrayer(P, min);
  const curDate = cur ? addDays(today, cur.dayOffset) : today;

  const savedToday = useLiveQuery(() => db.salah.get(today), [today]);
  const savedCur = useLiveQuery(() => db.salah.get(curDate), [curDate]);
  const todayDay = savedToday ?? demoDay(today, P);
  const curDay = savedCur ?? demoDay(curDate, P);
  const prayedDots = useMemo(() => FIVE.map(k => isPrayed(todayDay.p[k])), [todayDay]);

  const [diaryTarget, setDiaryTarget] = useState<{ sec: string; tab?: string } | null>(null);
  const [sheet, setSheet] = useState<"focus" | "surprise" | null>(null);
  const [surprise, setSurprise] = useState(SURPRISES[0]);
  const [zoom, setZoom] = useState<{ room: string; fade: boolean } | null>(null);

  function showToast(msg: string) { setToast(msg); }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { document.body.classList.toggle("dark", sky.d > 0.5); }, [sky.d]);

  const enter = useCallback((room: string) => {
    const target = ROOM_TO_SECTION[room];
    if (target) { setZoom({ room, fade: false }); setDiaryTarget({ sec: target[0], tab: target[1] }); return; }
    setZoom({ room, fade: true });
    if (room === "surprise") setSurprise(SURPRISES[Math.floor(Math.random() * SURPRISES.length)]);
    setTimeout(() => setSheet(room === "surprise" ? "surprise" : "focus"), 420);
  }, []);
  const leave = useCallback(() => { setZoom(null); setSheet(null); setDiaryTarget(null); }, []);

  const label = useCallback((room: string) => {
    const count = prayedDots.filter(Boolean).length, n = nextPrayer(P, min);
    const subs: Record<string, string> = {
      "deen-salah": `${count} of 5 prayed today`, "deen-quran": "Ayah of the day", "deen-library": "Seerah, Sahabah, Tafsir & more",
      journal: "Write a little", hobbies: "Idea jar, experiments, inspiration", planner: "Today & this week",
      surprise: "Open the gift", design: "Work board & projects", linkedin: "Ideas → drafts → posted",
      today: `Next prayer: ${n.name} at ${fmtMin(n.at)}`,
      focus: focus.running ? `${mmss(focus.left())} left${focus.task ? " · " + focus.task : ""}` : focus.paused ? `Paused · ${mmss(focus.left())} left` : "Click to start a focus session",
    };
    return { title: ROOM_TITLES[room] ?? room, sub: subs[room] ?? "" };
  }, [prayedDots, P, min, focus]);

  return (
    <>
      <Sky sky={sky} P={P} min={min} />
      <main>
        <Header P={P} min={min} sky={sky} />
        <Room sky={sky} P={P} min={min} prayedDots={prayedDots} focus={focus} label={label} onEnter={enter} zoomRoom={zoom?.room ?? null} zoomFade={!!zoom?.fade} />
        <Pills P={P} min={min} today={todayDay} curDay={curDay} focus={focus}
          onToggle={() => cur && togglePrayed(curDate, cur.name, P)} onGo={r => (r === "focus" ? enter("focus") : enter(r))} />
      </main>
      <Diary target={diaryTarget} onClosed={leave} />
      <Sheet kind={sheet} surprise={surprise} focus={focus} onClose={leave} />
      <div id="toast" className={toast ? "show" : ""} role="status" aria-live="polite">{toast}</div>
      <TimePreview min={min} preview={clock.preview} setPreview={clock.setPreview} />
    </>
  );
}
