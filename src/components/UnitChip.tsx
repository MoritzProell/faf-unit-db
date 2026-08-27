'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { UnitWell } from './UnitWell';
import { Icon } from './Icon';
import { fmt, type BrowseUnit, type SortDef } from '@/lib/faf/browse';
import styles from './UnitChip.module.css';

/**
 * A bare unit well with a hover card. This is the reference app's icon-wall
 * affordance, kept because veterans navigate by silhouette, but with the name
 * and the sorted figure one hover away instead of nowhere.
 *
 * Clicking opens the unit. Comparison is a button inside the hover card, so the
 * icon wall stays uncluttered and a click never does something you did not ask
 * for.
 */
export function UnitChip({
  unit,
  size = 44,
  selected,
  onToggle,
  sort,
  eager = false,
}: {
  unit: BrowseUnit;
  size?: number;
  selected: boolean;
  onToggle: (id: string) => void;
  sort: SortDef;
  /** Above-the-fold chips must not lazy-load; the roster is 400+ images. */
  eager?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });

  // Measured on hover rather than guessed: rows wrap, so which chips sit near an
  // edge is not knowable when rendering.
  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const CARD_W = 236;
    const CARD_H = 190;
    setFlip({
      x: r.left + CARD_W + 16 > window.innerWidth,
      y: r.bottom + CARD_H + 16 > window.innerHeight && r.top > CARD_H,
    });
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      data-selected={selected}
      data-flip={flip.x}
      data-flip-up={flip.y}
      onMouseEnter={measure}
      onFocus={measure}
    >
      <Link href={`/unit/${unit.slug}`} className={styles.btn} aria-label={`${unit.name}, ${unit.role}`}>
        <UnitWell
          id={unit.id}
          faction={unit.faction}
          techLabel={unit.techLabel}
          size={size}
          imageSize={Math.round(size * 0.93)}
          hasRender={unit.hasRender}
          priority={eager}
        />
      </Link>

      <div className={styles.card}>
        <div className={styles.panel}>
          <div className={styles.top}>
            <span className={`t ${styles.name}`}>{unit.name}</span>
            <span className={`m ${styles.id}`}>{unit.id}</span>
          </div>
          <div className={styles.role}>{unit.name === unit.role ? unit.type : unit.role}</div>
          <div className={styles.rule} />
          <div className={styles.stats}>
            <Stat label="Mass" value={fmt(unit.mass)} />
            <Stat label="Health" value={fmt(unit.health)} />
            <Stat label={sort.tileLabel} value={sort.format(unit)} accent />
          </div>
          <button
            type="button"
            className={styles.compare}
            data-on={selected}
            onClick={() => onToggle(unit.id)}
            aria-pressed={selected}
          >
            <Icon name={selected ? 'check' : 'plus'} size={12} strokeWidth={selected ? 2.6 : 2} />
            {selected ? 'In comparison' : 'Add to comparison'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.stat}>
      <span className="lbl" style={{ fontSize: 8 }}>{label}</span>
      <span className={`m ${styles.figure}`} style={accent ? { color: 'var(--best)' } : undefined}>
        {value}
      </span>
    </div>
  );
}
