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
import { SURPRISES, TRACKER } from "@/room/catalogue";
import { applyPicks, clearSpot, inDrawer, place, spotOf, type Placement } from "@/room/layout";
import { FALLBACK, useProfile } from "@/lib/profile";
import { useLayout } from "@/room/useLayout";
import { Sky } from "./Sky";
import { Room } from "./Room";
import { Header } from "./Header";
import { Pills } from "./Pills";
import { Diary } from "./Diary";
import { Sheet } from "./Sheet";
import { TimePreview } from "./TimePreview";
import { ArrangeBar, ArrangeIcon, DrawerSheet, SpotSheet } from "./Arrange";
import { Onboarding, type OnboardResult } from "./Onboarding";

export function Home() {
  const { loaded: profileLoaded, profile, save: saveProfile } = useProfile();
  const where = profile ?? FALLBACK;
  const clock = useClock(where.place, where.prayer);
  const { P, min, today } = clock;
  const [toast, setToast] = useState("");
  const focus = useFocus(task => showToast(`Focus done${task ? ": " + task : ""}. Take a little break ☕`));
  const sky = useMemo(() => skyAt(P, min), [P, min]);
  const cur = currentPrayer(P, min);
  const curDate = cur ? addDays(today, cur.dayOffset) : today;
  const { theme, layout, save, loaded } = useLayout();
  const hasDeen = layout.picked.includes("deen");

  const savedToday = useLiveQuery(() => db.salah.get(today), [today]);
  const savedCur = useLiveQuery(() => db.salah.get(curDate), [curDate]);
  const todayDay = savedToday ?? demoDay(today, P);
  const curDay = savedCur ?? demoDay(curDate, P);
  const prayedDots = useMemo(() => FIVE.map(k => isPrayed(todayDay.p[k])), [todayDay]);

  const [diaryTarget, setDiaryTarget] = useState<{ sec: string; tab?: string } | null>(null);
  const [sheet, setSheet] = useState<"focus" | "surprise" | null>(null);
  const [surprise, setSurprise] = useState(SURPRISES[0]);
  const [zoom, setZoom] = useState<{ spot: string; fade: boolean } | null>(null);
  const [arranging, setArranging] = useState(false);
  const [spotSheet, setSpotSheet] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const onboarding = profileLoaded && (!profile || editing);
  const ready = profileLoaded && loaded && !!profile;

  /** Save onboarding (or edited details), set the room up for the picks, and let the room build itself the first time. */
  const finishOnboarding = useCallback(({ profile: p, picked }: OnboardResult) => {
    const first = !profile;
    saveProfile(p);
    save(applyPicks(layout, theme, picked));
    setEditing(false);
    if (first) { setReveal(true); setTimeout(() => setReveal(false), 4200); setTimeout(() => showToast(`Welcome home, ${p.name} ✨`), 1900); }
  }, [profile, saveProfile, save, layout, theme]);

  function showToast(msg: string) { setToast(msg); }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { document.body.classList.toggle("dark", sky.d > 0.5); }, [sky.d]);
  useEffect(() => {
    if (!arranging) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setArranging(false); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [arranging]);

  /** Open a tracker's diary, zooming toward its object if it's in the room. */
  const openTracker = useCallback((tracker: string, tab?: string, fromSpot?: string | null) => {
    if (!TRACKER[tracker]?.tabs.length) return;
    const spot = fromSpot ?? spotOf(layout, tracker, tab);
    if (spot) setZoom({ spot, fade: false });
    setDiaryTarget({ sec: tracker, tab });
  }, [layout]);

  const enter = useCallback((spot: string) => {
    if (arranging) { if (theme.spots.some(s => s.id === spot)) setSpotSheet(spot); return; }
    const fixed = theme.fixed.find(f => f.id === spot);
    if (fixed) {
      setZoom({ spot, fade: true });
      if (fixed.tracker === "surprise") setSurprise(SURPRISES[Math.floor(Math.random() * SURPRISES.length)]);
      setTimeout(() => setSheet(fixed.tracker === "surprise" ? "surprise" : "focus"), 420);
      return;
    }
    const p = layout.spots[spot];
    if (p) openTracker(p.tracker, p.tab, spot);
  }, [arranging, theme, layout, openTracker]);
  const leave = useCallback(() => { setZoom(null); setSheet(null); setDiaryTarget(null); }, []);

  const label = useCallback((spot: string) => {
    const fixed = theme.fixed.find(f => f.id === spot);
    if (fixed) {
      const t = TRACKER[fixed.tracker];
      const sub = fixed.tracker !== "focus" ? t.sub
        : focus.running ? `${mmss(focus.left())} left${focus.task ? " · " + focus.task : ""}` : focus.paused ? `Paused · ${mmss(focus.left())} left` : t.sub;
      return { title: t.title, sub };
    }
    const S = theme.spots.find(s => s.id === spot), p = layout.spots[spot], t = p && TRACKER[p.tracker];
    if (arranging) return { title: S?.label ?? spot, sub: t ? t.title : "Empty · tap to choose" };
    if (!t) return { title: S?.label ?? spot, sub: "" };
    const tab = t.tabs.find(x => x.id === p.tab);
    const count = prayedDots.filter(Boolean).length, n = nextPrayer(P, min);
    const subs: Record<string, string> = {
      "deen/salah": `${count} of 5 prayed today`, "deen/quran": "Ayah of the day", "deen/library": "Seerah, Sahabah, Tafsir & more",
      journal: "Write a little", planner: "Today & this week", hobbies: "Idea jar, experiments, inspiration",
      design: "Work board & projects", content: "Ideas → drafts → posted", today: hasDeen ? `Next prayer: ${n.name} at ${fmtMin(n.at)}` : t.sub,
    };
    return { title: tab ? `${t.title} · ${tab.label}` : t.title, sub: subs[`${t.id}/${tab?.id}`] ?? subs[t.id] ?? t.sub };
  }, [theme, layout, arranging, prayedDots, P, min, focus, hasDeen]);

  const placeOn = useCallback((spot: string, p: Placement) => {
    const r = place(layout, theme, spot, p);
    if (r.ok) save(r.layout); else if (r.error === "room-full") showToast("The room is full. Empty a spot first.");
  }, [layout, theme, save]);

  const drawerCount = inDrawer(layout).length;
  return (
    <>
      <Sky sky={sky} P={P} min={min} />
      {onboarding && <Onboarding key={editing ? "edit" : "new"} onDone={finishOnboarding}
        initial={editing && profile ? { profile, picked: layout.picked } : undefined} onCancel={() => setEditing(false)} />}
      {ready && !(onboarding && !editing) && <>
      <main>
        <Header P={P} min={min} sky={sky} name={profile.name} showPrayer={hasDeen} />
        {loaded && <Room theme={theme} layout={layout} arranging={arranging} name={profile.name} reveal={reveal} sky={sky} P={P} min={min} prayedDots={prayedDots} focus={focus} label={label} onEnter={enter}
          zoomSpot={zoom?.spot ?? null} zoomFade={!!zoom?.fade} />}
        {arranging ? <ArrangeBar layout={layout} onDone={() => setArranging(false)} /> : (
          <Pills P={P} min={min} today={todayDay} curDay={curDay} focus={focus} showPrayer={hasDeen} drawerCount={drawerCount}
            onToggle={() => cur && togglePrayed(curDate, cur.name, P)}
            onGo={r => (r === "focus" ? enter("clock") : r === "drawer" ? setDrawerOpen(true) : openTracker("deen", "salah"))} />
        )}
      </main>
      <Diary target={diaryTarget} onClosed={leave} />
      <Sheet kind={sheet} surprise={surprise} focus={focus} onClose={leave} />
      <SpotSheet theme={theme} layout={layout} spot={spotSheet} onClose={() => setSpotSheet(null)}
        onPlace={p => spotSheet && placeOn(spotSheet, p)} onClear={() => { if (spotSheet) save(clearSpot(layout, spotSheet)); }} />
      <DrawerSheet open={drawerOpen} layout={layout} onClose={() => setDrawerOpen(false)} onEdit={() => { setDrawerOpen(false); setEditing(true); }}
        onOpen={id => { setDrawerOpen(false); openTracker(id); }} onArrange={() => { setDrawerOpen(false); setArranging(true); }} />
      <button id="arrangeBtn" className={arranging ? "on" : ""} aria-pressed={arranging} aria-label={arranging ? "Done arranging" : "Arrange the room"} title="Arrange the room"
        onClick={() => setArranging(a => !a)}><ArrangeIcon /></button>
      <TimePreview min={min} preview={clock.preview} setPreview={clock.setPreview} />
      </>}
      <div id="toast" className={toast ? "show" : ""} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
