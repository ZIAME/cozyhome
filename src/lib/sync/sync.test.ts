import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, fromRemote } from "../db";
import { addItem, removeItem, updateItem } from "../items";
import { FRESH, MemoryRemote, syncOnce, type SyncState } from "./engine";
import { makeBackup, parseBackup, restoreBackup } from "../backup";

const wipe = () => Promise.all([db.items.clear(), db.salah.clear(), db.settings.clear(), db.tombstones.clear()]);
const tick = () => new Promise(r => setTimeout(r, 3));
beforeEach(wipe);

describe("sync", () => {
  it("pushes everything the first time and a new device pulls it back", async () => {
    const cloud = new MemoryRemote();
    await addItem("journal", "entry", { text: "hello" }, { date: "2026-11-20", blob: new Blob(["img"], { type: "image/png" }) });
    await db.salah.put({ date: "2026-11-20", p: { Fajr: "ontime" }, x: {} });
    await db.settings.put({ key: "profile", value: { name: "Afra" } });
    const a = await syncOnce(cloud, FRESH);
    expect(a.pushed).toBe(3);
    expect(cloud.blobs.size).toBe(1);

    await wipe(); // a second device, empty
    const b = await syncOnce(cloud, FRESH);
    expect(b.pulled).toBe(3);
    const e = (await db.items.toArray())[0];
    expect(e.f.text).toBe("hello");
    expect(await e.blob?.text()).toBe("img");
    expect((await db.salah.get("2026-11-20"))?.p.Fajr).toBe("ontime");
    expect((await db.settings.get("profile"))?.value).toEqual({ name: "Afra" });
  });

  it("only pushes what changed since last time", async () => {
    const cloud = new MemoryRemote();
    const it1 = await addItem("habits", "habit", { name: "Walk" });
    await addItem("habits", "habit", { name: "Read" });
    let s: SyncState = (await syncOnce(cloud, FRESH)).state;
    await tick();
    await updateItem(it1.id, { name: "Walk after Asr" });
    const r = await syncOnce(cloud, s);
    expect(r.pushed).toBe(1);
    expect(cloud.items.get(it1.id)?.f.name).toBe("Walk after Asr");
    s = r.state;
    expect((await syncOnce(cloud, s)).pushed).toBe(0);
  });

  it("keeps the newer copy when two devices edit the same thing", async () => {
    const cloud = new MemoryRemote();
    const it1 = await addItem("design", "task", { title: "v1" });
    const s = (await syncOnce(cloud, FRESH)).state;
    // another device saves a newer edit to the cloud
    const theirs = { ...cloud.items.get(it1.id)!, f: { title: "from phone" }, updated: Date.now() + 60_000 };
    await cloud.push({ items: [theirs], salah: [], settings: [] });
    await syncOnce(cloud, s);
    expect((await db.items.get(it1.id))?.f.title).toBe("from phone");
    // and an older edit from a third device doesn't overwrite it, here or in the cloud
    await cloud.push({ items: [{ ...theirs, f: { title: "stale" }, updated: 1 }], salah: [], settings: [] });
    expect(cloud.items.get(it1.id)?.f.title).toBe("from phone");
  });

  it("carries deletions to the cloud and to other devices", async () => {
    const cloud = new MemoryRemote();
    const it1 = await addItem("hobbies", "inspo", { note: "x" }, { blob: new Blob(["p"]) });
    let s = (await syncOnce(cloud, FRESH)).state;
    await tick();
    await removeItem(it1.id);
    s = (await syncOnce(cloud, s)).state;
    expect(cloud.items.get(it1.id)?.deleted).toBe(true);
    expect(cloud.blobs.has(it1.id)).toBe(false);
    // a device that still has it removes it on its next pull
    await db.items.put(fromRemote({ ...it1, updated: 1 })); // an old copy, not a fresh edit
    await syncOnce(cloud, { ...s, cursor: null });
    expect(await db.items.get(it1.id)).toBeUndefined();
  });

  it("a new device adopts the cloud's room instead of replacing it", async () => {
    const cloud = new MemoryRemote();
    await db.settings.put({ key: "profile", value: { name: "Afra" } });
    await db.settings.put({ key: "room", value: { spots: { rug: "deen" } } });
    await addItem("journal", "entry", { text: "from the laptop" });
    await syncOnce(cloud, FRESH);
    await tick();

    await wipe(); // the phone: onboarded quickly before signing in, so its settings are newer
    await db.settings.put({ key: "profile", value: { name: "A" } });
    await db.settings.put({ key: "room", value: { spots: {} } });
    await addItem("habits", "habit", { name: "phone habit" });
    await syncOnce(cloud, FRESH);
    expect((await db.settings.get("profile"))?.value).toEqual({ name: "Afra" });
    expect((await db.settings.get("room"))?.value).toEqual({ spots: { rug: "deen" } });
    expect(await db.items.count()).toBe(2); // both devices' records are kept
    expect((cloud.settings.get("profile")?.value as { name: string }).name).toBe("Afra");
  });

  it("uploads prayer days and settings saved before change-stamping existed", async () => {
    const cloud = new MemoryRemote();
    // a device that has synced before (its tasks went up), with old records that never had a stamp
    await addItem("planner", "task", { title: "old task" });
    const s = (await syncOnce(cloud, FRESH)).state;
    await db.salah.put(fromRemote({ date: "2026-11-10", p: { Fajr: "ontime", Isha: "late" }, x: {} }));
    await db.settings.put(fromRemote({ key: "profile", value: { name: "Ziana" } }));
    expect((await db.salah.get("2026-11-10"))?.updated).toBeUndefined();
    await tick();
    const r = await syncOnce(cloud, s);
    expect(r.pushed).toBe(2);
    expect(cloud.salah.get("2026-11-10")?.p).toEqual({ Fajr: "ontime", Isha: "late" });
    expect(cloud.settings.get("profile")?.value).toEqual({ name: "Ziana" });
    // and the phone gets them
    await wipe();
    await syncOnce(cloud, FRESH);
    expect((await db.salah.get("2026-11-10"))?.p.Fajr).toBe("ontime");
  });

  it("stamps local writes but keeps the cloud's stamp on pulled rows", async () => {
    await db.salah.put({ date: "2026-01-01", p: {}, x: {} });
    expect((await db.salah.get("2026-01-01"))?.updated).toBeGreaterThan(0);
    const cloud = new MemoryRemote();
    await cloud.push({ items: [], salah: [{ date: "2026-01-02", p: {}, x: {}, updated: 42 }], settings: [] });
    await syncOnce(cloud, FRESH);
    expect((await db.salah.get("2026-01-02"))?.updated).toBe(42);
  });
});

describe("backup", () => {
  it("round-trips everything, photos included", async () => {
    await addItem("journal", "entry", { text: "a day" }, { date: "2026-11-20", blob: new Blob(["photo"], { type: "image/jpeg" }) });
    await db.salah.put({ date: "2026-11-20", p: { Asr: "late" }, x: { witr: true } });
    await db.settings.put({ key: "profile", value: { name: "Afra" } });
    const text = JSON.stringify(await makeBackup());
    await wipe();
    const { backup, summary } = parseBackup(text);
    expect(summary).toMatchObject({ prayers: 1, records: 1, photos: 1 });
    await restoreBackup(backup, "replace");
    const e = (await db.items.toArray())[0];
    expect(e.f.text).toBe("a day");
    expect(await e.blob?.text()).toBe("photo");
    expect(e.blob?.type).toBe("image/jpeg");
    expect((await db.salah.get("2026-11-20"))?.x.witr).toBe(true);
  });

  it("merge keeps newer local work", async () => {
    const it1 = await addItem("writer", "idea", { text: "old" });
    const b = await makeBackup();
    await tick();
    await updateItem(it1.id, { text: "newer here" });
    await restoreBackup(b, "merge");
    expect((await db.items.get(it1.id))?.f.text).toBe("newer here");
  });

  it("replace remembers what it removed, so sync deletes it from the cloud", async () => {
    const b = await makeBackup(); // empty
    const it1 = await addItem("writer", "idea", { text: "not in backup" });
    await restoreBackup(b, "replace");
    expect(await db.items.get(it1.id)).toBeUndefined();
    expect(await db.tombstones.get(it1.id)).toBeDefined();
  });

  it("rejects files that aren't backups", () => {
    expect(() => parseBackup("hello")).toThrow(/isn’t a backup/);
    expect(() => parseBackup(JSON.stringify({ app: "other" }))).toThrow(/isn’t a Cozy Home backup/);
  });
});
