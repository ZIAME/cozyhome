"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Changes, Remote, RItem, RSalah, RSetting } from "./engine";

/**
 * Supabase: sign-in by email, and the cloud side of sync (tables in supabase/schema.sql, photos in the
 * private "photos" bucket). Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to turn it on.
 */
/** The project's base address. Tolerates a pasted REST endpoint (…/rest/v1/), a trailing slash or spaces. */
export const baseUrl = (u: string) => u.trim().replace(/\/+(rest|auth|storage)\/v1\/?.*$/i, "").replace(/\/+$/, "");
const URL_ = baseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const syncConfigured = !!(URL_ && KEY);

let client: Promise<SupabaseClient> | null = null;
/** The client, loaded only when sync is set up (keeps it out of the main bundle otherwise). */
export function supabase(): Promise<SupabaseClient> {
  if (!syncConfigured) return Promise.reject(new Error("Sync isn’t set up."));
  client ??= import("@supabase/supabase-js").then(m => m.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  return client;
}

const PAGE = 500;
const toCursor = (rows: { server_at: string }[], prev: string | null) => rows.reduce<string | null>((m, r) => (!m || r.server_at > m ? r.server_at : m), prev);

export class SupabaseRemote implements Remote {
  constructor(private sb: SupabaseClient, private uid: string) {}

  private async all<T extends { server_at: string }>(table: string, cursor: string | null): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = this.sb.from(table).select("*").order("server_at").range(from, from + PAGE - 1);
      if (cursor) q = q.gt("server_at", cursor);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      out.push(...(data as T[]));
      if (!data || data.length < PAGE) return out;
    }
  }
  async pull(cursor: string | null) {
    type S = { server_at: string; user_id?: string };
    const [items, salah, settings] = await Promise.all([this.all<RItem & S>("items", cursor), this.all<RSalah & S>("salah_days", cursor), this.all<RSetting & S>("settings", cursor)]);
    const next = toCursor([...items, ...salah, ...settings], cursor);
    const clean = <T extends S>(r: T) => { const { server_at: _s, user_id: _u, ...rest } = r; return rest; }; // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      items: items.map(r => ({ ...clean(r), date: r.date ?? undefined })) as RItem[],
      salah: salah.map(clean) as RSalah[], settings: settings.map(clean) as RSetting[], cursor: next,
    };
  }
  async push(c: Changes) {
    const up = async (table: string, rows: object[], key: string) => {
      for (let i = 0; i < rows.length; i += PAGE) {
        const { error } = await this.sb.from(table).upsert(rows.slice(i, i + PAGE).map(r => ({ ...r, user_id: this.uid })), { onConflict: `user_id,${key}` });
        if (error) throw new Error(error.message);
      }
    };
    await up("items", c.items.map(r => ({ ...r, date: r.date ?? null })), "id");
    await up("salah_days", c.salah, "date");
    await up("settings", c.settings, "key");
  }
  private path = (id: string) => `${this.uid}/${id}`;
  async putBlob(id: string, blob: Blob) {
    const { error } = await this.sb.storage.from("photos").upload(this.path(id), blob, { upsert: true, contentType: blob.type || undefined });
    if (error) throw new Error(error.message);
  }
  async getBlob(id: string) {
    const { data, error } = await this.sb.storage.from("photos").download(this.path(id));
    return error ? null : data;
  }
  async removeBlob(id: string) { await this.sb.storage.from("photos").remove([this.path(id)]); }

  /** Delete everything this person has in the cloud, then their sign-in. */
  async deleteAccount() {
    for (;;) {
      const { data } = await this.sb.storage.from("photos").list(this.uid, { limit: 100 });
      if (!data?.length) break;
      await this.sb.storage.from("photos").remove(data.map(f => this.path(f.name)));
    }
    const { error } = await this.sb.rpc("delete_my_account");
    if (error) throw new Error(error.message);
    await this.sb.auth.signOut();
  }
}
