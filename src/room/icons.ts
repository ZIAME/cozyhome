/**
 * Tracker icons: SVG markup for a 24×24 box, drawn with strokes (the caller sets stroke colour and width).
 * They're plain strings so the same icon works in React and inside the room SVG.
 */
export const ICONS = {
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/><path d="M17 3.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"/>',
  pen: '<path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14.5 6.2l3.3 3.3"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><path d="M9 9.5v.5M15 9.5v.5"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  board: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.2 4.5v15M14.8 4.5v15"/><path d="M5.5 8h2M11 8h2M11 11h2M16.5 8h2"/>',
  nib: '<path d="M12 3l6 7-6 11-6-11z"/><circle cx="12" cy="11.5" r="1.6"/><path d="M12 13v8"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10.2 9.2v5.6l4.8-2.8z"/>',
  code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 5l-3 14"/>',
  feather: '<path d="M19.5 4.5C12 4.5 6.5 9 6.5 17.5h4c5.5 0 9-5.5 9-13z"/><path d="M4 20l9.5-9.5"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.2c1.5 1.4 3.4 2.1 5.5 2.1s4-.7 5.5-2.1v-4.2"/><path d="M21.5 9.5v5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.5M12 14h.5M16 14h.5"/>',
  check: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.3l2.8 2.8L16.2 9"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/><path d="M9.2 14.2a3 3 0 0 0 2.8 2.8"/>',
  flower: '<circle cx="12" cy="9" r="2.2"/><path d="M12 6.8c0-3 3.6-3 3.3-.2M14.2 9c3 0 3 3.6.2 3.3M12 11.2c0 3-3.6 3-3.3.2M9.8 9c-3 0-3-3.6-.2-3.3"/><path d="M12 11.5v9M12 17c-1.5-2-3.5-2.5-5-2M12 16c1.5-1.6 3.2-2 4.5-1.6"/>',
  sparkle: '<path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11"/><path d="M12 9C10.5 5 7 5.5 7.5 7.5S11 9 12 9zm0 0c1.5-4 5-3.5 4.5-1.5S13 9 12 9z"/>',
} as const;
export type IconId = keyof typeof ICONS;

/** The icon as a standalone SVG string, for use inside the room art. `size` is the drawn width in user units. */
export function iconSvg(id: IconId, x: number, y: number, size: number, colour: string, weight = 2) {
  const k = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${k.toFixed(4)})" fill="none" stroke="${colour}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</g>`;
}
