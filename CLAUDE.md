# Cozy Home: launch version brief

A cozy, illustrated room that works as a personal tracker. Each object in the room opens a diary for one part of life (deen, journal, work, planning…). This brief holds the decisions from the prototype phase, so the launch version can start fresh with all the context.

- **Prototype (reference only, keep as is):** "Afra's Home" artifact on claude.ai. A single-page HTML prototype with the full room, diary and all room pages working on browser storage.
- **Stage-1 codebase (optional starting point):** `cozyhome-stage1.zip`. Next.js 15 + TypeScript PWA with the room home screen, sky, prayer engine (tested), pills, focus timer and diary shell. It isn't pushed yet; the target repo is `github.com/ZIAME/cozyhome`.

## Who it's for
People from different fields who want one cozy place to track several things. The owner is a freelance product/UX designer who wants it for herself first, then a public launch.

## Onboarding (new)
1. **Name.** Used in the greeting and on the wall frame.
2. **Pick trackers.** Cards with each object's illustration, plus starter sets ("Designer", "Student", "Muslim creative"…) and custom picking.
3. **Location.** "Use my location" or type a city. If Deen is picked, the prayer method and Asr school default from the country (India → Karachi + Hanafi, Saudi → Umm al-Qura, US → ISNA) and can be changed, with a ± minutes adjustment per prayer.
4. **Reveal.** The room builds itself and objects pop into their spots.

## Tracker catalogue (draft)
| Group | Trackers |
|---|---|
| Faith | Deen: Salah, Quran, Reflections, Library. **No Fiqh section.** |
| Mind | Journal, Mood, Gratitude |
| Work | Work board (any freelancer), Design Studio, Content Studio (LinkedIn/Instagram/YouTube, generalised from LinkedIn Studio), Code corner, Writer's nook |
| Study | Study desk: subjects, assignments, exam countdown, revision |
| Life | Planner, Habits, Reading list, Fitness & water, Hobbies & creative |
| Always on | Focus timer (wall clock), Surprise me (gift box) |

## Room architecture
- The room has fixed spots (desk, left wall, right wall, shelf, floor, window sill…). Each tracker has an illustrated object per spot.
- Cap the room at about 8 trackers; the rest live in a drawer.
- Themes (later) = new art + palette + spot positions for the same spots. Build the spots system with themes in mind from day one.
- The prototype room started from a stock vector; it needs a commercial licence check, or (preferred) a redraw by the owner.

## Pages per tracker (from the prototype, all working there)
- **Diary shell:** a leather cover swings open over the blurred home, coloured tabs down the right edge, and a 3D page flip between tabs (forward or back). Single page with swipe on phones.
- **Deen:**
  - Salah: the day's prayers with On time / Late / Qada / Missed (qada counts as prayed), plus Witr, Tahajjud and Sunnah. Heatmap with month navigation, streak (all five) and best streak; tap a day to edit it.
  - Quran: ayah of the day (random, stable for the day, skipping short fragments) with a reflection box; tracker for all 114 surahs with a checkbox, current ayah and % of 6,236 ayahs.
  - Reflections: by date, searchable by surah.
  - Library: topic generator for Prophets, Seerah, Sahabah, Hadith, History, Tafsir (titles only, no explanations); the right page is "my research" with To research / Researching / Done, notes and sources.
- **Journal:** prompt generator (Random & fun, Gratitude, Self-reflection, Deen, Creative & work), entry with mood scale, tags and photo, calendar coloured by mood, on this day (a month and a year ago).
- **Hobbies:** hobby cards with logs, idea jar, inspiration board (images), experiments log.
- **Design Studio:** kanban (To do / Ongoing / Done; client, deadline, priority, notes; client filter; drag or arrows), projects (status, links, notes), notebook by six content pillars with "Turn into LinkedIn post →".
- **LinkedIn Studio:** idea bank + draft editor (3,000-character count, Copy button, no auto-posting), pipeline Idea → Drafting → Ready → Posted, content calendar.
- **Planner:** today timeline with the five prayer times as fixed markers, time blocks, tasks pulled from every room, habits with a 7-day strip, week view.

## Home screen
- The sky follows the real time of day, keyed to prayer times (night, dawn, morning, midday, afternoon, golden hour, sunset, dusk). It has a sun and moon arc, stars, clouds and snow at night. The window shows its own sky, lamps glow after dark, and the room tints at night.
- Hover or tap: the object lifts and glows, a label shows a live count, and an idle sparkle hints that it's clickable. On phones, the first tap shows the label and the second opens.
- Pills under the room:
  - prayers today (x/5 + dots). During a prayer's time this pill splits: a checkbox on the left to mark it, the count on the right. The checkbox disappears when the time ends.
  - the current prayer and until when, or "Next: X at time" between sunrise and Dhuhr
  - tasks left, Quran, journal streak
  - a focus pill while the timer runs
- The next prayer is shown only on the Today screen's hover label.
- Focus timer: the wall clock shows a countdown wedge; presets of 15/25/45/60; rings and chimes when done; survives a refresh.

## Cat companion (new)
- **In-app:** a cat wanders the room, shows your next task, and tap opens it. Easy.
- **Desktop:** a floating cat over other windows needs a small companion app (Tauri). Doable.
- **Android:** a home-screen widget comes with the Play Store wrapper. A cat floating over other apps needs a special permission, which is risky.
- **iPhone:** a home or lock-screen widget only through the App Store route. A cat floating over other apps is not allowed by Apple.

## Design direction
- **Mood:** cozy, warm, orangish, bright and high-contrast inside the room.
- **Palette:**
  - cocoa #3A2316, brown #5C3A22
  - ember #D2692A, honey #E9A23B, butter #F2D27A
  - caramel #C98E4E, oat #EFE9DF, cream #FFF6E8
  - peach #E6CBB3, blush #E8A091
- **Fonts:** headings in Fredoka (bubbly, thick), body in Nunito, Arabic in Amiri. Bundle them via @fontsource so they work offline.

## Technical decisions
- **App:** Next.js + TypeScript PWA (manifest, icons, offline service worker). Deploy on Vercel.
- **Data:** local-first now (IndexedDB via Dexie; photos as blobs). Each table maps to a future Supabase table. Then Supabase auth + sync with row-level security, export/import backup, and asking the browser for persistent storage.
- **Prayer times:** calculated on the device (PrayTimes-style astronomy). Verified to the minute against published Lucknow timetables (gtaf.org Hanafi; ihadis.com Karachi). Methods to support: Karachi, MWL, ISNA, Umm al-Qura, Egyptian; Hanafi or Shafi'i Asr; high-latitude rules.
- **Quran data:** npm `quran-json` (Uthmani text from quranenc.com; English is Saheeh International; package licence CC BY-SA 4.0). It needs a credits page, and its terms must be checked for public use. Ship it as a static JSON file, not inside the JS bundle.

## Launch risks and their plans
| Risk | Plan |
|---|---|
| Data loss (local-only; iPhone Safari can wipe sites not added to the home screen after ~7 days) | Sync + backup before public launch |
| Built for one person | Onboarding + tracker catalogue |
| Prayer accuracy | Methods + per-prayer adjustment |
| Religious content | No AI answers; a knowledgeable person reviews the topic list; a "report a mistake" button |
| Worship gamification | Private by default, streaks can be hidden |
| Art licence | Redraw |
| Privacy (personal journals; India's DPDP Act) | Policy, account deletion, RLS; legal review |
| Performance | Simple view, reduced motion, pause animations in the background |
| Stores | Play Store via a wrapper (one-time ~$25 developer fee); iOS uncertain (Mac + $99/yr, possible rejection of web wrappers) |

## Suggested build order
1. Spots-based room
2. Onboarding
3. Deen
4. The other trackers
5. In-app cat
6. Sync and backup
7. Credits and settings
8. Soft launch to 10–20 people
9. Play Store, then desktop cat and widgets
10. Themes
