/**
 * Honeycomb — subtle hexagon brand accents.
 * Two exports:
 *  - <Hexagon> a single flat-top hex outline (used as a wrapper behind an icon)
 *  - <HoneycombStrip> a thin decorative row of faint hexes for section flourish
 * Kept calm + low-contrast so it never competes with content.
 */

export function HexBadge({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <polygon
          points="50,3 93,27 93,73 50,97 7,73 7,27"
          className="fill-teal-50 stroke-teal-600/30"
          strokeWidth="4"
        />
      </svg>
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </span>
  );
}

export function HoneycombStrip({ className = "" }: { className?: string }) {
  // a faint repeating hex motif — decorative only
  return (
    <svg
      className={className}
      viewBox="0 0 240 28"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <g id="hx">
          <polygon
            points="14,1 27,8 27,21 14,28 1,21 1,8"
            fill="none"
            className="stroke-teal-600/15"
            strokeWidth="1.5"
          />
        </g>
      </defs>
      {[0, 28, 56, 84, 112, 140, 168, 196, 224].map((x, i) => (
        <use key={i} href="#hx" x={x} y={i % 2 ? 0 : -7} />
      ))}
    </svg>
  );
}
