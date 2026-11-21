"use client";
import { currentPrayer, nextPrayer, FIVE, type DayTimes } from "@/lib/prayer";
import { fmtMin } from "@/lib/dates";
import { isPrayed } from "@/lib/salah";
import type { SalahDay } from "@/lib/db";
import { mmss, type FocusView } from "@/hooks/useFocus";
import { CheckIcon, ClockIcon, DrawerIcon, MosqueIcon } from "./Icons";
import { ayahOfDay, useQuran } from "@/diary/deen";
import { SURAHS } from "@/data/surahs";
import { todayStr } from "@/lib/dates";

type Props = {
  P: DayTimes; min: number; today: SalahDay | undefined; curDay: SalahDay | undefined; focus: FocusView;
  /** Prayer pills only show when Deen is one of the picked trackers. */
  showPrayer: boolean; drawerCount: number;
  onToggle: () => void; onGo: (to: "salah" | "quran" | "focus" | "drawer") => void;
};

/** The row of pills under the room. The prayer pill grows a checkbox while a prayer's time is running. */
export function Pills({ P, min, today, curDay, focus, showPrayer, drawerCount, onToggle, onGo }: Props) {
  const cur = currentPrayer(P, min);
  const p = today?.p ?? {};
  const count = FIVE.filter(k => isPrayed(p[k])).length;
  const ticked = cur ? isPrayed(curDay?.p[cur.name]) : false;
  const next = nextPrayer(P, min);
  return (
    <nav className="pills" aria-label="Today at a glance">
      {(focus.running || focus.paused) && (
        <div className="pill focusing"><button className="pmain" onClick={() => onGo("focus")}>
          <span className="ic c2"><ClockIcon /></span><span className="t"><span className="n">{mmss(focus.left())}</span><span className="l">{focus.running ? focus.task || "focusing" : "paused"}</span></span>
        </button></div>
      )}
      {showPrayer && today?.period && <AyahPill onGo={() => onGo("quran")} />}
      {showPrayer && !today?.period && <>
      <div className={"pill" + (cur ? " split" : "")}>
        {cur && <>
          <button className={"pchk" + (ticked ? " on" : "")} role="checkbox" aria-checked={ticked} aria-label={`I prayed ${cur.name}`} onClick={onToggle}>
            <span className="box"><CheckIcon /></span>
            <span className="t"><span className="n">{cur.name}</span><span className="l">{ticked ? "prayed ✓" : "tap when prayed"}</span></span>
          </button><span className="psep" />
        </>}
        <button className="pmain" onClick={() => onGo("salah")}>
          <span className="ic c1"><MosqueIcon /></span><span className="t"><span className="n">{count}/5</span><span className="l">prayers today</span></span>
          <span className="pdots">{FIVE.map(k => <i key={k} title={k} className={(isPrayed(p[k]) ? "y" : "") + (cur && !cur.dayOffset && cur.name === k ? " now" : "")} />)}</span>
        </button>
      </div>
      <div className="pill"><button className="pmain" onClick={() => onGo("salah")}>
        <span className="ic c5">{cur ? <MosqueIcon /> : <ClockIcon />}</span>
        <span className="t"><span className="n">{cur ? `${cur.name} time` : `Next: ${next.name}`}</span><span className="l">{cur ? `until ${fmtMin(cur.end)}` : `at ${fmtMin(next.at)}`}</span></span>
      </button></div>
      </>}
      <div className="pill"><button className="pmain" onClick={() => onGo("drawer")}>
        <span className="ic c4"><DrawerIcon /></span><span className="t"><span className="n">{drawerCount || "Drawer"}</span><span className="l">{drawerCount ? "in the drawer" : "& settings"}</span></span>
      </button></div>
    </nav>
  );
}

/** On period days, the prayer pills give way to the ayah of the day. */
function AyahPill({ onGo }: { onGo: () => void }) {
  const { q } = useQuran();
  const ref = q ? ayahOfDay(q, todayStr()) : null;
  const text = ref && q ? q[ref[0] - 1][ref[1] - 1][1] : "";
  return (
    <div className="pill ayah"><button className="pmain" onClick={onGo} aria-label={ref ? `Ayah of the day, ${SURAHS[ref[0] - 1][0]} ${ref[0]}:${ref[1]}: ${text}` : "Ayah of the day"}>
      <span className="ic c3"><BookIcon /></span>
      <span className="t"><span className="n">{ref ? `${SURAHS[ref[0] - 1][0]} ${ref[0]}:${ref[1]}` : "Ayah of the day"}</span><span className="l ayah-l">{text || "Opening the mushaf…"}</span></span>
    </button></div>
  );
}
const BookIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" /><path d="M12 6.5v13" /></svg>;
