'use client';

import Link from 'next/link';
import { FactionMark } from './FactionMark';
import { UnitWell } from './UnitWell';
import { AbilityChips } from './AbilityChips';
import { MassMark } from './Marks';
import { Icon } from './Icon';
import { fmt, type BrowseUnit, type SortDef } from '@/lib/faf/browse';
import styles from './UnitTile.module.css';

/**
 * The reference app's grid is 507 unlabelled 40px silhouettes. This carries the
 * name, the role, and whichever figure you sorted by, so the sort is visible.
 *
 * The whole tile opens the unit; comparison is a separate corner control. The
 * link is a stretched overlay rather than a wrapper because the compare button
 * has to sit above it, and a button inside an anchor is invalid.
 */
export function UnitTile({
  unit,
  sort,
  selected,
  onToggle,
  eager = false,
  pickMode = false,
}: {
  unit: BrowseUnit;
  sort: SortDef;
  selected: boolean;
  onToggle: (id: string) => void;
  /** Above-the-fold tiles must not lazy-load; 180 lazy images race on first paint. */
  eager?: boolean;
  /** While picking units to compare, the whole tile selects rather than opens. */
  pickMode?: boolean;
}) {
  return (
    <div className={styles.tile} data-faction={unit.faction} data-selected={selected} data-pick={pickMode}>
      <div className={styles.watermark} aria-hidden="true">
        <FactionMark faction={unit.faction} size={52} opacity={0.09} />
      </div>

      {pickMode ? (
        <button
          type="button"
          className={styles.open}
          onClick={() => onToggle(unit.id)}
          aria-pressed={selected}
          aria-label={`${selected ? 'Remove' : 'Add'} ${unit.name} ${selected ? 'from' : 'to'} comparison`}
        />
      ) : (
        <Link href={`/unit/${unit.slug}`} className={styles.open} aria-label={`${unit.name}, ${unit.role}`}>
          <span className="visually-hidden">{unit.name}</span>
        </Link>
      )}

      {!pickMode && (
        <button
          type="button"
          className={styles.compare}
          onClick={() => onToggle(unit.id)}
          aria-pressed={selected}
          title={selected ? 'Remove from comparison' : 'Add to comparison'}
          aria-label={selected ? `Remove ${unit.name} from comparison` : `Add ${unit.name} to comparison`}
        >
          <Icon name={selected ? 'check' : 'plus'} size={12} strokeWidth={selected ? 2.6 : 2} />
        </button>
      )}

      {pickMode && (
        <span className={styles.pickMark} aria-hidden="true">
          <Icon name={selected ? 'check' : 'plus'} size={12} strokeWidth={selected ? 2.6 : 2} />
        </span>
      )}

      <div className={styles.head}>
        <UnitWell
          id={unit.id}
          faction={unit.faction}
          techLabel={unit.techLabel}
          size={60}
          imageSize={56}
          priority={eager}
          hasRender={unit.hasRender}
        />
        <div className={styles.body}>
          <div className={`${styles.name} t`}>{unit.name}</div>
          <div className={styles.role}>
            {unit.name === unit.role ? `${unit.techLabel} · ${unit.kind === 'Base' ? 'Structure' : unit.kind}` : unit.role}
          </div>
          <AbilityChips abilities={unit.abilities} />
        </div>
      </div>

      <div className={styles.hairline} />
      <div className={styles.stats}>
        <Stat label="Mass" value={fmt(unit.mass)} mark={<MassMark size={12} />} cell="mass" />
        <Stat label="Health" value={fmt(unit.health)} cell="health" />
        <Stat label={sort.tileLabel} value={sort.format(unit)} accent cell="sort" />
      </div>
    </div>
  );
}

function Stat({
  label, value, mark, accent, cell,
}: { label: string; value: string; mark?: React.ReactNode; accent?: boolean; cell: string }) {
  return (
    <div className={styles.cell} data-cell={cell}>
      <span className={`lbl ${styles.cellLabel}`}>{label}</span>
      <span className={styles.cellValue}>
        {mark}
        <span className={`m ${styles.figure} ${accent ? styles.figureAccent : ''}`}>{value}</span>
      </span>
    </div>
  );
}
