/**
 * A theme is a room: its art, its palette, and where its spots are.
 * Every theme has the same spot ids, so a layout carries over when the theme changes; only the art and positions differ.
 *
 * How a spot looks:
 *  - The art draws one object at each spot (its "native" tracker). When that tracker sits there, the art shows as drawn.
 *  - When another tracker sits there, the native object is hidden and the spot's `prop` is drawn in that tracker's colours
 *    (or, for a "tint" prop, the native object stays and takes on the tracker's colour).
 *  - `decor` spots (picture frames) have no native tracker: their art is decoration that shows while the spot is empty.
 */
export type Pt = [number, number];

/** Generic objects a theme can draw at a spot. Coordinates are in the room's SVG units. */
export type Prop =
  /** A desk monitor. Its 100×60 picture comes from the tracker (src/room/props.ts). */
  | { kind: "screen" }
  /** A card hung on a wall: a framed board, or (inset) the print inside an existing frame. `at` is its top-left corner. */
  | { kind: "card"; wall: "left" | "right"; at: Pt; w: number; h: number; inset?: boolean }
  /** Isometric boxes standing on the floor or a surface. `at` is the centre of each box's footprint. */
  | { kind: "boxes"; boxes: { at: Pt; w: number; d: number; h: number; icon?: "left" | "right" | "top" }[] }
  /** Keep the art's own object and tint it in the tracker's colour (books on a shelf, storage boxes). */
  | { kind: "tint" }
  /** A flat rug or mat on the floor. `at` is its centre; w runs along the left wall, d along the right wall. */
  | { kind: "rug"; at: Pt; w: number; d: number };

export type SpotKind = "screen" | "wall" | "shelf" | "surface" | "floor";
export type Spot = {
  id: string;
  /** Shown in arrange mode. */
  label: string;
  kind: SpotKind;
  /** The tracker the art draws here (and the page it opens by default). */
  native?: { tracker: string; tab?: string };
  decor?: boolean;
  prop: Prop;
  /** Rough bounds [x, y, w, h], for the empty-spot outline in arrange mode. */
  box: [number, number, number, number];
};
/** Objects that are always in the room, on the same place in every layout. */
export type FixedSpot = { id: string; tracker: string; label: string };

export type Theme = {
  id: string;
  name: string;
  /** The room SVG, built by a script from the theme's art. Must contain a group per spot (data-spot="…"). */
  art: string;
  spots: Spot[];
  fixed: FixedSpot[];
  /** A frame the owner's name is written on: a <g id="nameplate"> in the art, w×h in its own units. */
  nameplate?: { w: number; h: number; colour: string };
};
