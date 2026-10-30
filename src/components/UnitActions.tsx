'use client';

import { Icon } from './Icon';
import { useCompareSelection, MAX_COMPARE } from '@/lib/useCompareSelection';
import styles from './UnitActions.module.css';

/** Adds this unit to the basket the top bar and the tray both read. */
export function AddToCompareButton({ id, name }: { id: string; name: string }) {
  const compare = useCompareSelection();
  const selected = compare.ids.includes(id);
  const blocked = !selected && compare.isFull;

  return (
    <button
      className={styles.btn}
      data-on={selected}
      onClick={() => compare.toggle(id)}
      disabled={blocked}
      aria-pressed={selected}
      title={blocked ? `You can compare ${MAX_COMPARE} units at a time` : undefined}
    >
      <Icon name={selected ? 'check' : 'plus'} size={13} strokeWidth={selected ? 2.4 : 1.6} />
      {selected ? 'In comparison' : 'Add to compare'}
      {compare.ids.length > 0 && <span className={`m ${styles.count}`}>{compare.ids.length}</span>}
      <span className="visually-hidden">{name}</span>
    </button>
  );
}

