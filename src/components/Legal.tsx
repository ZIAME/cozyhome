/**
 * Credits and the privacy policy. Shown in the app (Settings) and at /credits and /privacy,
 * since app stores and the DPDP Act expect a privacy policy at a public address.
 */
import { CONTACT_EMAIL } from "@/lib/report";
import { THEMES } from "@/room/themes";

/** Flip to true once a lawyer has reviewed the privacy policy (brief: legal review before launch). */
export const POLICY_REVIEWED = false;
export const POLICY_UPDATED = "20 November 2026";

const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>;
const Contact = () => (CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <>the contact address on the app’s website</>);

export function Credits() {
  return (
    <div className="legal">
      <section>
        <h3>The Quran</h3>
        <p>The Arabic text (Uthmani script) is from <A href="https://quranenc.com">The Noble Qur’an Encyclopedia</A> (quranenc.com). The English translation is <b>Saheeh International</b>.</p>
        <p>Both come through <A href="https://github.com/risan/quran-json">quran-json</A> by Risan Bagja Pradana, shared under the <A href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0</A> licence. The app stores it in a compact form; that file is shared under the same licence.</p>
      </section>
      <section>
        <h3>Prayer times</h3>
        <p>Calculated on your device with the standard astronomical method, as described by <A href="http://praytimes.org">PrayTimes.org</A>: Karachi, Muslim World League, ISNA, Umm al-Qura and Egyptian methods, Hanafi or Shafi’i Asr. Always check them against your local mosque.</p>
      </section>
      <section>
        <h3>Library topics</h3>
        <p>Topic titles only, chosen to point you to a trusted teacher or book. Nothing in this app is a religious ruling, and nothing is written by AI.</p>
      </section>
      <section>
        <h3>Typefaces</h3>
        <p><A href="https://fonts.google.com/specimen/Fredoka">Fredoka</A>, <A href="https://fonts.google.com/specimen/Nunito">Nunito</A>, <A href="https://fonts.google.com/specimen/Amiri">Amiri</A> and <A href="https://fonts.google.com/specimen/Caveat">Caveat</A>, under the SIL Open Font License 1.1, bundled through Fontsource so they work offline.</p>
      </section>
      <section>
        <h3>Software</h3>
        <ul>
          <li>Next.js, React and React DOM (MIT)</li>
          <li>Dexie and dexie-react-hooks (Apache 2.0)</li>
          <li>Supabase JS client, for optional sync (MIT)</li>
        </ul>
      </section>
      <section>
        <h3>The room</h3>
        {Object.values(THEMES).map(t => <p key={t.id}><b>{t.name}</b>: {t.credit}</p>)}
        <p>The tracker objects drawn into the room and the cat are made for Cozy Home.</p>
      </section>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="legal">
      {!POLICY_REVIEWED && <p className="legal-draft">Draft policy, being reviewed before public launch.</p>}
      <p className="legal-meta">Last updated {POLICY_UPDATED}</p>
      <section>
        <h3>In short</h3>
        <ul>
          <li>What you write stays on your device. We can’t read it.</li>
          <li>If you turn on sync, it’s stored in your own private space in the cloud so your devices can share it.</li>
          <li>No ads, no tracking, no selling data, and no AI reading your diary.</li>
          <li>You can download all of it, and delete all of it, at any time.</li>
        </ul>
      </section>
      <section>
        <h3>What the app keeps</h3>
        <p>Your name, the place you picked (for prayer times and the sky), which trackers you use, and everything you enter in them: prayers, Quran progress, reflections, journal entries, moods, tasks, notes, photos you add, and similar. It’s saved in your browser’s storage on your device.</p>
        <p>“Use my location” reads your position once, to find your city. It isn’t stored beyond the coordinates of the place you choose, and it isn’t sent anywhere.</p>
      </section>
      <section>
        <h3>Sync (optional)</h3>
        <p>If you sign in to sync, your email address and a copy of your data are stored with our cloud provider, Supabase, so your devices stay in step. Each account can only reach its own data. Photos are kept in private storage. Sign-in emails are sent by Supabase.</p>
      </section>
      <section>
        <h3>What we don’t do</h3>
        <p>We don’t show ads, use analytics or tracking, share or sell your data, or use it to train AI. Your journal is yours.</p>
      </section>
      <section>
        <h3>Your choices</h3>
        <ul>
          <li><b>Download</b> everything as a backup file: Settings → Backup & sync.</li>
          <li><b>Delete from the cloud</b>: Backup & sync → Delete my cloud data removes your account, your synced data and your photos.</li>
          <li><b>Delete from this device</b>: clear this site’s data in your browser settings, or uninstall the app.</li>
        </ul>
      </section>
      <section>
        <h3>Children</h3>
        <p>Cozy Home is meant for people aged 18 and over, or younger people using it with a parent or guardian’s consent.</p>
      </section>
      <section>
        <h3>Questions and complaints</h3>
        <p>Write to <Contact />. If you’re in India, this is also the contact for grievances under the Digital Personal Data Protection Act, 2023; we reply within the time the law sets.</p>
      </section>
      <section>
        <h3>Changes</h3>
        <p>If this policy changes, the app shows the new date above, and tells you about important changes before they apply.</p>
      </section>
    </div>
  );
}
