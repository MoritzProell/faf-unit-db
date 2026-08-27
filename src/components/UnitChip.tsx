'use client';

import Link from 'next/link';
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
  flip = false,
  eager = false,
}: {
  unit: BrowseUnit;
  size?: number;
  selected: boolean;
  onToggle: (id: string) => void;
  sort: SortDef;
  flip?: boolean;
  /** Above-the-fold chips must not lazy-load; the roster is 400+ images. */
  eager?: boolean;
}) {
  return (
    <div className={styles.wrap} data-selected={selected} data-flip={flip}>
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
