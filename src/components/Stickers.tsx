export const STICKERS: Record<string, React.ReactNode> = {
  moon: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#F3DFC0" /><path d="M60 22a28 28 0 1 0 20 40a22 22 0 1 1-20-40z" fill="#E9A23B" /><path d="M28 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#D2692A" /></svg>,
  pen: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#F3DFC0" /><path d="M30 72l6-18 26-26 12 12-26 26z" fill="#E9A23B" /><path d="M62 28l12 12 5-5-12-12z" fill="#D2692A" /><path d="M30 72l6-18 12 12z" fill="#FBF3E2" /></svg>,
  flower: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#F3DFC0" />{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="50" cy="32" rx="10" ry="15" fill="#E8A091" transform={`rotate(${a} 50 50)`} />)}<circle cx="50" cy="50" r="9" fill="#E9A23B" /></svg>,
  star: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#F3DFC0" /><path d="M50 20q4 26 30 30q-26 4-30 30q-4-26-30-30q26-4 30-30z" fill="#E9A23B" /></svg>,
  cal: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#F3DFC0" /><rect x="26" y="30" width="48" height="42" rx="8" fill="#FBF3E2" stroke="#D2692A" strokeWidth="4" /><rect x="26" y="30" width="48" height="12" rx="6" fill="#D2692A" /><circle cx="40" cy="56" r="4" fill="#E9A23B" /><circle cx="56" cy="56" r="4" fill="#C98E4E" /></svg>,
};
