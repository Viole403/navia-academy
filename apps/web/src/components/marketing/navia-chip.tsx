/**
 * Navia chip — the signature Bauhaus motif: three triangles (red, blue,
 * yellow) arranged as the "N" of a printing proof. Used on the landing hero
 * and the dashboard top nav. Pure SVG, no data, theme-safe.
 */
export function NaviaChip({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      role="img"
      aria-label="Navia"
      fill="none"
    >
      {/* N strokes as the grid behind */}
      <rect x="0.5" y="0.5" width="47" height="31" stroke="currentColor" strokeOpacity="0.25" />
      <line x1="8" y1="4" x2="24" y2="28" stroke="currentColor" strokeOpacity="0.25" />
      <line x1="24" y1="4" x2="24" y2="28" stroke="currentColor" strokeOpacity="0.25" />
      <line x1="40" y1="4" x2="24" y2="28" stroke="currentColor" strokeOpacity="0.25" />
      {/* color triangles: red, blue, yellow */}
      <polygon points="8,6 22,6 15,16" className="fill-primary" />
      <polygon points="26,14 38,14 32,26" className="fill-secondary" />
      <polygon points="8,22 22,22 15,28" className="fill-tertiary" />
    </svg>
  );
}