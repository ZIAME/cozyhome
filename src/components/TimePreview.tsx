"use client";
import { useState } from "react";
import { fmtMin } from "@/lib/dates";
import { ClockIcon } from "./Icons";

/** Little control to see the room at any time of day. */
export function TimePreview({ min, preview, setPreview }: { min: number; preview: number | null; setPreview: (m: number | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div id="tp" className={open ? "open" : ""}>
      <div id="tpPanel"><span>Preview</span>
        <input type="range" min={0} max={1439} step={5} value={Math.round(min)} onChange={e => setPreview(+e.target.value)} aria-label="Time of day" />
        <span>{preview != null ? fmtMin(preview) : ""}</span><button onClick={() => setPreview(null)}>Live</button></div>
      <button id="tpBtn" aria-label="Preview the room at other times of day" title="Preview time of day" onClick={() => setOpen(o => !o)}><ClockIcon /></button>
    </div>
  );
}
