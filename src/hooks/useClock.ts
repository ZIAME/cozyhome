"use client";
import { useEffect, useMemo, useState } from "react";
import { dayTimes, type Place, type PrayerSettings } from "@/lib/prayer";
import { minutesNow, todayStr } from "@/lib/dates";

/** Current minute of the day (or a previewed one), today's date and today's prayer times for a place. */
export function useClock(place: Place, prayer: PrayerSettings) {
  const [now, setNow] = useState(() => new Date());
  const [preview, setPreview] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);
  const today = todayStr();
  const key = JSON.stringify([place.lat, place.lng, prayer]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const P = useMemo(() => dayTimes(new Date(), place, prayer), [today, key]);
  const min = preview ?? minutesNow(now);
  return { now, today, P, min, preview, setPreview };
}
export type Clock = ReturnType<typeof useClock>;
