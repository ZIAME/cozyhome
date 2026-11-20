# Cozy Home

A cozy, illustrated room that works as a personal tracker for deen, journaling, creative work and planning. Click an object in the room and a diary opens for that part of life.

Built with Next.js (App Router) and TypeScript. It installs as a PWA and keeps all data on the device (IndexedDB). Login and sync come later.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # prayer-time and room-layout tests
npm run build      # production build
```

## What's in stage 1

- **The room.** Every clickable object lifts, glows and shows a label. The three desk screens are Design Studio, LinkedIn Studio and Today.
- **Time of day.** The sky, sun, moon, window, lamps and room light follow the real time. Use the clock button (bottom right) to preview any hour.
- **Onboarding.** Name (greeting and the wall frame), trackers (starter sets or your own picks), home (your location, a city from a bundled list, or coordinates), then the room builds itself. With Deen picked, the prayer method and Asr school default from the country and can be changed, with ± minutes per prayer. Change any of it later from the Drawer pill.
- **Prayer times.** Calculated on the device: Karachi, Muslim World League, ISNA, Umm al-Qura and Egyptian methods, Hanafi or Shafi'i Asr, and a rule for short summer nights. Checked against published Lucknow timetables in `src/lib/prayer.test.ts`. Times follow the device's clock.
- **Pills.** The current prayer, with a checkbox while its time is running, plus prayers prayed today and a focus timer pill.
- **Focus timer.** The wall clock shows a countdown wedge and rings when a session is done.
- **Spots, trackers and the drawer.** The room has fixed spots (three desk screens, the left wall, two frames, the wall shelf, the coffee table, the floor, the cube shelf). Any tracker from the catalogue can sit on any spot, up to 8 trackers in the room; the rest wait in the drawer. Tap the sofa button (bottom left) to arrange the room. The clock (focus) and the gift box (surprise) are always there.
- **Every tracker works.** Deen (Salah with heatmap and streaks, ayah of the day, all 114 surahs, reflections, the library and your research board), Journal, Mood, Gratitude, Work board, Design Studio, Content Studio, Code corner, Writer's nook, Study desk, Planner, Habits, Reading list, Fitness & water, Hobbies and Today. Data stays on the device (IndexedDB, `items` table). Streaks can be hidden.
- **The diary shell.** A cover that swings open, tabs down the side, and pages that flip. The tab pages show their planned blocks until each room is built.

## Next stages

- Credits and settings, then a soft launch.

## Project map

| Path | What it is |
| --- | --- |
| `art/home.svg`, `art/clock.svg` | The original room and clock illustrations |
| `scripts/build-cabin.py` | Recolours the room, marks its spots and builds the room art (`src/room/themes/cabin.art.ts`). Re-run after editing the art: `python3 scripts/build-cabin.py` |
| `src/room/catalogue.ts` | Every tracker: title, group, icon, colours and diary tabs |
| `src/room/theme.ts`, `src/room/themes/` | Themes: art plus spot positions. A new theme keeps the same spot ids |
| `src/room/layout.ts` | Which tracker sits on which spot, the 8-tracker cap and the drawer (tested in `layout.test.ts`) |
| `src/room/props.ts` | Draws a tracker's object on a spot the art didn't draw it for (screens, wall cards, boxes, rugs, tints) |
| `src/lib/` | Prayer times, sky and lighting, dates, the profile, the on-device database |
| `src/data/cities.ts` | The bundled city list for onboarding (offline, nothing is sent anywhere) |
| `src/components/` | Home, Room, Sky, Pills, Diary, focus timer sheet, arrange and drawer sheets |
| `src/data/sections.ts` | Diary sections, built from the catalogue |
| `src/pages-registry.ts` | Which pages each tracker tab shows |
| `src/diary/` | The tracker pages: `kit.tsx` (forms, lists, boards, calendars), `deen.tsx`, `mind.tsx`, `work.tsx`, `life.tsx` |
| `src/lib/items.ts` | Reading and writing tracker records |
| `public/quran/en.json`, `src/data/surahs.ts` | Quran text and surah index, built by `node scripts/build-quran.mjs` from `quran-json` (CC BY 4.0: Uthmani text from quranenc.com, English by Saheeh International) |
| `src/data/library.ts` | Topics for the Deen library (titles only; to be reviewed) |
| `public/sw.js` | Service worker: works offline once installed |

## Backup and sync

- **Backup** works with no account: Drawer → Backup & sync → Download backup. The file has everything, photos included. Restore can add to what's on the device (newer copies win) or replace it. The same sheet asks the browser to protect the site's storage.
- **Sync** is optional and uses Supabase (sign-in by email; rows protected by row-level security; photos in a private bucket; deletions carry across devices; the newer copy wins). To switch it on:
  1. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`.
  2. In **Authentication → URL Configuration**, add your site's address (and `http://localhost:3000`) to the redirect URLs.
  3. Optional, for the installed app: in **Authentication → Email Templates → Magic Link**, add `{{ .Token }}` so the email also carries a 6-digit code.
  4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings → API). On Vercel, add the same two variables.
- The sync engine is in `src/lib/sync/engine.ts` (tested with an in-memory cloud in `sync.test.ts`); the Supabase side is `src/lib/sync/supabase.ts`.

## Deploy

Import the repo on [Vercel](https://vercel.com/new). No settings or environment variables are needed yet.

## Settings

Your name, place and prayer settings are saved on the device during onboarding (`src/lib/profile.ts`). `src/lib/config.ts` holds `SEED_DEMO`, which shows made-up prayer history; it's off.
