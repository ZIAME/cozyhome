# Afra's Home

A cozy, illustrated room that works as a personal tracker for deen, journaling, creative work and planning. Click an object in the room and a diary opens for that part of life.

Built with Next.js (App Router) and TypeScript. It installs as a PWA and keeps all data on the device (IndexedDB). Login and sync come later.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # prayer-time tests
npm run build      # production build
```

## What's in stage 1

- **The room.** Every clickable object lifts, glows and shows a label. The three desk screens are Design Studio, LinkedIn Studio and Today.
- **Time of day.** The sky, sun, moon, window, lamps and room light follow the real time. Use the clock button (bottom right) to preview any hour.
- **Prayer times.** Calculated on the device for Lucknow, using the Karachi method with Hanafi Asr (`src/lib/config.ts`). They're checked against published timetables in `src/lib/prayer.test.ts`.
- **Pills.** The current prayer, with a checkbox while its time is running, plus prayers prayed today and a focus timer pill.
- **Focus timer.** The wall clock shows a countdown wedge and rings when a session is done.
- **The diary shell.** A cover that swings open, tabs down the side, and pages that flip. The tab pages show their planned blocks until each room is built.

## Next stages

2. Deen pages: Salah tracker and heatmap, Quran, reflections, library.
3. Journal, Hobbies, Design Studio, LinkedIn Studio, Planner.
4. Supabase login and sync across devices.

## Project map

| Path | What it is |
| --- | --- |
| `art/home.svg`, `art/clock.svg` | The original room and clock illustrations |
| `scripts/build-cabin.py` | Recolours the room and builds the interactive SVG (`src/data/cabinSvg.ts`). Re-run after editing the art: `python3 scripts/build-cabin.py` |
| `src/lib/` | Prayer times, sky and lighting, dates, the on-device database |
| `src/components/` | Home, Room, Sky, Pills, Diary, focus timer sheet |
| `src/data/sections.ts` | Diary sections and tabs, and which object opens which |
| `src/pages-registry.ts` | Where real diary pages plug in, by section and tab |
| `public/sw.js` | Service worker: works offline once installed |

## Deploy

Import the repo on [Vercel](https://vercel.com/new). No settings or environment variables are needed yet.

## Settings

`src/lib/config.ts` holds:
- the location
- the prayer calculation method (`asr: 1` for Shafi'i)
- the name in the greeting
- `SEED_DEMO`, which shows sample prayer history until you mark your own. Set it to `false` to start empty.
