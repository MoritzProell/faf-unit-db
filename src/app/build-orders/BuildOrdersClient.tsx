'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { FactionMark } from '@/components/FactionMark';
import { Segmented } from '@/components/Segmented';
import type { BoGroup, BuildOrder } from '@/data/build-orders';
import styles from './build-orders.module.css';

const FOCUS = ['Opening', 'Economy', 'Land', 'Air', 'Naval', 'Mixed'] as const;
const LEVEL = ['New', 'Improving', 'Advanced'] as const;

type Level = 'all' | (typeof LEVEL)[number];
type Kind = 'all' | 'generic' | 'map';
type Format = 'all' | 'video' | 'written';
type Focus = 'all' | (typeof FOCUS)[number];

interface Filters {
  level: Level;
  kind: Kind;
  format: Format;
  focus: Focus;
}

const NONE: Filters = { level: 'all', kind: 'all', format: 'all', focus: 'all' };

/** A long shelf shows this many until it is opened, unless a filter is narrowing things anyway. */
const SHELF_PREVIEW = 3;

type GuideKind = 'card' | 'faction' | 'row';

const isVideo = (o: BuildOrder) => o.source === 'YouTube';

function passes(o: BuildOrder, f: Filters, q: string) {
  if (f.level !== 'all' && o.level !== f.level) return false;
  if (f.kind === 'generic' && o.scope !== 'Generic') return false;
  if (f.kind === 'map' && o.scope === 'Generic') return false;
  if (f.format === 'video' && !isVideo(o)) return false;
  if (f.format === 'written' && isVideo(o)) return false;
  if (f.focus !== 'all' && o.focus !== f.focus) return false;
  if (!q) return true;
  return `${o.title} ${o.scope} ${o.author ?? ''} ${o.blurb} ${o.source} ${o.faction ?? ''} ${o.focus}`
    .toLowerCase()
    .includes(q);
}

export function BuildOrdersClient({
  orders,
  groups,
}: {
  orders: BuildOrder[];
  groups: { key: BoGroup; title: string; intro: string }[];
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NONE);
  const [open, setOpen] = useState<Set<BoGroup>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const q = query.trim().toLowerCase();
  const dirty = q !== '' || (Object.keys(NONE) as (keyof Filters)[]).some((k) => filters[k] !== NONE[k]);
  const active = (Object.keys(NONE) as (keyof Filters)[]).filter((k) => filters[k] !== NONE[k]).length;
  const matches = useMemo(() => orders.filter((o) => passes(o, filters, q)), [orders, filters, q]);

  /** What each option would leave, given every other filter as it stands. */
  const countFor = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    orders.filter((o) => passes(o, { ...filters, [key]: value }, q)).length;

  const set = <K extends keyof Filters>(key: K) => (value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setQuery('');
    setFilters(NONE);
  };

  const focuses = FOCUS.filter((f) => orders.some((o) => o.focus === f));

  const toggleShelf = (key: BoGroup) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /**
   * Start here and the faction guides are short and wanted whole, so they are
   * cards across the full width. The longer shelves are compact rows that share
   * a line, and show their first few until opened, unless a filter or search is
   * already doing the narrowing.
   */
  const shelves = groups
    .map((g) => {
      const list = matches.filter((o) => o.group === g.key);
      const kind: GuideKind = g.key === 'start' ? 'card' : g.key === 'faction' ? 'faction' : 'row';
      const long = kind === 'row' && !dirty && list.length > SHELF_PREVIEW + 1;
      const capped = long && !open.has(g.key);
      return { ...g, list, kind, long, capped, shown: capped ? list.slice(0, SHELF_PREVIEW) : list };
    })
    .filter((s) => s.list.length > 0);

  const shelf = (s: (typeof shelves)[number]) => (
    <section key={s.key} className={styles.shelf} data-kind={s.kind} aria-labelledby={`shelf-${s.key}`}>
      <div className={styles.shelfHead}>
        <h3 id={`shelf-${s.key}`} className={`t ${styles.shelfTitle}`}>
          {s.title}
          <span className={`m ${styles.shelfCount}`}>{s.list.length}</span>
        </h3>
        <p className={styles.shelfIntro}>{s.intro}</p>
      </div>
      <ul className={styles.shelfList} id={`shelf-list-${s.key}`}>
        {s.shown.map((o) => (
          <li key={o.url}>
            <Guide o={o} kind={s.kind} />
          </li>
        ))}
      </ul>
      {s.long && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={!s.capped}
          aria-controls={`shelf-list-${s.key}`}
          onClick={() => toggleShelf(s.key)}
        >
          {s.capped ? `Show ${s.list.length - SHELF_PREVIEW} more` : 'Show fewer'}
          <Icon name={s.capped ? 'chevronDown' : 'up'} size={12} strokeWidth={2.2} />
        </button>
      )}
    </section>
  );

  return (
    <div className={styles.guides}>
      <div className={styles.bar} role="search" aria-label="Filter guides">
        <label className={styles.search}>
          <Icon name="search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, maps, authors"
            aria-label="Search guides"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          )}
        </label>

        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={showFilters}
          aria-controls="guide-filters"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Icon name="sliders" size={14} /> Filters
          {active > 0 && <span className={`m ${styles.filtersCount}`}>{active}</span>}
        </button>

        {/* On a phone the four questions fold away behind one button, so the
            guides are not a full screen of buttons further down. */}
        <div id="guide-filters" className={styles.filterSet} data-open={showFilters}>
          <Segmented
            label="Level"
            value={filters.level}
            onChange={set('level')}
            options={[
              { value: 'all', label: 'All' },
              ...LEVEL.map((l) => ({ value: l, label: l, count: countFor('level', l) })),
            ]}
          />
          <Segmented
            label="Map"
            value={filters.kind}
            onChange={set('kind')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'generic', label: 'Any map', count: countFor('kind', 'generic') },
              { value: 'map', label: 'One map', count: countFor('kind', 'map') },
            ]}
          />
          <Segmented
            label="Format"
            value={filters.format}
            onChange={set('format')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'video', label: 'Video', count: countFor('format', 'video') },
              { value: 'written', label: 'Written', count: countFor('format', 'written') },
            ]}
          />
          <Segmented
            label="Focus"
            value={filters.focus}
            onChange={set('focus')}
            options={[
              { value: 'all', label: 'All' },
              ...focuses.map((f) => ({ value: f, label: f, count: countFor('focus', f) })),
            ]}
          />
        </div>

        <div className={styles.tally}>
          <p className="m" role="status">
            {dirty ? `${matches.length} of ${orders.length}` : `${orders.length} guides`}
          </p>
          {dirty && (
            <button type="button" className={styles.reset} onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className={styles.empty}>
          Nothing matches those filters.{' '}
          <button type="button" className={styles.inlineBtn} onClick={reset}>
            Clear them
          </button>
        </p>
      ) : (
        <div className={styles.shelves}>
          {shelves.filter((s) => s.kind !== 'row').map(shelf)}
          {shelves.some((s) => s.kind === 'row') && (
            <div className={styles.rowShelves}>{shelves.filter((s) => s.kind === 'row').map(shelf)}</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One guide. The whole thing is the link, since leaving for the guide is the
 * only thing to do with it here; nothing is reproduced on this site.
 */
function Guide({ o, kind }: { o: BuildOrder; kind: GuideKind }) {
  return (
    <a
      className={styles.guide}
      data-kind={kind}
      data-faction={o.faction}
      href={o.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.guideTop}>
        {o.faction && <FactionMark faction={o.faction} size={18} className={styles.guideMark} />}
        <span className={`t ${styles.guideTitle}`}>{o.title}</span>
        <Icon name="external" size={12} />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </span>
      <span className={styles.tags}>
        <span className={styles.tag} data-level={o.level}>
          {o.level}
        </span>
        {o.scope !== 'Generic' && (
          <span className={styles.tag} data-kind="scope">
            {o.scope}
          </span>
        )}
        <span className={styles.tag}>{o.focus}</span>
      </span>
      <span className={styles.blurb}>{o.blurb}</span>
      {o.caveat && <span className={styles.caveat}>{o.caveat}</span>}
      <span className={styles.meta}>
        <span className={styles.source}>
          {isVideo(o) && <Icon name="play" size={12} />}
          {o.source}
        </span>
        {o.author && <span>{o.author}</span>}
        {o.year && <span className="m">{o.year}</span>}
        {o.signal && <span className={`m ${styles.signal}`}>{o.signal}</span>}
      </span>
    </a>
  );
}
