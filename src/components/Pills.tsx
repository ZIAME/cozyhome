"use client";
import { currentPrayer, nextPrayer, FIVE, type DayTimes } from "@/lib/prayer";
import { fmtMin } from "@/lib/dates";
import { isPrayed } from "@/lib/salah";
import type { SalahDay } from "@/lib/db";
import { mmss, type FocusView } from "@/hooks/useFocus";
import { CheckIcon, ClockIcon, DrawerIcon, MosqueIcon } from "./Icons";

type Props = {
  P: DayTimes; min: number; today: SalahDay | undefined; curDay: SalahDay | undefined; focus: FocusView;
  /** Prayer pills only show when Deen is one of the picked trackers. */
  showPrayer: boolean; drawerCount: number;
  onToggle: () => void; onGo: (to: "salah" | "focus" | "drawer") => void;
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
      {showPrayer && <>
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
