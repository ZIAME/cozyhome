"use client";
import { supabase, syncConfigured } from "./sync/supabase";

/**
 * Daily topic notifications. This device subscribes to web push and saves the subscription (plus the chosen time
 * and its time zone) in Supabase; the daily-topic function sends the notification. Needs sync (sign-in) and
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY. On iPhone it only works from the Home Screen app (iOS 16.4+).
 */
export const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
const TIME_KEY = "cozy-push-time";

export type PushSupport = "ok" | "off" | "unsupported" | "ios-home-screen";
export function pushSupport(): PushSupport {
  if (!syncConfigured || !VAPID_PUBLIC_KEY) return "off";
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-home-screen";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

const keyBytes = (b64: string) => {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};
async function registration() {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  return navigator.serviceWorker.ready.then(() => reg);
}
export const savedTime = () => { try { return Number(localStorage.getItem(TIME_KEY)) || 480; } catch { return 480; } };

/** Is this device subscribed right now? */
export async function isSubscribed() {
  if (pushSupport() !== "ok") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription()) && Notification.permission === "granted";
}

/** Ask permission, subscribe this device, and save it with the time (minutes after midnight, local). */
export async function enablePush(minute: number) {
  if (pushSupport() !== "ok") throw new Error("Notifications aren’t available here.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.");
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const sb = await supabase();
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Sign in to sync first (Backup & sync), then turn this on.");
  const { error } = await sb.from("push_subscriptions").upsert({
    endpoint: j.endpoint, user_id: data.session.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth,
    minute_of_day: minute, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", enabled: true,
  }, { onConflict: "endpoint" });
  if (error) throw new Error(error.message);
  try { localStorage.setItem(TIME_KEY, String(minute)); } catch { /* private mode */ }
}

/** Stop notifications on this device. */
export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try { const sb = await supabase(); await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); } catch { /* offline: the server drops it when it bounces */ }
    await sub.unsubscribe();
  }
}

/** A local test notification, to check this device shows them. */
export async function testNotification(body: string) {
  const reg = await registration();
  await reg.showNotification("Today’s research topic", { body, icon: "/icons/icon-192.png", tag: "daily-topic-test", data: { url: "/?open=deen/library" } });
}
