// The Atlas keystone: the wedge that closes an arch and carries its whole
// load — the brand's link between the mythological Atlas (bearing the sky)
// and a platform that carries a portfolio of structures. The red reveal
// line is a fixed brand accent, not a theme token — it stays the same
// color in every context, on or off the sidebar's dark ground.
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <polygon points="96,54 144,54 168,158 132,158 120,142 108,158 72,158" fill="currentColor" />
      <line x1="120" y1="58" x2="120" y2="142" stroke="hsl(var(--brand-accent))" strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}
