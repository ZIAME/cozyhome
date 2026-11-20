import type { Theme } from "../theme";
import { CABIN_ART } from "./cabin.art";

/**
 * The cabin: the warm isometric room from the prototype. Spot positions are measured from art/home.svg
 * (the path ranges for each spot live in scripts/build-cabin.py).
 */
export const CABIN: Theme = {
  id: "cabin",
  name: "Cabin",
  art: CABIN_ART,
  spots: [
    { id: "screen-left", label: "Desk · left screen", kind: "screen", prop: { kind: "screen" }, box: [257, 165, 45, 29] },
    { id: "screen-mid", label: "Desk · middle screen", kind: "screen", prop: { kind: "screen" }, box: [305, 174, 33, 41] },
    { id: "screen-right", label: "Desk · right screen", kind: "screen", prop: { kind: "screen" }, box: [341, 194, 21, 46] },
    { id: "wall-left", label: "Left wall", kind: "wall", native: { tracker: "planner" },
      prop: { kind: "card", wall: "left", at: [91.5, 160], w: 32, h: 50 }, box: [90, 139, 35, 72] },
    { id: "wall-shelf", label: "Wall shelf", kind: "shelf", native: { tracker: "deen", tab: "library" },
      prop: { kind: "tint" }, box: [300, 112, 59, 62] },
    { id: "frame-a", label: "Back wall · first frame", kind: "wall", decor: true,
      prop: { kind: "card", wall: "right", at: [275.5, 83.5], w: 20, h: 37, inset: true }, box: [272, 78, 27, 59] },
    { id: "frame-b", label: "Back wall · second frame", kind: "wall", decor: true,
      prop: { kind: "card", wall: "right", at: [372.5, 139.5], w: 20, h: 37, inset: true }, box: [369, 134, 28, 59] },
    { id: "table", label: "Coffee table", kind: "surface", native: { tracker: "journal" },
      prop: { kind: "boxes", boxes: [{ at: [186, 319], w: 20, d: 14, h: 3, icon: "top" }] }, box: [147, 298, 90, 78] },
    { id: "rug", label: "Floor", kind: "floor", native: { tracker: "deen", tab: "salah" },
      prop: { kind: "rug", at: [278, 397], w: 112, d: 40 }, box: [211, 358, 134, 79] },
    { id: "rug-book", label: "Floor · by the table", kind: "floor", native: { tracker: "deen", tab: "quran" },
      prop: { kind: "boxes", boxes: [{ at: [278, 357], w: 18, d: 13, h: 7, icon: "top" }] }, box: [260, 342, 36, 26] },
    { id: "cube-shelf", label: "Cube shelf", kind: "shelf", native: { tracker: "hobbies" },
      prop: { kind: "tint" }, box: [342, 241, 126, 142] },
  ],
  fixed: [
    { id: "clock", tracker: "focus", label: "Wall clock" },
    { id: "gift", tracker: "surprise", label: "Gift box" },
  ],
  nameplate: { w: 13, h: 28.5, colour: "#FBF1E1" },
};
