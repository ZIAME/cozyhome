"use client";
import { useState } from "react";
import { CONTACT_EMAIL, reportHref, reportText } from "@/lib/report";

/** A small "Report a mistake" link. Opens an email when a contact address is set; otherwise copies the report. */
export function ReportMistake({ what, details, className = "k-link" }: { what: string; details: string; className?: string }) {
  const [msg, setMsg] = useState("");
  const body = reportText(what, details), href = reportHref(`Mistake in Cozy Home: ${what}`, body);
  if (href) return <a className={className} href={href}>Report a mistake</a>;
  return (
    <>
      <button className={className} onClick={async () => {
        try { await navigator.clipboard.writeText(body); setMsg("Copied the details. Paste them into a message to the app’s team."); }
        catch { setMsg("Note the details and send them to the app’s team."); }
      }}>Report a mistake</button>
      {msg && <span className="k-note" role="status"> {msg}</span>}
    </>
  );
}
export const contactLine = () => (CONTACT_EMAIL ? CONTACT_EMAIL : null);
