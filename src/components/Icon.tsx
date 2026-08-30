/** Stroke icons on a 16px grid, 1.6 weight. One family, no emoji. */
const PATHS = {
  search: <><circle cx="7.2" cy="7.2" r="4.7" /><path d="M10.8 10.8 L14 14" /></>,
  chevronDown: <path d="M4 6.5 L8 10.5 L12 6.5" />,
  chevronRight: <path d="M6.5 4 L10.5 8 L6.5 12" />,
  chevronLeft: <path d="M9.5 4 L5.5 8 L9.5 12" />,
  close: <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" />,
  gear: (
    <>
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.6v1.8M8 12.6v1.8M1.6 8h1.8M12.6 8h1.8M3.5 3.5l1.3 1.3M11.2 11.2l1.3 1.3M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3" />
    </>
  ),
  sliders: (
    <>
      <path d="M2.5 4.5h11M2.5 11.5h11" />
      <circle cx="6" cy="4.5" r="1.9" />
      <circle cx="10.5" cy="11.5" r="1.9" />
    </>
  ),
  up: <path d="M8 12.5V3.5M4.5 7 L8 3.5 L11.5 7" />,
  down: <path d="M8 3.5v9M4.5 9 L8 12.5 L11.5 9" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  clock: <><circle cx="8" cy="8" r="5.8" /><path d="M8 4.8V8l2.2 1.6" /></>,
  target: <><circle cx="8" cy="8" r="5.8" /><circle cx="8" cy="8" r="1.9" /></>,
  bolt: <path d="M9 2 L4 8.8h3.4L7 14l5-6.8H8.6z" />,
  grid: <path d="M2.5 2.5h4.2v4.2H2.5zM9.3 2.5h4.2v4.2H9.3zM2.5 9.3h4.2v4.2H2.5zM9.3 9.3h4.2v4.2H9.3z" />,
  rows: <path d="M2.5 3.6h11M2.5 8h11M2.5 12.4h11" />,
  layers: (
    <>
      <rect x="2.4" y="2.4" width="11.2" height="4.4" rx="1" />
      <rect x="2.4" y="9.2" width="11.2" height="4.4" rx="1" />
    </>
  ),
  /* Stat glyphs. Same 16px grid and stroke family as the UI icons above, so a
     label reads as a label rather than sprouting a second icon language. */
  damage: <path d="M8 1.6 L9.7 6.3 L14.4 8 L9.7 9.7 L8 14.4 L6.3 9.7 L1.6 8 L6.3 6.3 Z" />,
  health: <path d="M6.3 2.6h3.4v3.7h3.7v3.4H9.7v3.7H6.3V9.7H2.6V6.3h3.7z" />,
  range: <path d="M2.6 8h10.8M2.6 5.4v5.2M13.4 5.4v5.2" />,
  velocity: <path d="M2.8 4.6 L6.6 8 L2.8 11.4M8.4 4.6 L12.2 8 L8.4 11.4" />,
  radius: <><circle cx="8" cy="8" r="5.6" /><path d="M8 8h5.6" /></>,
  yaw: <><path d="M2.9 11.6 A6.4 6.4 0 0 1 13.1 11.6" /><path d="M8 11.6V5.2" /></>,
  speed: <path d="M2.4 5.2h6.4M2.4 8h9.2M2.4 10.8h6.4M11.4 4 L14 8 L11.4 12" />,
  vision: <><path d="M1.7 8C4 4.5 12 4.5 14.3 8 12 11.5 4 11.5 1.7 8Z" /><circle cx="8" cy="8" r="1.9" /></>,
  radar: <><path d="M8 13.4V8l4.8-2.8" /><path d="M4.2 12.2 A5.4 5.4 0 0 1 4.2 4.2" /><path d="M2.2 8h.1" /></>,
  sonar: <><path d="M8 13.6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M4.6 9.2a4.8 4.8 0 0 1 6.8 0M2.4 6.4a8 8 0 0 1 11.2 0" /></>,
  shield: <path d="M8 2 L13 4.1v4.3c0 2.8-2.1 4.8-5 5.6-2.9-.8-5-2.8-5-5.6V4.1Z" />,
  regen: <><path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.7" /><path d="M13.4 2.6v3h-3" /></>,
  wreck: <path d="M2.6 12.6h10.8M4.6 12.6 L6.4 6.6 L9 9.4 L11 4.4 L12.4 12.6" />,
  veterancy: <path d="M4 9.4 L8 5.6 L12 9.4M4 12.4 L8 8.6 L12 12.4" />,
  transport: <><path d="M2.6 5.4h7.6v5.2H2.6z" /><path d="M10.2 7.4h1.9l1.3 1.6v1.6h-3.2z" /></>,
  pulses: <><circle cx="3.4" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.6" cy="8" r="1.3" /></>,
  check: <path d="M3.4 8.4 L6.4 11.3 L12.6 4.8" />,
  /* Build power. A hammer, because the stat it labels is how fast a unit puts
     things up, and the set has no other glyph for making something. */
  hammer: (
    <>
      <path d="M2.8 13.2 L8.1 7.9" />
      <path d="M6.6 5.1 L10.9 9.4 L12.9 7.4 A3 3 0 0 0 8.6 3.1 Z" />
    </>
  ),
  /* Stealth: the vision eye, struck through. */
  stealth: (
    <>
      <path d="M1.7 8C4 4.5 12 4.5 14.3 8 12 11.5 4 11.5 1.7 8Z" />
      <circle cx="8" cy="8" r="1.9" />
      <path d="M3 13 L13 3" />
    </>
  ),
  omni: (
    <>
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15" />
    </>
  ),
  // The game's mass glyph: a ring around a filled dot. MassMark draws the
  // coloured version for the cost strip; this is the line version for labels.
  mass: <><circle cx="8" cy="8" r="5.6" /><circle cx="8" cy="8" r="2.1" fill="currentColor" stroke="none" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.6,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {PATHS[name]}
    </svg>
  );
}

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="1.6" y="1.6" width="20.8" height="20.8" rx="5" fill="none" stroke="var(--text-2)" strokeWidth="1.6" />
      <rect x="6.2" y="6.2" width="5" height="5" rx="1.2" fill="var(--text)" />
      <rect x="12.8" y="6.2" width="5" height="5" rx="1.2" fill="var(--text)" opacity=".38" />
      <rect x="6.2" y="12.8" width="5" height="5" rx="1.2" fill="var(--text)" opacity=".38" />
      <rect x="12.8" y="12.8" width="5" height="5" rx="1.2" fill="var(--text)" opacity=".38" />
    </svg>
  );
}
