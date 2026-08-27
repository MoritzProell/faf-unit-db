'use client';

import Link from 'next/link';
import { Icon } from './Icon';
import { UnitWell } from './UnitWell';
import type { BrowseUnit } from '@/lib/faf/browse';
import styles from './CompareTray.module.css';

/**
 * The reference app has an unlabelled "select units to compare" button whose
 * state you cannot see. This shows exactly what is selected and what happens next.
 */
export function CompareTray({
  units,
  max,
  onRemove,
  onClear,
}: {
  units: BrowseUnit[];
  max: number;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const href = `/compare?ids=${units.map((u) => u.id).join(',')}`;
  const enough = units.length >= 2;

  return (
    <div className={styles.tray}>
      <div className={styles.meta}>
        <span className="lbl" style={{ fontSize: 9 }}>Compare</span>
        <span className={`t ${styles.metaCount}`}>{units.length} selected</span>
      </div>

      <div className={styles.chips}>
        {units.map((u) => (
          <div key={u.id} className={styles.chip} data-faction={u.faction}>
            <UnitWell id={u.id} faction={u.faction} techLabel={u.techLabel} size={30} imageSize={28} pip={false} hasRender={u.hasRender} />
            <div className={styles.chipText}>
              <span className={`t ${styles.chipName}`}>{u.name}</span>
              <span className={`m ${styles.chipId}`}>{u.id}</span>
            </div>
            <button className={styles.remove} onClick={() => onRemove(u.id)} aria-label={`Remove ${u.name}`}>
              <Icon name="close" size={12} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      {units.length < max && (
        <span className={styles.slot} aria-hidden="true"><Icon name="plus" size={15} /></span>
      )}

      <span className={styles.spacer} />
      <button className={styles.clear} onClick={onClear}>Clear</button>
      <Link href={href} className={`t ${styles.cta}`} data-disabled={!enough} aria-disabled={!enough}>
        {enough ? `Compare ${units.length} units` : 'Pick 2 to compare'}
        <Icon name="chevronRight" size={13} strokeWidth={2.2} />
      </Link>
    </div>
  );
}
