export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const todayStr = () => ymd(new Date());
export const prettyDate = (s: string, opt: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  fromYmd(s).toLocaleDateString("en-GB", opt);
/** Minutes after midnight → "5:08 pm" */
export const fmtMin = (m: number) => {
  const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
export const minutesNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
export const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
