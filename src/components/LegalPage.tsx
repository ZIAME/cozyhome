import Link from "next/link";

/** A plain page for /credits and /privacy: readable without the room, and fine to link from a store listing. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <main>
        <Link className="legal-back" href="/">← Back to your room</Link>
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}
