'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { BuildOrder } from '@/data/build-orders';
import styles from './build-orders.module.css';

const FOCUS = ['Opening', 'Economy', 'Land', 'Air', 'Naval', 'Mixed'] as const;
const LEVEL = ['New', 'Improving', 'Advanced'] as const;

export function BuildOrdersClient({ orders }: { orders: BuildOrder[] }) {
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState<Set<string>>(new Set(FOCUS));
  const [level, setLevel] = useState<Set<string>>(new Set(LEVEL));
  const [scope, setScope] = useState<'all' | 'generic' | 'map'>('all');

  const toggle = (set: Set<string>, apply: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    apply(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => focus.has(o.focus) && level.has(o.level))
      .filter((o) =>
        scope === 'all' ? true : scope === 'generic' ? o.scope === 'Generic' : o.scope !== 'Generic'
      )
      .filter(
        (o) =>
          !q ||
          `${o.title} ${o.scope} ${o.author ?? ''} ${o.blurb} ${o.source}`.toLowerCase().includes(q)
      );
  }, [orders, query, focus, level, scope]);

  const dirty =
    query.trim() !== '' || scope !== 'all' ||
    focus.size !== FOCUS.length || level.size !== LEVEL.length;

  const reset = () => {
    setQuery(''); setScope('all');
    setFocus(new Set(FOCUS)); setLevel(new Set(LEVEL));
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.rail} aria-label="Filters">
        <div className={styles.railHead}>
          <Icon name="sliders" size={15} />
          <span className={`t ${styles.railTitle}`}>FILTERS</span>
          <button className={styles.reset} onClick={reset} disabled={!dirty}>Reset</button>
        </div>

        <label className={styles.search}>
          <Icon name="search" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search maps, authors"
            aria-label="Search build orders"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          )}
        </label>

        <div className={styles.group}>
          <span className="lbl">Scope</span>
          <div className={styles.chips}>
            {([['all', 'All'], ['generic', 'Generic'], ['map', 'Map specific']] as const).map(([v, l]) => (
              <button key={v} className={styles.chip} data-on={scope === v}
                onClick={() => setScope(v)} aria-pressed={scope === v}>{l}</button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Focus</span>
          <div className={styles.chips}>
            {FOCUS.map((f) => (
              <button key={f} className={styles.chip} data-on={focus.has(f)}
                onClick={() => toggle(focus, setFocus, f)} aria-pressed={focus.has(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Level</span>
          <div className={styles.chips}>
            {LEVEL.map((l) => (
              <button key={l} className={styles.chip} data-on={level.has(l)}
                onClick={() => toggle(level, setLevel, l)} aria-pressed={level.has(l)}>{l}</button>
            ))}
          </div>
        </div>

        <p className={styles.tally}>{filtered.length} of {orders.length}</p>
      </aside>

      <div className={styles.main}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Nothing matches those filters.</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((o) => (
              <a key={o.url} className={styles.card} href={o.url} target="_blank" rel="noopener noreferrer">
                <div className={styles.cardTop}>
                  <span className={`t ${styles.cardTitle}`}>{o.title}</span>
                  <Icon name="chevronRight" size={13} />
                </div>
                <div className={styles.tags}>
                  <span className={styles.tag} data-kind="scope" data-generic={o.scope === 'Generic'}>{o.scope}</span>
                  <span className={styles.tag}>{o.focus}</span>
                  <span className={styles.tag} data-level={o.level}>{o.level}</span>
                </div>
                <p className={styles.cardBlurb}>{o.blurb}</p>
                {o.caveat && <p className={styles.cardCaveat}>{o.caveat}</p>}
                <div className={styles.cardMeta}>
                  <span className={styles.cardSource}>{o.source}</span>
                  {o.author && <span>{o.author}</span>}
                  {o.year && <span className="m">{o.year}</span>}
                  {o.signal && <span className={`m ${styles.cardSignal}`}>{o.signal}</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
