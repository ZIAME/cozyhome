/** Diary sections, one per tracker that has a diary. The catalogue (src/room/catalogue.ts) is the source of truth. */
import { TRACKERS, type Sticker, type Tab } from "@/room/catalogue";

export type { Tab };
export type Section = { title: string; sub: string; sticker: Sticker; tabs: Tab[] };

export const SECTIONS: Record<string, Section> = Object.fromEntries(
  TRACKERS.filter(t => t.tabs.length).map(t => [t.id, { title: t.title, sub: t.sub, sticker: t.sticker, tabs: t.tabs }]),
);
