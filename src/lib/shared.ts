"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny shared state for diary pages. The left and right page of a spread (and the copies drawn on a turning leaf)
 * are separate components, so a selection made on one side reaches the other through here.
 */
const values = new Map<string, unknown>();
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function useShared<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  // the first value is stored, so the snapshot stays the same object until someone sets it
  const get = () => { if (!values.has(key)) values.set(key, initial); return values.get(key) as T; };
  const v = useSyncExternalStore(subscribe, get, () => initial);
  const set = useCallback((n: T | ((p: T) => T)) => {
    const cur = values.has(key) ? (values.get(key) as T) : initial;
    values.set(key, typeof n === "function" ? (n as (p: T) => T)(cur) : n); emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [v, set];
}
