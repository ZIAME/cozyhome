"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useClock } from "@/hooks/useClock";
import { useFocus, mmss } from "@/hooks/useFocus";
import { skyAt } from "@/lib/sky";
import { currentPrayer, nextPrayer, FIVE } from "@/lib/prayer";
import { addDays, fmtMin, todayStr } from "@/lib/dates";
import { addItem } from "@/lib/items";
import { db } from "@/lib/db";
import { demoDay, isPrayed, togglePrayed } from "@/lib/salah";
import { SURPRISES, TRACKER } from "@/room/catalogue";
import { applyPicks, clearSpot, inDrawer, place, spotOf, type Placement } from "@/room/layout";
import { FALLBACK, useProfile } from "@/lib/profile";
import { useNextTask, type NextTask } from "@/lib/due";
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
import { Welcome } from "./Welcome";
import { BackupSheet } from "./Backup";
import { clearNotice, useAutoSync, useSyncStatus } from "@/lib/sync";
import { useTopicOfDay } from "@/lib/topic";
import { askPersistence } from "@/lib/backup";
import { useApplyDisplay, useDisplay } from "@/lib/display";
import { SettingsSheet } from "./Settings";

export function Home() {
  const { loaded: profileLoaded, profile, save: saveProfile } = useProfile();
  const where = profile ?? FALLBACK;
  const clock = useClock(where.place, where.prayer);
  const { P, min, today } = clock;
  const [toast, setToast] = useState("");
  const focus = useFocus((task, seconds) => {
    showToast(`Focus done${task ? ": " + task : ""}. Take a little break ☕`);
    addItem("focus", "session", { minutes: Math.round(seconds / 60), task }, { date: todayStr() });
  });
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
  const [backupOpen, setBackupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [display] = useDisplay();
  useApplyDisplay(display);
  useAutoSync();
  const syncStatus = useSyncStatus();
  const [topic] = useTopicOfDay();
  useEffect(() => { if (syncStatus.notice) { showToast(syncStatus.notice); clearNotice(); } }, [syncStatus.notice]);
  const [reveal, setReveal] = useState(false);
  const onboarding = profileLoaded && (!profile || editing);
  const ready = profileLoaded && loaded && !!profile;
  // once a day, the first time the room opens: today's research topic (people who use Deen)
  useEffect(() => {
    if (!ready || !hasDeen || reveal || onboarding) return;
    const key = "cozy-topic-nudge", day = today;
    try { if (localStorage.getItem(key) === day) return; } catch { return; }
    const t = setTimeout(() => {
      showToast(`Today’s research topic: ${topic.title}. It’s waiting in your Library.`);
      try { localStorage.setItem(key, day); } catch { /* private mode */ }
    }, 2500);
    return () => clearTimeout(t);
  }, [ready, hasDeen, reveal, onboarding, today, topic.title]);

  /** Save onboarding (or edited details), set the room up for the picks, and let the room build itself the first time. */
  const finishOnboarding = useCallback(({ profile: p, picked, auto }: OnboardResult & { auto?: boolean }) => {
    const first = !profile;
    saveProfile(p);
    save(applyPicks(layout, theme, picked));
    setEditing(false);
    if (first) {
      askPersistence().catch(() => {}); setReveal(true); setTimeout(() => setReveal(false), 4200);
      setTimeout(() => showToast(auto
        ? `Welcome, ${p.name}. There was no saved room on this account, so here’s a fresh one. Change your place or trackers in Settings.`
        : `Welcome home, ${p.name} ✨`), 1900);
    }
  }, [profile, saveProfile, save, layout, theme]);

  function showToast(msg: string) { setToast(msg); }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), Math.max(4200, toast.length * 70)); return () => clearTimeout(t); }, [toast]);
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

  // ?open=tracker/tab opens a diary page directly (app shortcuts, links)
  useEffect(() => {
    if (!ready) return;
    const o = new URLSearchParams(location.search).get("open");
    if (!o) return;
    const [t, tab] = o.split("/");
    if (TRACKER[t]?.tabs.length) setDiaryTarget({ sec: t, tab });
    history.replaceState(null, "", location.pathname);
  }, [ready]);

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
      "deen/salah": todayDay.period ? "Rest days: prayers excused" : `${count} of 5 prayed today`, "deen/quran": "Ayah of the day", "deen/library": `Today: ${topic.title}`,
      journal: "Write a little", planner: "Today & this week", hobbies: "Idea jar, experiments, inspiration",
      design: "Work board & projects", content: "Ideas → drafts → posted", today: hasDeen ? `Next prayer: ${n.name} at ${fmtMin(n.at)}` : t.sub,
    };
    return { title: tab ? `${t.title} · ${tab.label}` : t.title, sub: subs[`${t.id}/${tab?.id}`] ?? subs[t.id] ?? t.sub };
  }, [theme, layout, arranging, prayedDots, P, min, focus, hasDeen, todayDay.period, topic.title]);

  const placeOn = useCallback((spot: string, p: Placement) => {
    const r = place(layout, theme, spot, p);
    if (r.ok) save(r.layout); else if (r.error === "room-full") showToast("The room is full. Empty a spot first.");
  }, [layout, theme, save]);

  const drawerCount = inDrawer(layout).length;
  const next = useNextTask();
  // the cat sleeps from an hour and a half after Isha until Fajr
  const catNight = min >= P.Isha + 90 || min < P.Fajr;
  const onCat = useCallback((t: NextTask) => {
    if (t) openTracker(t.open[0], t.open[1]);
    else if (layout.picked.includes("planner")) openTracker("planner", "today");
    else setDrawerOpen(true);
  }, [openTracker, layout]);
  return (
    <>
      <Sky sky={sky} P={P} min={min} />
      {profileLoaded && !profile && <Welcome onDone={finishOnboarding} />}
      {editing && profile && <Onboarding key="edit" onDone={finishOnboarding} initial={{ profile, picked: layout.picked }} onCancel={() => setEditing(false)} />}
      {ready && !(onboarding && !editing) && <>
      <main>
        <Header P={P} min={min} sky={sky} name={profile.name} showPrayer={hasDeen && !todayDay.period} />
        {loaded && <Room theme={theme} layout={layout} arranging={arranging} name={profile.name} reveal={reveal} sky={sky} P={P} min={min} prayedDots={prayedDots} focus={focus} label={label} onEnter={enter}
          zoomSpot={zoom?.spot ?? null} zoomFade={!!zoom?.fade} cat={{ next, night: catNight, onOpen: onCat }} />}
        {arranging ? <ArrangeBar layout={layout} onDone={() => setArranging(false)} /> : (
          <Pills P={P} min={min} today={todayDay} curDay={curDay} focus={focus} showPrayer={hasDeen} drawerCount={drawerCount}
            onToggle={() => cur && togglePrayed(curDate, cur.name, P)}
            onGo={r => (r === "focus" ? enter("clock") : r === "drawer" ? setDrawerOpen(true) : r === "library" ? openTracker("deen", "library") : openTracker("deen", "salah"))} />
        )}
      </main>
      <Diary target={diaryTarget} onClosed={leave} />
      <Sheet kind={sheet} surprise={surprise} focus={focus} onClose={leave} />
      <SpotSheet theme={theme} layout={layout} spot={spotSheet} onClose={() => setSpotSheet(null)}
        onPlace={p => spotSheet && placeOn(spotSheet, p)} onClear={() => { if (spotSheet) save(clearSpot(layout, spotSheet)); }} />
      <DrawerSheet open={drawerOpen} layout={layout} onClose={() => setDrawerOpen(false)} onSettings={() => { setDrawerOpen(false); setSettingsOpen(true); }}
        onOpen={id => { setDrawerOpen(false); openTracker(id); }} onArrange={() => { setDrawerOpen(false); setArranging(true); }} />
      <button id="arrangeBtn" className={arranging ? "on" : ""} aria-pressed={arranging} aria-label={arranging ? "Done arranging" : "Arrange the room"} title="Arrange the room"
        onClick={() => setArranging(a => !a)}><ArrangeIcon /></button>
      {display.timePreview && <TimePreview min={min} preview={clock.preview} setPreview={clock.setPreview} />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} hasDeen={hasDeen}
        onEditDetails={() => { setSettingsOpen(false); setEditing(true); }} onBackup={() => { setSettingsOpen(false); setBackupOpen(true); }} />
      </>}
      <BackupSheet open={backupOpen} onClose={() => setBackupOpen(false)} />
      <div id="toast" className={toast ? "show" : ""} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
