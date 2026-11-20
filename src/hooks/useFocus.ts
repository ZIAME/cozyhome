"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FocusState = { dur: number; endAt: number | null; left: number | null; task: string };
const KEY = "afra-focus";
const load = (): FocusState => {
  try { return { dur: 1500, endAt: null, left: null, task: "", ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { dur: 1500, endAt: null, left: null, task: "" }; }
};

let actx: AudioContext | null = null;
function chime() {
  try {
    actx = actx || new AudioContext();
    const now = actx.currentTime;
    [784, 988, 1175].forEach((f, i) => {
      const o = actx!.createOscillator(), g = actx!.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.18);
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 1.2);
      o.connect(g).connect(actx!.destination); o.start(now + i * 0.18); o.stop(now + i * 0.18 + 1.3);
    });
  } catch { /* sound is optional */ }
}

export type FocusView = ReturnType<typeof useFocus>;

/** The wall-clock focus timer. Survives a page refresh. */
export function useFocus(onDone?: (task: string, seconds: number) => void) {
  const [s, setS] = useState<FocusState>({ dur: 1500, endAt: null, left: null, task: "" });
  const [, force] = useState(0);
  const [justFinished, setJustFinished] = useState(0);
  const doneRef = useRef(onDone); doneRef.current = onDone;
  useEffect(() => setS(load()), []);
  const save = useCallback((n: FocusState) => { setS(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} }, []);
  const left = useCallback(() => (s.endAt ? Math.max(0, (s.endAt - Date.now()) / 1000) : s.left ?? s.dur), [s]);

  useEffect(() => {
    if (!s.endAt) return;
    const id = setInterval(() => {
      if (Date.now() >= s.endAt!) {
        save({ ...s, endAt: null, left: null });
        chime(); setJustFinished(n => n + 1); doneRef.current?.(s.task, s.dur);
      } else force(n => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [s, save]);

  return useMemo(() => ({
    dur: s.dur, task: s.task, running: !!s.endAt, paused: !s.endAt && s.left != null, justFinished, left,
    setDur: (m: number) => save({ ...s, dur: m * 60 }),
    setTask: (task: string) => save({ ...s, task }),
    toggle: () => {
      try { actx = actx || new AudioContext(); } catch {}
      if (s.endAt) save({ ...s, left: left(), endAt: null });
      else save({ ...s, endAt: Date.now() + (s.left ?? s.dur) * 1000, left: null });
    },
    reset: () => save({ ...s, endAt: null, left: null }),
  }), [s, save, left, justFinished]);
}
export const mmss = (sec: number) => { const s = Math.ceil(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
