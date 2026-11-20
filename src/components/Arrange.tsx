"use client";
import { useEffect, useRef } from "react";
import { GROUPS, TRACKER, TRACKERS, type Tracker } from "@/room/catalogue";
import { ICONS } from "@/room/icons";
import { ROOM_CAP, canPlace, inDrawer, inRoom, type Layout, type Placement } from "@/room/layout";
import type { Theme } from "@/room/theme";

export function TrackerIcon({ t, size = 18 }: { t: Tracker; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[t.icon] }} />;
}
const Chip = ({ t }: { t: Tracker }) => <span className="tchip" style={{ background: t.colour, color: t.deep }}><TrackerIcon t={t} /></span>;

/** A small card over the room, closed with Escape or a click outside. */
function Modal({ open, title, eyebrow, onClose, children, wide }: { open: boolean; title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    addEventListener("keydown", k, true);
    const t = setTimeout(() => card.current?.querySelector<HTMLElement>("button")?.focus(), 60);
    return () => { removeEventListener("keydown", k, true); clearTimeout(t); };
  }, [open, onClose]);
  return (
    <div className={"modal" + (open ? " open" : "")} aria-hidden={!open} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"mcard" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title} ref={card}>
        <div className="mhead"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="mx" onClick={onClose} aria-label="Close">×</button></div>
        {open && children}
      </div>
    </div>
  );
}

type SpotProps = { theme: Theme; layout: Layout; spot: string | null; onPlace: (p: Placement) => void; onClear: () => void; onClose: () => void };

/** Arrange mode: choose what sits on one spot. */
export function SpotSheet({ theme, layout, spot, onPlace, onClear, onClose }: SpotProps) {
  const S = theme.spots.find(s => s.id === spot);
  const cur = spot ? layout.spots[spot] : undefined;
  const curT = cur ? TRACKER[cur.tracker] : undefined;
  const room = new Set(inRoom(layout)), drawer = new Set(inDrawer(layout));
  const tabFor = (id: string) => (S?.native?.tracker === id ? S.native.tab : undefined);
  return (
    <Modal open={!!S} eyebrow="Arrange" title={S?.label ?? ""} onClose={onClose} wide>
      {curT ? (
        <div className="here">
          <Chip t={curT} />
          <div className="here-t"><b>{curT.title}</b>
            {curT.tabs.length > 1 && (
              <label>opens <select value={cur!.tab ?? ""} onChange={e => onPlace({ tracker: curT.id, tab: e.target.value || undefined })}>
                <option value="">{curT.tabs[0].label} (first page)</option>
                {curT.tabs.slice(1).map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select></label>
            )}
          </div>
          <button className="ghost-btn" onClick={onClear}>Empty this spot</button>
        </div>
      ) : <p className="mnote">This spot is empty. Pick a tracker to put here.</p>}
      <div className="cat">
        {GROUPS.filter(g => g.id !== "always").map(g => (
          <section key={g.id}><h3>{g.label}</h3><div className="cat-row">
            {TRACKERS.filter(t => t.group === g.id).map(t => {
              const isHere = cur?.tracker === t.id, ok = !!spot && canPlace(layout, spot, t.id);
              const tag = isHere ? "here" : room.has(t.id) ? "in the room" : drawer.has(t.id) ? "in the drawer" : "";
              return (
                <button key={t.id} className={"tcard" + (isHere ? " on" : "")} disabled={isHere || !ok} title={!ok ? `The room holds ${ROOM_CAP} trackers. Empty a spot first.` : undefined}
                  onClick={() => onPlace({ tracker: t.id, tab: tabFor(t.id) })}>
                  <Chip t={t} /><span><b>{t.title}</b>{tag && <small>{tag}</small>}</span>
                </button>
              );
            })}
          </div></section>
        ))}
      </div>
      <p className="mnote">{inRoom(layout).length} of {ROOM_CAP} trackers in the room. One tracker can sit on more than one spot.</p>
    </Modal>
  );
}

type DrawerProps = { open: boolean; layout: Layout; onOpen: (tracker: string) => void; onArrange: () => void; onEdit: () => void; onClose: () => void };

/** Trackers you use that aren't in the room. They open from here. */
export function DrawerSheet({ open, layout, onOpen, onArrange, onEdit, onClose }: DrawerProps) {
  const items = inDrawer(layout).map(id => TRACKER[id]);
  return (
    <Modal open={open} eyebrow="Drawer" title="In the drawer" onClose={onClose}>
      {items.length ? (
        <div className="drawer-list">
          {items.map(t => <button key={t.id} className="tcard" onClick={() => onOpen(t.id)}><Chip t={t} /><span><b>{t.title}</b><small>{t.sub}</small></span></button>)}
        </div>
      ) : <p className="mnote">Nothing here yet. When you take a tracker out of the room, it waits here.</p>}
      <div className="mrow"><button className="mbtn" onClick={onArrange}>Arrange the room</button><button className="ghost-btn" onClick={onEdit}>Change trackers, name or place</button></div>
    </Modal>
  );
}

/** Replaces the pills while arranging. */
export function ArrangeBar({ layout, onDone }: { layout: Layout; onDone: () => void }) {
  return (
    <div className="arrange-bar" role="status">
      <span><b>Arranging your room</b><small>Tap a spot to choose what sits there · {inRoom(layout).length} of {ROOM_CAP}</small></span>
      <button onClick={onDone}>Done</button>
    </div>
  );
}

export const ArrangeIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 13v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" /><path d="M3 13h18v4H3zM5 17v2M19 17v2" /><path d="M8 9V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V9" /></svg>;
