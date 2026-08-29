'use client';

import Link from 'next/link';
import { FactionMark } from './FactionMark';
import { Icon } from './Icon';
import { ROLE_KEYS, ROLE_LABEL } from '@/lib/faf/browse';
import type { Faction, Kind, Tech } from '@/lib/faf/types';
import styles from './FilterRail.module.css';

export const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
export const TECHS: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
export const KINDS: Kind[] = ['Land', 'Air', 'Naval', 'Base'];

export interface Facets {
  faction: Record<string, number>;
  tech: Record<string, number>;
  kind: Record<string, number>;
  role: Record<string, number>;
}

export interface FilterState {
  factions: Set<string>;
  techs: Set<string>;
  kinds: Set<string>;
  roles: Set<string>;
}

const KIND_LABEL: Record<string, string> = { Land: 'Land', Air: 'Air', Naval: 'Naval', Base: 'Structure' };
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

/**
 * The other places to go. Lives in the rail on a wide screen, and is rendered
 * again above the roster on a narrow one: on mobile the rail is a drawer
 * behind the Filters button, which meant Learn, Build orders and the rest were
 * only reachable by opening a filter panel to look for something that is not a
 * filter.
 */
export function SectionNav({ layout = 'rail' }: { layout?: 'rail' | 'strip' }) {
  return (
    <nav className={layout === 'strip' ? styles.browseStrip : styles.browse} aria-label="Sections">
      <Link href="/learn" className={styles.railLink}>
        <Icon name="target" size={13} />
        <span>Learn</span>
        <Icon name="chevronRight" size={12} />
      </Link>
      <Link href="/build-orders" className={styles.railLink}>
        <Icon name="rows" size={13} />
        <span>Build orders</span>
        <Icon name="chevronRight" size={12} />
      </Link>
      <Link href="/factions" className={styles.railLink}>
        <Icon name="layers" size={13} />
        <span>Faction comparison</span>
        <Icon name="chevronRight" size={12} />
      </Link>
      <Link href="/upgrades" className={styles.railLink}>
        <Icon name="gear" size={13} />
        <span>Commander upgrades</span>
        <Icon name="chevronRight" size={12} />
      </Link>
    </nav>
  );
}

export function FilterRail({
  facets,
  state,
  onToggle,
  onReset,
  dirty,
}: {
  facets: Facets;
  state: FilterState;
  onToggle: (group: keyof FilterState, value: string) => void;
  onReset: () => void;
  dirty: boolean;
}) {
  return (
    <aside className={styles.rail} aria-label="Filters">
      {/* Above the filters, not below them. These are the other places to go,
          and a reader looking for them should not have to scroll past every
          facet to find out they exist. Kept out of the FILTERS heading because
          they are not filters. */}
      <SectionNav />

      <div className={styles.head}>
        <Icon name="sliders" size={15} />
        <span className={`t ${styles.headTitle}`}>FILTERS</span>
        <button className={styles.reset} onClick={onReset} disabled={!dirty}>Reset</button>
      </div>

      <Group label="Faction">
        <div className={styles.groupBody}>
          {FACTIONS.map((f) => {
            const on = state.factions.has(f);
            return (
              <button
                key={f}
                className={styles.row}
                data-on={on}
                data-faction={f}
                aria-pressed={on}
                onClick={() => onToggle('factions', f)}
              >
                <Check on={on} color="var(--fac)" />
                <span style={{ color: on ? 'var(--fac)' : 'var(--text-3)', display: 'flex' }}>
                  <FactionMark faction={f} size={14} opacity={on ? 1 : 0.4} />
                </span>
                <span className={styles.rowLabel}>{f}</span>
                <span className={`m ${styles.count}`}>{facets.faction[f] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Tech level">
        <div className={styles.chips}>
          {TECHS.map((t) => (
            <Chip
              key={t}
              label={TECH_LABEL[t]}
              count={facets.tech[t] ?? 0}
              on={state.techs.has(t)}
              onClick={() => onToggle('techs', t)}
            />
          ))}
        </div>
      </Group>

      <Group label="Domain">
        <div className={styles.chips}>
          {KINDS.map((k) => (
            <Chip
              key={k}
              label={KIND_LABEL[k]}
              count={facets.kind[k] ?? 0}
              on={state.kinds.has(k)}
              onClick={() => onToggle('kinds', k)}
            />
          ))}
        </div>
      </Group>

      <Group label="Role">
        <div className={styles.groupBody}>
          {ROLE_KEYS.map((r) => {
            const on = state.roles.has(r);
            return (
              <button key={r} className={styles.row} data-on={on} aria-pressed={on} onClick={() => onToggle('roles', r)}>
                <Check on={on} />
                <span className={styles.rowLabel}>{ROLE_LABEL[r]}</span>
                <span className={`m ${styles.count}`}>{facets.role[r] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Group>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <span className="lbl">{label}</span>
      {children}
    </div>
  );
}

function Check({ on, color }: { on: boolean; color?: string }) {
  return (
    <span className={styles.box} data-on={on} style={color ? ({ '--boxColor': color } as React.CSSProperties) : undefined}>
      <Icon name="check" size={11} strokeWidth={2.4} />
    </span>
  );
}

function Chip({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) {
  return (
    <button className={styles.chip} data-on={on} aria-pressed={on} onClick={onClick}>
      {label}
      <span className={`m ${styles.chipCount}`}>{count}</span>
    </button>
  );
}
