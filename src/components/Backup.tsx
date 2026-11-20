"use client";
import { useEffect, useRef, useState } from "react";
import { askPersistence, backupFile, isPersisted, lastBackup, parseBackup, restoreBackup, type Backup, type BackupSummary } from "@/lib/backup";
import { deleteCloudAccount, sendSignIn, signOut, syncNow, useSyncStatus, verifyCode } from "@/lib/sync";
import { Modal } from "./Arrange";

const ago = (t: number | string | null) => {
  if (!t) return "never";
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400); return d === 1 ? "yesterday" : `${d} days ago`;
};
const n = (k: number, w: string) => `${k.toLocaleString()} ${w}${k === 1 ? "" : "s"}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Network failures read as plain words; the service's own messages (wrong code, too many tries) pass through. */
const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : "";
  if (!m || /fetch|network|load failed/i.test(m)) return "Couldn’t reach the sync service. Check your connection and try again.";
  return m;
};

/** Two taps to do something you can't undo. */
function Confirm({ label, sure, onGo, className = "ghost-btn" }: { label: string; sure: string; onGo: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return <button className={className + (armed ? " danger" : "")} onClick={() => (armed ? (setArmed(false), onGo()) : setArmed(true))}>{armed ? sure : label}</button>;
}

export function BackupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} eyebrow="Your data" title="Backup & sync" onClose={onClose} wide>
      <DeviceSection />
      <SyncSection />
    </Modal>
  );
}

function DeviceSection() {
  const [kept, setKept] = useState<boolean | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<{ backup: Backup; summary: BackupSummary } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { isPersisted().then(setKept); lastBackup().then(setLast); }, []);

  const download = async () => {
    const { blob, name } = await backupFile();
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setLast(new Date().toISOString()); setMsg(`Saved ${name}. Keep it somewhere safe, like your cloud drive.`);
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try { setPending(parseBackup(await f.text())); setMsg(""); } catch (e) { setPending(null); setMsg(e instanceof Error ? e.message : "Couldn’t read that file."); }
    if (file.current) file.current.value = "";
  };
  const restore = async (mode: "replace" | "merge") => {
    if (!pending) return;
    await restoreBackup(pending.backup, mode);
    setPending(null); setMsg(mode === "replace" ? "Restored. This device now has exactly what was in the backup." : "Restored. Anything newer here was kept.");
    syncNow();
  };

  return (
    <section className="bk-sec">
      <h3>On this device</h3>
      <p className="mnote">Everything you write lives in this browser. Back it up now and then, especially before clearing site data or changing phones.</p>
      <div className="bk-row">
        <div><b>Keep it safe here</b><small>{kept ? "This browser won’t clear your data to free up space." : "Browsers can clear site data when space runs low (iPhone Safari after a week unless the app is on your Home Screen)."}</small></div>
        {kept ? <span className="bk-ok">Protected ✓</span> : <button className="ghost-btn" onClick={async () => { const r = await askPersistence(); setKept(r === "granted"); if (r !== "granted") setMsg(r === "unsupported" ? "This browser doesn’t offer that. Add the app to your Home Screen, and keep backups." : "The browser said no for now. Add the app to your Home Screen and try again; keep backups meanwhile."); }}>Protect</button>}
      </div>
      <div className="bk-row">
        <div><b>Backup file</b><small>Last backup: {ago(last)}. Photos are included.</small></div>
        <button className="mbtn" onClick={download}>Download backup</button>
      </div>
      <div className="bk-row">
        <div><b>Restore</b><small>From a backup file you downloaded before.</small></div>
        <label className="ghost-btn">Choose file<input ref={file} type="file" accept="application/json,.json" hidden onChange={e => pick(e.target.files?.[0])} /></label>
      </div>
      {pending && (
        <div className="bk-restore" role="group" aria-label="Restore this backup">
          <p><b>Backup from {day(pending.summary.exported)}</b>: {n(pending.summary.prayers, "prayer day")}, {n(pending.summary.records, "record")}, {n(pending.summary.photos, "photo")}.</p>
          <div className="mrow">
            <button className="mbtn" onClick={() => restore("merge")}>Add to what’s here</button>
            <Confirm label="Replace everything" sure="Tap again: replace all data here" onGo={() => restore("replace")} />
            <button className="ob-link" onClick={() => setPending(null)}>Cancel</button>
          </div>
          <small>“Add” keeps your newer work. “Replace” makes this device match the backup exactly{" "}and, if sync is on, removes the rest from the cloud too.</small>
        </div>
      )}
      {msg && <p className="mnote" role="status">{msg}</p>}
    </section>
  );
}

function SyncSection() {
  const s = useSyncStatus();
  const [email, setEmail] = useState(""), [code, setCode] = useState("");
  const [msg, setMsg] = useState(""), [wait, setWait] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok?: string) => { setWait(true); setMsg(""); try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(friendly(e)); } finally { setWait(false); } };

  if (!s.configured) return (
    <section className="bk-sec"><h3>Sync between devices</h3>
      <p className="mnote">Sync isn’t switched on in this version yet. Until it is, a backup file is how you move your room to another device: download it here, then restore it there.</p></section>
  );
  if (!s.email) return (
    <section className="bk-sec"><h3>Sync between devices</h3>
      <p className="mnote">Sign in with your email to keep your phone and laptop in step. Your diary stays private: only you can read it.</p>
      {!s.sentTo ? (
        <form className="bk-form" onSubmit={e => { e.preventDefault(); run(() => sendSignIn(email.trim())); }}>
          <input className="ob-input" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="mbtn" disabled={wait || !email.includes("@")}>Email me a sign-in link</button>
        </form>
      ) : (
        <form className="bk-form" onSubmit={e => { e.preventDefault(); run(() => verifyCode(s.sentTo!, code)); }}>
          <p className="mnote">We sent a link to <b>{s.sentTo}</b>. Open it on this device, or type the 6-digit code from the email:</p>
          <input className="ob-input" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="123456" aria-label="Sign-in code" value={code} onChange={e => setCode(e.target.value)} />
          <button className="mbtn" disabled={wait || code.trim().length < 6}>Sign in</button>
          <button type="button" className="ob-link" onClick={() => run(() => sendSignIn(s.sentTo!), "Sent again.")}>Send again</button>
        </form>
      )}
      {msg && <p className="mnote" role="status">{msg}</p>}
    </section>
  );
  return (
    <section className="bk-sec"><h3>Sync between devices</h3>
      <div className="bk-row">
        <div><b>{s.email}</b><small>{s.busy ? "Syncing…" : s.error ? s.error : `Last synced ${ago(s.last)}. Syncs on its own while the app is open.`}</small></div>
        <button className="mbtn" disabled={s.busy} onClick={() => syncNow()}>{s.busy ? "Syncing…" : "Sync now"}</button>
      </div>
      <div className="mrow">
        <button className="ghost-btn" onClick={() => run(signOut)}>Sign out</button>
        <Confirm label="Delete my cloud data" sure="Tap again: delete account and cloud data" onGo={() => run(deleteCloudAccount, "Your account and everything in the cloud are deleted. This device still has your data.")} />
      </div>
      <p className="mnote">Signing out keeps everything on this device. Deleting removes your account and everything stored in the cloud, photos included.</p>
      {msg && <p className="mnote" role="status">{msg}</p>}
    </section>
  );
}
