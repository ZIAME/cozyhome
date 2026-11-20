"use client";
/**
 * "Report a mistake" for religious content (Library topics, Quran text). There's no server, so a report is an
 * email to the address in NEXT_PUBLIC_CONTACT_EMAIL. Without one, the report is copied for the person to send.
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

export function reportText(what: string, details: string) {
  return `What: ${what}\n${details}\n\nWhat’s wrong, and the correct version (with a source if you have one):\n`;
}
export function reportHref(subject: string, body: string) {
  return CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
}
