"use client";
import { useEffect, useRef } from "react";
import { mmss, type FocusView } from "@/hooks/useFocus";

type Props = { kind: "focus" | "surprise" | null; surprise: string; focus: FocusView; onClose: () => void };

/** The small card for the focus timer and the surprise gift. */
export function Sheet({ kind, surprise, focus, onClose }: Props) {
  const startRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!kind) return;
    const t = setTimeout(() => (kind === "focus" ? startRef : backRef).current?.focus(), 420);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => { clearTimeout(t); removeEventListener("keydown", k); };
  }, [kind, onClose]);
  const left = focus.left(), locked = focus.running || focus.paused;
  return (
    <div id="sheet" className={(kind ? "open " : "") + (kind === "focus" ? "focus" : "")} aria-hidden={!kind} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="shTitle">
        <div className="eyebrow">{kind === "focus" ? "Focus" : "Surprise"}</div>
        <h2 id="shTitle">{kind === "focus" ? "Focus timer" : "Surprise me"}</h2>
        {kind === "surprise" && <><p id="shText">Here’s something for you:</p><div id="gift" style={{ display: "block" }}>{surprise}</div></>}
        <div id="focusUI">
          <div className="tring">
            <svg viewBox="0 0 190 190"><circle cx="95" cy="95" r="84" fill="none" stroke="#F1DDBD" strokeWidth="12" />
              <circle cx="95" cy="95" r="84" fill="none" stroke="#E07A35" strokeWidth="12" strokeLinecap="round" strokeDasharray="527.8" strokeDashoffset={(527.8 * (1 - left / focus.dur)).toFixed(1)} /></svg>
            <div><div className="tdigits">{mmss(left)}</div><div className="tstate">{focus.running ? "Focusing…" : focus.paused ? "Paused" : "Ready when you are"}</div></div>
          </div>
          <div className="presets">
            {[15, 25, 45, 60].map(m => <button key={m} className={focus.dur === m * 60 ? "sel" : ""} disabled={locked} style={{ opacity: locked ? 0.5 : 1 }} onClick={() => focus.setDur(m)}>{m} min</button>)}
          </div>
          <input id="focusTask" maxLength={60} placeholder="What are you focusing on?" value={focus.task} onChange={e => focus.setTask(e.target.value)} />
          <div className="tctl"><button id="tStart" ref={startRef} onClick={focus.toggle}>{focus.running ? "Pause" : focus.paused ? "Resume" : "Start"}</button><button id="tReset" onClick={focus.reset}>Reset</button></div>
        </div>
        <button id="shBack" ref={backRef} onClick={onClose}>Back home</button>
      </div>
    </div>
  );
}
