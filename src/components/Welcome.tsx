"use client";
import { useEffect, useRef, useState } from "react";
import { googleEnabled, signOut, syncConfigured, syncNow, useSyncStatus } from "@/lib/sync";
import { CITIES } from "@/data/cities";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, LUCKNOW, defaultsFor, type Place } from "@/lib/prayer";
import { STARTER_SETS } from "@/room/catalogue";
import { todayStr } from "@/lib/dates";
import { Onboarding, type OnboardResult } from "./Onboarding";
import { SignInForm } from "./Backup";

/**
 * The front door, for a device with no room yet.
 * - Create my room: sign up (Google or email), then the setup once.
 * - I already have an account: sign in and go straight to the room. If the account has no saved room, a fresh one
 *   is made with sensible defaults; it never runs the setup again.
 * - Try it without an account: the setup, with everything kept on this device.
 * The choice survives the trip to Google or the email link (it's remembered in this browser).
 */
type Intent = "signup" | "signin" | "local";
const INTENT = "cozy-auth-intent";
const readIntent = (): Intent | null => { try { return localStorage.getItem(INTENT) as Intent | null; } catch { return null; } };
const writeIntent = (i: Intent | null) => { try { if (i) localStorage.setItem(INTENT, i); else localStorage.removeItem(INTENT); } catch { /* private mode */ } };

/** A first name from Google, or from the email address. */
export function nameFrom(name: string | null, email: string | null) {
  const n = name?.trim().split(/\s+/)[0];
  if (n) return n;
  const local = (email ?? "").split("@")[0].replace(/[0-9._-]+/g, " ").trim().split(/\s+/)[0] ?? "";
  return local ? local[0].toUpperCase() + local.slice(1) : "Friend";
}
/** A place from the device's time zone (e.g. Asia/Kolkata → Kolkata), else Lucknow. Changeable in Settings. */
export function placeFromTimeZone(tz: string): Place {
  const aliases: Record<string, string> = { Calcutta: "Kolkata", Bombay: "Mumbai", Saigon: "Ho Chi Minh City" };
  const last = (tz.split("/").pop() ?? "").replace(/_/g, " ");
  const want = (aliases[last] ?? last).toLowerCase();
  const c = CITIES.find(x => x.name.toLowerCase() === want);
  return c ? { ...c } : LUCKNOW;
}

export function Welcome({ onDone }: { onDone: (r: OnboardResult & { auto?: boolean }) => void }) {
  const s = useSyncStatus();
  const [screen, setScreen] = useState<Intent | "choose">(() => (syncConfigured ? "choose" : "local"));
  const intent = s.email ? readIntent() : screen === "choose" ? null : screen;
  const made = useRef(false);

  // Signed in, synced, and still no room: sign-in makes a fresh room straight away (never the setup again).
  const freshNeeded = !!s.email && s.synced && !s.error && intent !== "signup";
  useEffect(() => {
    if (!freshNeeded || made.current) return;
    made.current = true;
    // the sync may have just brought a room down; never make a fresh one over it
    db.settings.get("profile").then(existing => {
    if (existing) return;
    const place = placeFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    writeIntent(null);
    onDone({
      auto: true,
      picked: STARTER_SETS[0].trackers,
      profile: { v: 1, name: nameFrom(s.name, s.email), place, prayer: { ...DEFAULT_SETTINGS, ...defaultsFor(place.country), adjust: {} }, since: todayStr() },
    });
    });
  }, [freshNeeded, s.name, s.email, onDone]);

  if (!s.checked) return null;

  // ---- signed in: wait for the room to come down from the account ----
  if (s.email) {
    if (s.error) return (
      <Card title="Couldn’t reach your account">
        <p className="ob-sub">Signed in as <b>{s.email}</b>, but your room couldn’t be fetched.</p>
        <p className="ob-warn" role="status">{s.error}</p>
        <div className="ob-nav"><button className="ob-link" onClick={() => { writeIntent(null); signOut(); }}>Sign out</button><button className="primary" onClick={() => syncNow()}>Try again</button></div>
      </Card>
    );
    if (!s.synced) return <Card title="Opening your room…"><p className="ob-sub" role="status">Signed in as <b>{s.email}</b>. Bringing your room over.</p></Card>;
    if (intent === "signup") return <Onboarding onDone={r => { writeIntent(null); onDone(r); }} initialName={nameFrom(s.name, s.email)} />;
    return <Card title="Setting up your room…"><p className="ob-sub" role="status">One moment.</p></Card>;
  }

  // ---- not signed in ----
  if (screen === "local") return <Onboarding onDone={onDone} onBack={syncConfigured ? () => setScreen("choose") : undefined} />;
  if (screen === "choose") return (
    <Card title="Welcome to Cozy Home" wide={false}>
      <p className="ob-sub">A cozy little room that keeps track of your days: prayers, journal, work, study and more.</p>
      <div className="wl-choices">
        <button className="primary" onClick={() => setScreen("signup")}>Create my room</button>
        <button className="wl-second" onClick={() => setScreen("signin")}>I already have an account</button>
      </div>
      <button className="ob-link wl-local" onClick={() => { writeIntent("local"); setScreen("local"); }}>Try it without an account</button>
      <p className="mnote">Without an account, your room lives only on this device.</p>
    </Card>
  );
  return <AuthScreen intent={screen} onBack={() => { writeIntent(null); setScreen("choose"); }} />;
}

function AuthScreen({ intent, onBack }: { intent: "signup" | "signin"; onBack: () => void }) {
  const [err, setErr] = useState("");
  useEffect(() => { writeIntent(intent); }, [intent]);
  return (
    <Card title={intent === "signup" ? "Create your account" : "Sign in"}>
      <p className="ob-sub">{intent === "signup" ? "Your room is saved to your account, so it’s on every device you sign in on." : "Welcome back. Your room will be waiting."}</p>
      {googleEnabled && <>
        <button className="wl-google" onClick={async () => { setErr(""); try { const { signInWithGoogle } = await import("@/lib/sync"); await signInWithGoogle(); } catch (e) { setErr(e instanceof Error ? e.message : "Google sign-in didn’t work."); } }}>
          <GoogleG /> Continue with Google
        </button>
        <div className="wl-or"><span>or with your email</span></div>
      </>}
      <SignInForm cta={intent === "signup" ? "Email me a link to create my account" : "Email me a sign-in link"} />
      {err && <p className="ob-warn" role="status">{err}</p>}
      <div className="ob-nav"><button className="ob-back" onClick={onBack}>Back</button><span /></div>
    </Card>
  );
}

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div id="onboard" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <div className={"ob-card" + (wide ? " wide" : "")}><section><h1 id="obTitle">{title}</h1>{children}</section></div>
    </div>
  );
}

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

