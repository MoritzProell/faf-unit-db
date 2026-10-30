'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark, Icon, type IconName } from './Icon';
import { ReplayMark, ReplayNavLink, REPLAY_BLURB } from './ReplayLink';
import { useCompareSelection } from '@/lib/useCompareSelection';
import { REPLAY_VIEWER_URL } from '@/lib/site';
import styles from './TopBar.module.css';

/**
 * The site's sections, once, for both the bar and the menu.
 *
 * These used to live at the top of the filter rail, which was the wrong home
 * twice over: they are not filters, and below 980px the rail is a drawer, so
 * on a phone Learn and Build orders were behind a button labelled Filters.
 */
const SECTIONS: Array<{ href: string; label: string; icon: IconName; match: (p: string) => boolean }> = [
  { href: '/', label: 'Units', icon: 'grid', match: (p) => p === '/' || p.startsWith('/unit/') || p === '/compare' },
  { href: '/learn', label: 'Learn', icon: 'target', match: (p) => p.startsWith('/learn') },
  { href: '/build-orders', label: 'Build orders', icon: 'rows', match: (p) => p.startsWith('/build-orders') },
  { href: '/factions', label: 'Factions', icon: 'layers', match: (p) => p.startsWith('/factions') },
  { href: '/upgrades', label: 'Upgrades', icon: 'gear', match: (p) => p.startsWith('/upgrades') },
];

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
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  // The menu is a narrow-screen affordance; Escape closes it like any popover.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

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
      <nav className={styles.nav} aria-label="Sections">
        {SECTIONS.map((s) => {
          const on = s.match(pathname);
          return (
            <Link key={s.href} href={s.href} className={styles.navLink} data-on={on} aria-current={on ? 'page' : undefined}>
              {s.label}
            </Link>
          );
        })}
        <Link
          href="/changelog"
          className={styles.navLink}
          data-on={pathname.startsWith('/changelog')}
          aria-current={pathname.startsWith('/changelog') ? 'page' : undefined}
          title="What changed in each patch"
        >
          Patch
          <span className={`m ${styles.patchBadge}`}>{version}</span>
        </Link>
      </nav>

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
        <ReplayNavLink />
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

        {/* Narrow screens only: the section links do not fit beside the
            search, so they fold into this. */}
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label="Menu"
        >
          <Icon name={menuOpen ? 'close' : 'rows'} size={15} strokeWidth={1.8} />
        </button>
      </div>

      {menuOpen && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <nav id="site-menu" className={styles.menu} aria-label="Sections">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={styles.menuLink}
                data-on={s.match(pathname)}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={s.icon} size={14} />
                <span>{s.label}</span>
              </Link>
            ))}
            <Link href="/changelog" className={styles.menuLink} data-on={pathname.startsWith('/changelog')} onClick={() => setMenuOpen(false)}>
              <Icon name="clock" size={14} />
              <span>Patch notes</span>
              <span className={`m ${styles.patchBadge}`}>{version}</span>
            </Link>
            <a href={REPLAY_VIEWER_URL} className={styles.menuReplay} target="_blank" rel="noopener">
              <ReplayMark className={styles.menuReplayMark} />
              <span className={styles.menuReplayText}>
                <span className={`t ${styles.menuReplayTitle}`}>Replay viewer <Icon name="external" size={11} strokeWidth={1.8} /></span>
                <span className={styles.menuReplaySub}>{REPLAY_BLURB}</span>
              </span>
            </a>
          </nav>
        </>
      )}
    </header>
  );
}
