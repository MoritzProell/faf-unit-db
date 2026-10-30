'use client';

import { useId } from 'react';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** How many results picking this would leave. Shown small, and dims the option at zero. */
  count?: number;
}

/**
 * One question, every answer visible at once.
 *
 * A row of pressed/unpressed buttons rather than a dropdown, because the point
 * is that the choices can be read at a glance without opening anything. Exactly
 * one is on at a time, "All" included, so there is no state where a filter has
 * been switched off by accident and nothing says so.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <span id={id} className={`lbl ${styles.label}`}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className={styles.seg}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={styles.opt}
            aria-pressed={o.value === value}
            data-empty={o.count === 0 && o.value !== value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.count !== undefined && <span className={`m ${styles.count}`}>{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
