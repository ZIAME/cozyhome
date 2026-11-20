"use client";
import { useEffect, useSyncExternalStore } from "react";
import { FRESH, syncOnce, type SyncState } from "./engine";
import { SupabaseRemote, supabase, syncConfigured } from "./supabase";

/**
 * Sync status for the whole app (one store, many readers) and the actions behind the Backup & sync sheet.
 * Syncs when you sign in, when the app opens or comes back into view, when you're back online, and every minute
 * while it's open.
 */
export type SyncStatus = {
  configured: boolean;
  email: string | null;
  busy: boolean;
  last: number | null;
  error: string | null;
  /** After asking for a sign-in email. */
  sentTo: string | null;
};
let st: SyncStatus = { configured: syncConfigured, email: null, busy: false, last: null, error: null, sentTo: null };
const subs = new Set<() => void>();
const set = (p: Partial<SyncStatus>) => { st = { ...st, ...p }; subs.forEach(f => f()); };
export const useSyncStatus = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => st, () => st);

let uid: string | null = null;
const stateKey = () => `cozy-sync:${uid}`;
const load = (): SyncState => { try { return { ...FRESH, ...JSON.parse(localStorage.getItem(stateKey()) || "{}") }; } catch { return FRESH; } };
const save = (s: SyncState & { last?: number }) => { try { localStorage.setItem(stateKey(), JSON.stringify(s)); } catch { /* private mode */ } };

let running: Promise<void> | null = null;
/** Sync now (does nothing if signed out, or if a sync is already running). */
export function syncNow(): Promise<void> {
  if (!syncConfigured || !uid) return Promise.resolve();
  if (typeof navigator !== "undefined" && !navigator.onLine) { set({ error: "You’re offline. Changes will sync when you’re back." }); return Promise.resolve(); }
  running ??= (async () => {
    set({ busy: true, error: null });
    try {
      const sb = await supabase();
      const res = await syncOnce(new SupabaseRemote(sb, uid!), load());
      const last = Date.now();
      save({ ...res.state, last }); set({ last });
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      set({ error: /fetch|network|load failed/i.test(m) || !m ? "Couldn’t reach the sync service. It will try again." : `Sync failed: ${m}. It will try again.` });
    } finally { set({ busy: false }); running = null; }
  })();
  return running;
}

let started = false;
/** Mount once (in Home): restores the session, and keeps syncing in the background. */
export function useAutoSync() {
  useEffect(() => {
    if (!syncConfigured || started) return;
    started = true;
    let timer = 0;
    supabase().then(sb => {
      const apply = (u: { id: string; email?: string } | null) => {
        const was = uid; uid = u?.id ?? null;
        set({ email: u?.email ?? null, last: uid ? (JSON.parse(localStorage.getItem(stateKey()) || "{}").last ?? null) : null });
        if (uid && uid !== was) syncNow();
      };
      sb.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
      sb.auth.onAuthStateChange((_e, s) => apply(s?.user ?? null));
    }).catch(() => {});
    const kick = () => { if (document.visibilityState === "visible") syncNow(); };
    document.addEventListener("visibilitychange", kick);
    addEventListener("online", kick);
    timer = window.setInterval(kick, 60_000);
    return () => { document.removeEventListener("visibilitychange", kick); removeEventListener("online", kick); clearInterval(timer); started = false; };
  }, []);
}

/** Email a sign-in link (and code). The link brings you back here signed in. */
export async function sendSignIn(email: string) {
  const sb = await supabase();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(error.message);
  set({ sentTo: email });
}
/** For when the link opens in another browser (an installed app): type the 6-digit code instead. */
export async function verifyCode(email: string, code: string) {
  const sb = await supabase();
  const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
  if (error) throw new Error(error.message);
  set({ sentTo: null });
}
export async function signOut() {
  const sb = await supabase();
  await sb.auth.signOut();
  set({ email: null, last: null, sentTo: null });
}
/** Remove everything from the cloud and the account itself. What's on this device stays. */
export async function deleteCloudAccount() {
  if (!uid) return;
  const sb = await supabase();
  await new SupabaseRemote(sb, uid).deleteAccount();
  try { localStorage.removeItem(stateKey()); } catch { /* ignore */ }
  uid = null; set({ email: null, last: null });
}
export { syncConfigured };
