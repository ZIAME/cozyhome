import type { DayTimes } from "./prayer";

export type LookKey = "night" | "dawn" | "morning" | "noon" | "afternoon" | "golden" | "sunset" | "dusk";
type Look = { t: string; m: string; b: string; h1: string; h2: string; tc: string; to: number; l: number; s: number; c: number; sn: number; wt: string; wb: string; d: number };

/** Sky colours, room tint, lamp glow, stars, clouds, snow and window sky for each part of the day. */
const LOOKS: Record<LookKey, Look> = {
  night:    { t: "#151229", m: "#2B1F3D", b: "#4A2E3E", h1: "#3B2638", h2: "#2E1D2C", tc: "#3A2A55", to: 0.34, l: 1, s: 1, c: 0, sn: 0.9, wt: "#141128", wb: "#3A2742", d: 1 },
  dawn:     { t: "#3E3560", m: "#B5728A", b: "#F2A97E", h1: "#8E6070", h2: "#6E4858", tc: "#5A3A6A", to: 0.25, l: 0.55, s: 0.35, c: 0.2, sn: 0.2, wt: "#5B4A78", wb: "#F2A97E", d: 1 },
  morning:  { t: "#A9CFE2", m: "#E8E2D4", b: "#FBE6C8", h1: "#E9CFA9", h2: "#DDB68A", tc: "#FFE7C0", to: 0, l: 0, s: 0, c: 1, sn: 0, wt: "#9CC8E0", wb: "#FBEAD0", d: 0 },
  noon:     { t: "#8FC2DE", m: "#D9E6E4", b: "#F6E9D2", h1: "#E5CBA3", h2: "#D7B084", tc: "#FFF0D6", to: 0, l: 0, s: 0, c: 1, sn: 0, wt: "#8DC0DD", wb: "#F2EBDB", d: 0 },
  afternoon:{ t: "#B9C9D2", m: "#F0D9B4", b: "#F7D7A6", h1: "#E7C28F", h2: "#D6A672", tc: "#FFC98A", to: 0.08, l: 0, s: 0, c: 0.8, sn: 0, wt: "#C7D3D4", wb: "#F6CF97", d: 0 },
  golden:   { t: "#E7A066", m: "#F3BE7A", b: "#F9D9A0", h1: "#D99A60", h2: "#C07C48", tc: "#FFAA5E", to: 0.2, l: 0.25, s: 0, c: 0.5, sn: 0, wt: "#EFA25E", wb: "#FAD79B", d: 0 },
  sunset:   { t: "#7A4A72", m: "#D9693A", b: "#F2A74F", h1: "#A15A48", h2: "#7E4134", tc: "#C4573A", to: 0.3, l: 0.6, s: 0.15, c: 0.2, sn: 0, wt: "#8A4C6E", wb: "#EC8B48", d: 1 },
  dusk:     { t: "#2D2348", m: "#6B3E5E", b: "#B8644A", h1: "#5A3446", h2: "#432636", tc: "#4A2E58", to: 0.3, l: 0.9, s: 0.7, c: 0, sn: 0.6, wt: "#2E2550", wb: "#A85A4C", d: 1 },
};
export const PHASE_NAME: Record<LookKey, string> = { night: "Night", dawn: "Dawn", morning: "Morning", noon: "Midday", afternoon: "Afternoon", golden: "Golden hour", sunset: "Sunset", dusk: "Dusk" };

const frames = (P: DayTimes): { m: number; k: LookKey }[] => [
  { m: 0, k: "night" }, { m: P.Fajr - 25, k: "night" }, { m: P.Fajr + 20, k: "dawn" }, { m: P.Sunrise + 45, k: "morning" },
  { m: P.Dhuhr, k: "noon" }, { m: P.Asr + 20, k: "afternoon" }, { m: P.Maghrib - 30, k: "golden" }, { m: P.Maghrib + 8, k: "sunset" },
  { m: P.Maghrib + 40, k: "dusk" }, { m: P.Isha + 30, k: "night" }, { m: 1440, k: "night" },
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpC = (a: string, b: string, t: number) => {
  const p = (x: string) => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, "0")).join("");
};
export type SkyState = Look & { key: LookKey };

/** Blend smoothly between the looks around this minute of the day. */
export function skyAt(P: DayTimes, min: number): SkyState {
  const F = frames(P);
  let i = 0;
  while (i < F.length - 2 && F[i + 1].m <= min) i++;
  const a = F[i], b = F[i + 1];
  const t = b.m === a.m ? 0 : Math.min(1, Math.max(0, (min - a.m) / (b.m - a.m)));
  const A = LOOKS[a.k], B = LOOKS[b.k];
  const o = {} as Look;
  for (const k of Object.keys(A) as (keyof Look)[]) (o as Record<string, unknown>)[k] = typeof A[k] === "string" ? lerpC(A[k] as string, B[k] as string, t) : lerp(A[k] as number, B[k] as number, t);
  return { ...o, key: t < 0.5 ? a.k : b.k };
}
