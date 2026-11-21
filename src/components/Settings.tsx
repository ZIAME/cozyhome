"use client";
import { useEffect, useState } from "react";
import { METHODS, defaultsFor, type MethodId, type PrayerSettings } from "@/lib/prayer";
import { useProfile, type Profile } from "@/lib/profile";
import { useDisplay } from "@/lib/display";
import { COUNTRIES } from "@/data/cities";
import { CONTACT_EMAIL } from "@/lib/report";
import { Modal } from "./Arrange";
import { PrayerTimesBox } from "./Onboarding";
import { StreakToggle } from "@/diary/privacy";
import { ReportMistake } from "./Report";
import { Credits, Privacy } from "./Legal";
import { disablePush, enablePush, isSubscribed, pushSupport, savedTime, testNotification, type PushSupport } from "@/lib/push";
import { useSyncStatus } from "@/lib/sync";
import { useTopicOfDay } from "@/lib/topic";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

type Props = { open: boolean; onClose: () => void; hasDeen: boolean; onEditDetails: () => void; onBackup: () => void };

/** Everything adjustable in one place. */
export function SettingsSheet({ open, onClose, hasDeen, onEditDetails, onBackup }: Props) {
  const { profile, save } = useProfile();
  const [display, setDisplay] = useDisplay();
  const [page, setPage] = useState<null | "credits" | "privacy">(null);
  useEffect(() => { if (!open) setPage(null); }, [open]);
  if (page) return (
    <Modal open={open} eyebrow="Settings" title={page === "credits" ? "Credits" : "Privacy"} onClose={onClose} wide>
      <button className="ob-link" onClick={() => setPage(null)}>← Back to settings</button>
      {page === "credits" ? <Credits /> : <Privacy />}
    </Modal>
  );
  return (
    <Modal open={open} eyebrow="Your room" title="Settings" onClose={onClose} wide>
      {profile && <YouSection profile={profile} save={save} onEditDetails={onEditDetails} />}
      {profile && hasDeen && <PrayerSection profile={profile} save={save} />}

      {hasDeen && <NotifySection onBackup={onBackup} />}

      <section className="bk-sec">
        <h3>Privacy</h3>
        <div className="bk-row"><div><b>Streaks</b><small>Hide every streak in the app. Prayer is between you and Allah.</small></div><StreakToggle /></div>
        <div className="bk-row"><div><b>Backup & sync</b><small>Download everything, or keep your devices in step.</small></div><button className="ghost-btn" onClick={onBackup}>Open</button></div>
      </section>

      <section className="bk-sec">
        <h3>Display</h3>
        <Toggle label="Calm motion" hint="Stops animations and the cat’s wandering." on={display.calm} set={v => setDisplay({ calm: v })} />
        <Toggle label="Simple view" hint="A lighter room for slower phones: no stars, clouds, snow or light effects." on={display.simple} set={v => setDisplay({ simple: v })} />
        <Toggle label="Time preview" hint="A clock button to see the room at any hour of the day." on={display.timePreview} set={v => setDisplay({ timePreview: v })} />
      </section>

      <section className="bk-sec">
        <h3>About</h3>
        <div className="mrow">
          <button className="ghost-btn" onClick={() => setPage("credits")}>Credits</button>
          <button className="ghost-btn" onClick={() => setPage("privacy")}>Privacy</button>
          <ReportMistake className="ghost-btn" what="Something in the app" details="Where in the app:" />
        </div>
        <p className="mnote">Cozy Home {VERSION}{CONTACT_EMAIL ? <> · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></> : null}</p>
      </section>
    </Modal>
  );
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="bk-row">
      <div><b>{label}</b><small>{hint}</small></div>
      <button className={"sw" + (on ? " on" : "")} role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)}><i /></button>
    </div>
  );
}

function YouSection({ profile, save, onEditDetails }: { profile: Profile; save: (p: Profile) => void; onEditDetails: () => void }) {
  const [name, setName] = useState(profile.name);
  useEffect(() => setName(profile.name), [profile.name]);
  const place = profile.place.country && COUNTRIES[profile.place.country] ? `${profile.place.name}, ${COUNTRIES[profile.place.country]}` : profile.place.name;
  return (
    <section className="bk-sec">
      <h3>You</h3>
      <label className="bk-row"><div><b>Name</b><small>In your greeting and on the wall frame.</small></div>
        <input className="k-in st-name" value={name} maxLength={40} aria-label="Your name" onChange={e => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== profile.name && save({ ...profile, name: name.trim() })} /></label>
      <div className="bk-row"><div><b>Home</b><small>{place}</small></div><button className="ghost-btn" onClick={onEditDetails}>Change</button></div>
      <div className="bk-row"><div><b>Trackers</b><small>Add or remove what’s in your room.</small></div><button className="ghost-btn" onClick={onEditDetails}>Change</button></div>
    </section>
  );
}

function PrayerSection({ profile, save }: { profile: Profile; save: (p: Profile) => void }) {
  const set = (prayer: PrayerSettings) => save({ ...profile, prayer });
  const p = profile.prayer, d = defaultsFor(profile.place.country);
  const country = profile.place.country ? COUNTRIES[profile.place.country] : null;
  const usual = p.method === d.method && p.asr === d.asr;
  return (
    <section className="bk-sec">
      <h3>Prayer times</h3>
      <p className="mnote">{usual ? `Using the usual settings${country ? ` for ${country}` : ""}.` : "Changed from the usual settings."} Match these to your local mosque.</p>
      <label className="ob-field">Calculation method
        <select value={p.method} onChange={e => set({ ...p, method: e.target.value as MethodId })}>
          {(Object.keys(METHODS) as MethodId[]).map(m => <option key={m} value={m}>{METHODS[m].name}</option>)}
        </select>
      </label>
      <div className="ob-field" role="radiogroup" aria-label="Asr time">Asr
        <div className="seg">{(["hanafi", "shafii"] as const).map(a => <button key={a} role="radio" aria-checked={p.asr === a} className={p.asr === a ? "on" : ""} onClick={() => set({ ...p, asr: a })}>{a === "hanafi" ? "Hanafi (later)" : "Shafi’i, Maliki, Hanbali"}</button>)}</div>
      </div>
      <label className="ob-field">Short summer nights
        <select value={p.highLat} onChange={e => set({ ...p, highLat: e.target.value as PrayerSettings["highLat"] })}>
          <option value="middle">Middle of the night</option><option value="seventh">One seventh of the night</option><option value="angle">Angle-based</option>
        </select>
      </label>
      {Math.abs(profile.place.lat) <= 48 && <p className="mnote">Only matters far north or south, where summer nights are short.</p>}
      <PrayerTimesBox place={profile.place} prayer={p} onChange={set} bare />
      {!usual && <button className="ob-link" onClick={() => set({ ...p, ...d })}>Go back to the usual settings</button>}
    </section>
  );
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Daily topic notification: on/off and the time, for this device. */
function NotifySection({ onBackup }: { onBackup: () => void }) {
  const sync = useSyncStatus();
  const [topic] = useTopicOfDay();
  const [support, setSupport] = useState<PushSupport>("off");
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(480);
  const [msg, setMsg] = useState(""), [wait, setWait] = useState(false);
  useEffect(() => { setSupport(pushSupport()); setTime(savedTime()); isSubscribed().then(setOn).catch(() => setOn(false)); }, []);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setWait(true); setMsg("");
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : "That didn’t work. Try again."); } finally { setWait(false); }
  };
  const turn = (v: boolean) => run(async () => { if (v) await enablePush(time); else await disablePush(); setOn(v); },
    v ? `Done. You’ll get today’s topic at ${hhmm(time)} every day.` : "Daily notifications are off on this device.");

  let body: React.ReactNode;
  if (support === "off") body = <p className="mnote">Daily notifications aren’t switched on in this version yet. Your topic is waiting in the Library each day.</p>;
  else if (support === "unsupported") body = <p className="mnote">This browser can’t show notifications. Try Chrome, or install the app to your Home Screen.</p>;
  else if (support === "ios-home-screen") body = <p className="mnote">On iPhone, notifications work from the app on your Home Screen: in Safari, tap Share → Add to Home Screen, open Cozy Home from there, and turn this on.</p>;
  else if (!sync.email) body = <div className="bk-row"><div><b>Sign in first</b><small>Notifications come through your account, so sign in to sync on this device.</small></div><button className="ghost-btn" onClick={onBackup}>Backup & sync</button></div>;
  else body = <>
    <div className="bk-row">
      <div><b>Daily research topic</b><small>A notification each day with your Deen topic. Tap it to open the Library.</small></div>
      <button className={"sw" + (on ? " on" : "")} role="switch" aria-checked={on} aria-label="Daily research topic notification" disabled={wait} onClick={() => turn(!on)}><i /></button>
    </div>
    <label className="bk-row"><div><b>At</b><small>Your local time. Each device has its own.</small></div>
      <input className="k-in st-time" type="time" value={hhmm(time)} aria-label="Notification time"
        onChange={e => { const [h, m] = e.target.value.split(":").map(Number); if (!Number.isNaN(h)) setTime(h * 60 + (m || 0)); }}
        onBlur={() => { if (on) run(() => enablePush(time), `Moved to ${hhmm(time)}.`); }} /></label>
    {on && <button className="ob-link" onClick={() => run(() => testNotification(`${topic.title} · ${topic.cat}`), "Sent a test notification to this device.")}>Show a test notification</button>}
  </>;
  return (
    <section className="bk-sec">
      <h3>Notifications</h3>
      {body}
      {msg && <p className="mnote" role="status">{msg}</p>}
    </section>
  );
}
