import type { Prop, Pt, Spot } from "./theme";
import type { Tracker } from "./catalogue";
import { iconSvg } from "./icons";

/**
 * Draws tracker objects into a spot as SVG strings: monitor pictures for screens, and generic props
 * (wall cards, boxes, rugs) in the tracker's colours for spots where the art has no object for it.
 */

// isometric axes: U runs along the left wall (up-right), V along the right wall (down-right)
const U: Pt = [0.866, -0.5], V: Pt = [0.866, 0.5];
const add = (...ps: Pt[]): Pt => ps.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
const mul = (p: Pt, k: number): Pt => [p[0] * k, p[1] * k];
const pts = (...ps: Pt[]) => ps.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
const mtx = (a: Pt, b: Pt, o: Pt) => `matrix(${a[0]} ${a[1]} ${b[0]} ${b[1]} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;

/** Mix a #rrggbb colour toward white (k > 0) or black (k < 0). */
export function shade(hex: string, k: number) {
  const n = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const t = k > 0 ? 255 : 0, a = Math.abs(k);
  return "#" + n.map(v => Math.round(v + (t - v) * a).toString(16).padStart(2, "0")).join("");
}

const CREAM = "#FFF6E8", COCOA = "#3A2316";

function card(p: Extract<Prop, { kind: "card" }>, t: Tracker) {
  const s = p.wall === "left" ? -0.5774 : 0.5774;
  const m = `matrix(1 ${s} 0 1 ${p.at[0]} ${p.at[1]})`;
  const ic = Math.min(p.w, p.h) * 0.62;
  const body = p.inset
    ? `<rect width="${p.w}" height="${p.h}" fill="${t.colour}"/><rect x="2" y="2" width="${p.w - 4}" height="${p.h - 4}" fill="none" stroke="${CREAM}" stroke-width=".6" opacity=".7"/>`
    : `<rect x="1.2" y="1.6" width="${p.w}" height="${p.h}" rx="1.6" fill="${COCOA}" opacity=".18"/>` +
      `<rect width="${p.w}" height="${p.h}" rx="1.6" fill="#EADCBF"/><rect x="2.2" y="2.2" width="${p.w - 4.4}" height="${p.h - 4.4}" rx=".8" fill="${t.colour}"/>` +
      `<rect x="2.2" y="${p.h - 11}" width="${p.w - 4.4}" height="8.8" fill="${shade(t.colour, -0.18)}"/>`;
  const iy = p.inset ? (p.h - ic) / 2 : (p.h - 11 - ic) / 2 + 1;
  return `<g transform="${m}">${body}${iconSvg(t.icon, (p.w - ic) / 2, iy, ic, p.inset ? CREAM : t.deep, 2.2)}</g>`;
}

function box(b: Extract<Prop, { kind: "boxes" }>["boxes"][number], t: Tracker, i: number) {
  const tone = [0, 0.18, -0.1, 0.3][i % 4];
  const base = shade(t.colour, tone);
  const O = add(b.at, mul(U, -b.w / 2), mul(V, -b.d / 2));
  const P = (a: number, c: number, h: number) => add(O, mul(U, b.w * a), mul(V, b.d * c), [0, -b.h * h]);
  const left = pts(P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1));
  const right = pts(P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1));
  const top = pts(P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1));
  let s = `<polygon points="${left}" fill="${shade(base, -0.12)}"/><polygon points="${right}" fill="${shade(base, -0.28)}"/><polygon points="${top}" fill="${shade(base, 0.22)}"/>`;
  if (b.icon) {
    const [w, h, origin, ax1, ax2] =
      b.icon === "left" ? [b.d, b.h, P(0, 0, 1), V, [0, 1] as Pt] :
      b.icon === "right" ? [b.w, b.h, P(0, 1, 1), U, [0, 1] as Pt] :
      [b.w, b.d, P(0, 0, 1), U, V];
    const ic = Math.min(w, h) * 0.72;
    s += `<g transform="${mtx(ax1, ax2, origin)}">${iconSvg(t.icon, (w - ic) / 2, (h - ic) / 2, ic, b.icon === "top" ? t.deep : CREAM, 2.4)}</g>`;
  }
  return s;
}

function rug(p: Extract<Prop, { kind: "rug" }>, t: Tracker) {
  const O = add(p.at, mul(U, -p.w / 2), mul(V, -p.d / 2));
  const ic = p.d * 0.62;
  return `<g transform="${mtx(U, V, O)}">` +
    `<rect width="${p.w}" height="${p.d}" rx="3" fill="${shade(t.colour, -0.15)}"/>` +
    `<rect x="3" y="3" width="${p.w - 6}" height="${p.d - 6}" rx="2" fill="${t.colour}"/>` +
    `<rect x="7" y="7" width="${p.w - 14}" height="${p.d - 14}" rx="1.5" fill="none" stroke="${CREAM}" stroke-width="1.2" stroke-dasharray="3 2.4" opacity=".8"/>` +
    `<g transform="rotate(-90 ${p.w / 2} ${p.d / 2})">${iconSvg(t.icon, (p.w - ic) / 2, (p.d - ic) / 2, ic, CREAM, 2.2)}</g></g>`;
}

// ---------- monitor pictures (a 100×60 box) ----------
const DESIGN_UI = `<rect width="100" height="60" fill="#F6E7CF"/><rect width="100" height="8" fill="#E9CFA9"/>
<circle cx="5" cy="4" r="1.6" fill="#D2692A"/><circle cx="10" cy="4" r="1.6" fill="#E9A23B"/><circle cx="15" cy="4" r="1.6" fill="#B9A06A"/>
<rect x="0" y="8" width="13" height="52" fill="#EEDABC"/>
<rect x="3" y="13" width="7" height="5" rx="1" fill="#D2692A"/><rect x="3" y="21" width="7" height="5" rx="1" fill="#C9A37B"/><rect x="3" y="29" width="7" height="5" rx="1" fill="#C9A37B"/>
<rect x="20" y="13" width="58" height="40" rx="2" fill="#FFF9EE" stroke="#E2C59C"/>
<path d="M27 45 C 38 18, 55 52, 71 22" stroke="#D2692A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<circle cx="27" cy="45" r="2" fill="#fff" stroke="#3A2316"/><circle cx="71" cy="22" r="2" fill="#fff" stroke="#3A2316"/>
<line x1="38" y1="18" x2="27" y2="45" stroke="#3A2316" stroke-width=".6" stroke-dasharray="1.5 1"/><circle cx="38" cy="18" r="1.4" fill="#3A2316"/>
<rect x="83" y="13" width="14" height="5" rx="1" fill="#E9A23B"/><rect x="83" y="21" width="14" height="5" rx="1" fill="#D2692A"/><rect x="83" y="29" width="14" height="5" rx="1" fill="#F2D27A"/><rect x="83" y="37" width="14" height="5" rx="1" fill="#5C3A22"/>`;
const CONTENT_UI = `<rect width="100" height="60" fill="#F3E3C3"/><rect width="100" height="9" fill="#5C3A22"/>
<rect x="4" y="2.6" width="20" height="3.8" rx="1.9" fill="#E9A23B"/>
<rect x="10" y="13" width="80" height="44" rx="3" fill="#FFF9EE"/><circle cx="19" cy="22" r="5" fill="#D2692A"/>
<rect x="27" y="18.5" width="28" height="3" rx="1.5" fill="#3A2316"/><rect x="27" y="23.5" width="18" height="2.4" rx="1.2" fill="#C9A37B"/>
<rect x="15" y="31" width="68" height="2.6" rx="1.3" fill="#8A6A52"/><rect x="15" y="36" width="60" height="2.6" rx="1.3" fill="#8A6A52"/><rect x="15" y="41" width="40" height="2.6" rx="1.3" fill="#8A6A52"/>
<path d="M19 51.5 c-1.6-1.8 -4 -.4 -3 1.4 l3 2.6 3-2.6 c1-1.8 -1.4-3.2 -3-1.4z" fill="#D2692A"/>
<rect x="27" y="50" width="10" height="4" rx="2" fill="#E9CFA9"/><rect x="40" y="50" width="10" height="4" rx="2" fill="#E9CFA9"/>`;
const todayUI = (dots: boolean[]) => `<rect width="100" height="60" fill="#3A2316"/>
<path d="M60 12 a12 12 0 1 0 10 19 a9.5 9.5 0 1 1 -10 -19z" fill="#F2D27A"/>
${dots.map((y, i) => `<circle cx="${22 + i * 9}" cy="30" r="3" fill="${y ? "#E9A23B" : "#6B4A33"}"/>`).join("")}
<rect x="16" y="46" width="68" height="4" rx="2" fill="#5C3A22"/><rect x="16" y="46" width="${(68 * dots.filter(Boolean).length) / 5}" height="4" rx="2" fill="#E9A23B"/>`;
const genericUI = (t: Tracker) => `<rect width="100" height="60" fill="#FBF0DD"/><rect width="100" height="9" fill="${t.colour}"/>
<circle cx="5" cy="4.5" r="1.6" fill="${CREAM}"/><circle cx="10" cy="4.5" r="1.6" fill="${CREAM}" opacity=".6"/>
<rect x="8" y="15" width="30" height="38" rx="4" fill="${shade(t.colour, 0.55)}"/>${iconSvg(t.icon, 12, 23, 22, t.deep, 2.2)}
<rect x="45" y="17" width="44" height="5" rx="2.5" fill="${COCOA}"/>
<rect x="45" y="27" width="36" height="3" rx="1.5" fill="#B8957A"/><rect x="45" y="33" width="40" height="3" rx="1.5" fill="#B8957A"/><rect x="45" y="39" width="26" height="3" rx="1.5" fill="#B8957A"/>
<rect x="45" y="46" width="18" height="6" rx="3" fill="${t.colour}"/>`;

/** id of the filter that recolours a spot's native art (see drawProp for "tint" props). */
export const tintId = (spot: Spot) => `tint-${spot.id}`;
/** Keeps the art's light and shade, takes hue and saturation from the tracker colour. */
const tintFilter = (spot: Spot, t: Tracker) =>
  `<filter id="${tintId(spot)}" color-interpolation-filters="sRGB"><feFlood flood-color="${t.colour}" result="c"/>` +
  `<feComposite in="c" in2="SourceGraphic" operator="in" result="m"/><feBlend in="m" in2="SourceGraphic" mode="color"/></filter>`;

export type DrawCtx = { prayedDots: boolean[] };

export function screenPicture(t: Tracker, ctx: DrawCtx) {
  if (t.id === "design") return DESIGN_UI;
  if (t.id === "content") return CONTENT_UI;
  if (t.id === "today") return todayUI(ctx.prayedDots);
  return genericUI(t);
}

/** What to draw into a spot's alt layer for this tracker (empty when the art's own object shows). */
export function drawProp(spot: Spot, t: Tracker, ctx: DrawCtx): string {
  const p = spot.prop;
  switch (p.kind) {
    case "screen": return screenPicture(t, ctx);
    case "card": return card(p, t);
    case "boxes": return p.boxes.map((b, i) => box(b, t, i)).join("");
    case "rug": return rug(p, t);
    case "tint": return tintFilter(spot, t);
  }
}

/** The dashed outline an empty spot shows in arrange mode. */
export function ghost(spot: Spot) {
  if (spot.prop.kind === "screen") return `<rect class="ghost" x="3" y="3" width="94" height="54" rx="4"/>`; // screen pictures are in a 100×60 box
  const [x, y, w, h] = spot.box;
  return `<rect class="ghost" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
}
