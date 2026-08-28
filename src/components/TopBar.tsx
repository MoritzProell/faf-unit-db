'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BrandMark, Icon } from './Icon';
import { useCompareSelection } from '@/lib/useCompareSelection';
import styles from './TopBar.module.css';

export function TopBar({
  version,
  totalUnits,
  query,
  onQueryChange,
  pickMode,
  onTogglePickMode,
}: {
  version: string;
  totalUnits: number;
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Browse only: lets the button start a comparison rather than only finish one. */
  pickMode?: boolean;
  onTogglePickMode?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const interactive = typeof onQueryChange === 'function';
  const compare = useCompareSelection();

  // Type anywhere to search: "/" focuses the field, and so does any printable
  // character, which then lands in the field rather than being swallowed.
  useEffect(() => {
    if (!interactive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key.length === 1 && e.key !== ' ') {
        e.preventDefault();
        inputRef.current?.focus();
        onQueryChange!((query ?? '') + e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactive, onQueryChange, query]);

  const placeholder = `Search ${totalUnits} units: name, role, ability or ID`;

  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand}>
        <BrandMark />
        <span className={styles.brandText}>
          <span className={`t ${styles.wordmark}`}>FAF UNIT DB</span>
          {/* Authorship in the masthead rather than only the footer: this is a
              one-person project and the byline is the point of building it. */}
          <span className={styles.byline}>
            by <span className={styles.bylineName}>Moritz</span>
            <span className={styles.bylineSep}>/</span>
            <span className={styles.bylineHandle}>RhyZ1ne</span>
          </span>
        </span>
      </Link>
      <span className={styles.divider} />
      <Link href="/changelog" className={styles.patchLink} title="What changed in each patch">
        Patch notes
        <span className={`m ${styles.patchBadge}`}>{version}</span>
      </Link>

      <div className={styles.searchWrap}>
        {interactive ? (
          <div className={styles.search}>
            <Icon name="search" size={15} />
            <input
              ref={inputRef}
              className={styles.input}
              type="search"
              value={query}
              onChange={(e) => onQueryChange!(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            <span className={`m ${styles.kbd}`} aria-hidden="true">/</span>
          </div>
        ) : (
          <Link href="/" className={styles.search}>
            <Icon name="search" size={15} />
            <span style={{ flex: 1, fontSize: 13 }}>{placeholder}</span>
            <span className={`m ${styles.kbd}`} aria-hidden="true">/</span>
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        {/* On the roster the button is always the pick-mode toggle, never a
            shortcut to /compare. It used to become that link as soon as two
            units were picked, which left no way back into picking to add a
            third. Going to the comparison is the banner's job. */}
        {onTogglePickMode ? (
          <button
            type="button"
            className={styles.pill}
            data-active={pickMode}
            onClick={onTogglePickMode}
            aria-pressed={pickMode}
          >
            {pickMode ? 'Done picking' : 'Compare'}
            {compare.ids.length > 0 && <span className={`m ${styles.badge}`}>{compare.ids.length}</span>}
          </button>
        ) : compare.href ? (
          <Link href={compare.href} className={styles.pill}>
            Compare<span className={`m ${styles.badge}`}>{compare.ids.length}</span>
          </Link>
        ) : (
          <span className={styles.pill} data-disabled="true" title="Open a unit to add it to a comparison">
            Compare
            {compare.ids.length > 0 && <span className={`m ${styles.badge}`}>{compare.ids.length}</span>}
          </span>
        )}
      </div>
    </header>
  );
}
