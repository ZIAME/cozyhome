"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, STARTER_SETS, TRACKERS, TRACKER } from "@/room/catalogue";
import { ROOM_CAP } from "@/room/layout";
import { COUNTRIES, nearestCity, searchCities } from "@/data/cities";
import { FIVE, METHODS, defaultsFor, prayerTimes, type MethodId, type Place, type PrayerName, type PrayerSettings } from "@/lib/prayer";
import { fmtMin, todayStr } from "@/lib/dates";
import type { Profile } from "@/lib/profile";
import { TrackerIcon } from "./Arrange";

export type OnboardResult = { profile: Profile; picked: string[] };
type Props = {
  /** Editing later starts from what's saved; the first time starts empty. */
  initial?: { profile: Profile; picked: string[] };
  onDone: (r: OnboardResult) => void;
  onCancel?: () => void;
};

const placeLabel = (p: Place) => (p.country && COUNTRIES[p.country] ? `${p.name}, ${COUNTRIES[p.country]}` : p.name);

/**
 * First run: your name, what you want to track, and where home is (with prayer settings if Deen is picked).
 * The fourth step, the room building itself, happens on the home screen once this closes.
 */
export function Onboarding({ initial, onDone, onCancel }: Props) {
  const editing = !!initial;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.profile.name ?? "");
  const [picked, setPicked] = useState<string[]>(initial?.picked ?? []);
  const [place, setPlace] = useState<Place | null>(initial?.profile.place ?? null);
  const [prayer, setPrayer] = useState<PrayerSettings>(initial?.profile.prayer ?? { method: "mwl", asr: "shafii", highLat: "middle", adjust: {} });
  const [touched, setTouched] = useState(editing); // once you change the method yourself, a new place won't reset it
  const card = useRef<HTMLDivElement>(null);
  const hasDeen = picked.includes("deen");

  useEffect(() => { card.current?.querySelector<HTMLElement>("input, button.primary")?.focus(); }, [step]);

  const choosePlace = (p: Place) => {
    setPlace(p);
    if (!touched) setPrayer(s => ({ ...s, ...defaultsFor(p.country) }));
  };
  const finish = () => {
    if (!place) return;
    onDone({ picked, profile: { v: 1, name: name.trim(), place, prayer, since: initial?.profile.since || todayStr() } });
  };
  const steps = ["Name", "Trackers", "Home"];
  const canNext = [name.trim().length > 0, picked.length > 0, !!place][step];
  const next = () => { if (!canNext) return; if (step < 2) setStep(step + 1); else finish(); };

  return (
    <div id="onboard" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <div className={"ob-card" + (step === 1 ? " wide" : "")} ref={card} onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && step === 0) next(); }}>
        <div className="ob-top">
          <ol className="ob-steps" aria-label="Steps">
            {steps.map((s, i) => <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>{s}</li>)}
          </ol>
          {editing && onCancel && <button className="mx" onClick={onCancel} aria-label="Close without saving">×</button>}
        </div>

        {step === 0 && <section>
          <h1 id="obTitle">{editing ? "Your details" : "Welcome home"}</h1>
          <p className="ob-sub">What should we call you? It goes on your wall and in your greeting.</p>
          <input className="ob-input" value={name} maxLength={40} autoComplete="given-name" placeholder="Your name" aria-label="Your name" onChange={e => setName(e.target.value)} />
        </section>}

        {step === 1 && <TrackerStep picked={picked} setPicked={setPicked} />}

        {step === 2 && <section>
          <h1 id="obTitle">Where’s home?</h1>
          <p className="ob-sub">{hasDeen ? "Prayer times and the sky outside your window follow this place." : "The sky outside your window follows this place."} It stays on this device.</p>
          <PlacePicker place={place} onPick={choosePlace} />
          {place && <ClockCheck place={place} />}
          {place && hasDeen && <PrayerSettingsBox place={place} prayer={prayer} onChange={s => { setPrayer(s); setTouched(true); }} />}
        </section>}

        <div className="ob-nav">
          {step > 0 ? <button className="ob-back" onClick={() => setStep(step - 1)}>Back</button> : <span />}
          <button className="primary" disabled={!canNext} onClick={next}>{step < 2 ? "Next" : editing ? "Save" : "Build my room"}</button>
        </div>
      </div>
    </div>
  );
}

function TrackerStep({ picked, setPicked }: { picked: string[]; setPicked: (p: string[]) => void }) {
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id]);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
  const extra = picked.length - ROOM_CAP;
  return (
    <section>
      <h1 id="obTitle">What do you want to keep track of?</h1>
      <p className="ob-sub">Start from a set or pick your own. Each one becomes an object in your room.</p>
      <div className="ob-sets" role="group" aria-label="Starter sets">
        {STARTER_SETS.map(s => (
          <button key={s.id} className={"ob-set" + (same(picked, s.trackers) ? " on" : "")} aria-pressed={same(picked, s.trackers)} onClick={() => setPicked(s.trackers)}
            title={s.trackers.map(id => TRACKER[id].title).join(", ")}>{s.label}</button>
        ))}
      </div>
      <div className="cat">
        {GROUPS.filter(g => g.id !== "always").map(g => (
          <section key={g.id}><h3>{g.label}</h3><div className="cat-row">
            {TRACKERS.filter(t => t.group === g.id).map(t => {
              const on = picked.includes(t.id);
              return (
                <button key={t.id} className={"tcard pick" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={() => toggle(t.id)}>
                  <span className="tchip" style={{ background: t.colour, color: t.deep }}><TrackerIcon t={t} /></span>
                  <span><b>{t.title}</b><small>{t.sub}</small></span>
                  <i className="tick" aria-hidden="true" />
                </button>
              );
            })}
          </div></section>
        ))}
      </div>
      <p className="mnote" aria-live="polite">
        {picked.length === 0 ? "Pick at least one." : `${picked.length} picked.`}
        {extra > 0 && ` The room holds ${ROOM_CAP}; the last ${extra} will wait in the drawer.`}
        {" "}The focus clock and the surprise gift are always there.
      </p>
    </section>
  );
}

function PlacePicker({ place, onPick }: { place: Place | null; onPick: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState(""), [lng, setLng] = useState("");
  const results = useMemo(() => searchCities(q), [q]);

  const fromCoords = (la: number, ln: number, label?: string) => {
    const { city, km } = nearestCity({ lat: la, lng: ln });
    onPick({ name: label ?? (km < 40 ? city.name : `Near ${city.name}`), country: km < 400 ? city.country : undefined, lat: +la.toFixed(4), lng: +ln.toFixed(4) });
  };
  const locate = () => {
    if (!("geolocation" in navigator)) { setMsg("This browser can’t share your location. Type your city instead."); return; }
    setMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      pos => { setMsg(""); fromCoords(pos.coords.latitude, pos.coords.longitude); },
      () => setMsg("Couldn’t get your location. Type your city instead."),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };
  const la = parseFloat(lat), ln = parseFloat(lng), coordsOk = Math.abs(la) <= 90 && Math.abs(ln) <= 180 && lat.trim() !== "" && lng.trim() !== "";

  return (
    <div className="ob-place">
      {place && <div className="ob-chosen" role="status"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"/></svg><b>{placeLabel(place)}</b><small>{place.lat.toFixed(2)}, {place.lng.toFixed(2)}</small></div>}
      <button className="ob-locate" onClick={locate}>Use my location</button>
      <div className="ob-search">
        <input className="ob-input" value={q} placeholder="…or type your city" aria-label="Search for your city" onChange={e => setQ(e.target.value)} />
        {results.length > 0 && (
          <ul className="ob-results">
            {results.map(c => <li key={c.name + c.country}><button onClick={() => { onPick({ ...c }); setQ(""); }}>{c.name}<small>{COUNTRIES[c.country]}</small></button></li>)}
          </ul>
        )}
        {q.trim().length > 2 && results.length === 0 && <p className="mnote">Not in our list yet. Use your location, or enter coordinates below.</p>}
      </div>
      {msg && <p className="mnote" role="status">{msg}</p>}
      <button className="ob-link" aria-expanded={manual} onClick={() => setManual(!manual)}>Enter coordinates instead</button>
      {manual && (
        <div className="ob-coords">
          <input className="ob-input" inputMode="decimal" placeholder="Latitude, e.g. 26.85" aria-label="Latitude" value={lat} onChange={e => setLat(e.target.value)} />
          <input className="ob-input" inputMode="decimal" placeholder="Longitude, e.g. 80.95" aria-label="Longitude" value={lng} onChange={e => setLng(e.target.value)} />
          <button className="ob-locate" disabled={!coordsOk} onClick={() => fromCoords(la, ln)}>Use these</button>
        </div>
      )}
    </div>
  );
}

/**
 * Times follow this device's clock. If the place is hours away from the device's time zone (picked a far-away city,
 * or the clock is set wrong), say so, because the times will look shifted.
 */
function ClockCheck({ place }: { place: Place }) {
  const [gap, setGap] = useState(0);
  useEffect(() => { setGap((-new Date().getTimezoneOffset()) / 60 - place.lng / 15); }, [place]);
  if (Math.abs(gap) < 3) return null;
  return <p className="ob-warn" role="note">This device’s clock is set to a different time zone from {place.name}. Times are shown on the device’s clock, so they’ll look shifted until the device is there too.</p>;
}

function PrayerSettingsBox({ place, prayer, onChange }: { place: Place; prayer: PrayerSettings; onChange: (s: PrayerSettings) => void }) {
  const times = useMemo(() => prayerTimes(new Date(), place, prayer), [place, prayer]);
  const base = useMemo(() => prayerTimes(new Date(), place, { ...prayer, adjust: {} }), [place, prayer]);
  const nudge = (k: PrayerName, d: number) => {
    const v = Math.max(-30, Math.min(30, (prayer.adjust[k] ?? 0) + d));
    const adjust = { ...prayer.adjust, [k]: v }; if (!v) delete adjust[k];
    onChange({ ...prayer, adjust });
  };
  const country = place.country ? COUNTRIES[place.country] : null;
  const d = defaultsFor(place.country);
  return (
    <div className="ob-prayer">
      <h2>Prayer times</h2>
      <p className="mnote">{country ? `Usual for ${country}: ${METHODS[d.method].name}, ${d.asr === "hanafi" ? "Hanafi" : "Shafi’i"} Asr.` : "Pick the method your mosque uses."} Check today’s times against your local mosque and nudge any of them.</p>
      <label className="ob-field">Method
        <select value={prayer.method} onChange={e => onChange({ ...prayer, method: e.target.value as MethodId })}>
          {(Object.keys(METHODS) as MethodId[]).map(m => <option key={m} value={m}>{METHODS[m].name}</option>)}
        </select>
      </label>
      <div className="ob-field" role="radiogroup" aria-label="Asr">Asr
        <div className="seg">
          {(["hanafi", "shafii"] as const).map(a => <button key={a} role="radio" aria-checked={prayer.asr === a} className={prayer.asr === a ? "on" : ""} onClick={() => onChange({ ...prayer, asr: a })}>{a === "hanafi" ? "Hanafi (later)" : "Shafi’i, Maliki, Hanbali"}</button>)}
        </div>
      </div>
      {Math.abs(place.lat) > 48 && (
        <label className="ob-field">Short summer nights
          <select value={prayer.highLat} onChange={e => onChange({ ...prayer, highLat: e.target.value as PrayerSettings["highLat"] })}>
            <option value="middle">Middle of the night</option><option value="seventh">One seventh of the night</option><option value="angle">Angle-based</option>
          </select>
        </label>
      )}
      <ul className="ob-times">
        {FIVE.map(k => {
          const a = prayer.adjust[k] ?? 0;
          return (
            <li key={k}><b>{k}</b><span className="tm">{fmtMin(times[k])}{a !== 0 && <small> ({a > 0 ? "+" : ""}{a} min from {fmtMin(base[k])})</small>}</span>
              <span className="nudge"><button onClick={() => nudge(k, -1)} aria-label={`${k} one minute earlier`}>−</button><button onClick={() => nudge(k, 1)} aria-label={`${k} one minute later`}>+</button></span></li>
          );
        })}
      </ul>
    </div>
  );
}
