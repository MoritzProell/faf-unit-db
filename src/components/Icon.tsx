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
  check: <path d="M3.4 8.4 L6.4 11.3 L12.6 4.8" />,
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
