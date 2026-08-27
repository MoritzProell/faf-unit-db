'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UnitWell } from '@/components/UnitWell';
import { Icon } from '@/components/Icon';
import { FactionMark } from '@/components/FactionMark';
import { MassMark, EnergyMark, TimeMark } from '@/components/Marks';
import { fmtNum } from '@/lib/faf/decorate';
import { SLOT_ORDER, SLOT_LABEL, type Slot } from '@/lib/faf/enhancements';
import type { Faction } from '@/lib/faf/types';
import styles from './upgrades.module.css';

export interface UpgradeRow {
  key: string;
  name: string;
  slot: Slot;
  mass: number;
  energy: number;
  buildTime: number;
  prerequisite?: string;
  unlocks?: string;
  effects: Array<{ label: string; value: string }>;
  blurb?: string;
}

export interface HostRow {
  id: string;
  slug: string;
  name: string;
  faction: Faction;
  techLabel: string;
  role: string;
  hasRender: boolean;
  /** Support Commanders are a different unit with a different upgrade set. */
  support: boolean;
  upgrades: UpgradeRow[];
}

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];

export function UpgradesClient({ hosts }: { hosts: HostRow[] }) {
  const [query, setQuery] = useState('');
  const [factions, setFactions] = useState<Set<string>>(new Set(FACTIONS));
  const [slots, setSlots] = useState<Set<string>>(new Set(SLOT_ORDER));
  const [kind, setKind] = useState<'all' | 'acu' | 'sacu'>('all');

  const toggle = (set: Set<string>, apply: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    apply(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hosts
      .filter((h) => factions.has(h.faction))
      .filter((h) => (kind === 'all' ? true : kind === 'sacu' ? h.support : !h.support))
      .map((h) => ({
        ...h,
        upgrades: h.upgrades
          .filter((u) => slots.has(u.slot))
          .filter((u) =>
            !q ||
            `${u.name} ${u.blurb ?? ''} ${h.name} ${h.faction}`.toLowerCase().includes(q)
          ),
      }))
      .filter((h) => h.upgrades.length > 0);
  }, [hosts, query, factions, slots, kind]);

  const shown = filtered.reduce((n, h) => n + h.upgrades.length, 0);
  const total = hosts.reduce((n, h) => n + h.upgrades.length, 0);
  const dirty =
    query.trim() !== '' || kind !== 'all' ||
    factions.size !== FACTIONS.length || slots.size !== SLOT_ORDER.length;

  const reset = () => {
    setQuery(''); setKind('all');
    setFactions(new Set(FACTIONS)); setSlots(new Set(SLOT_ORDER));
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.rail} aria-label="Upgrade filters">
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
            placeholder="Search upgrades"
            aria-label="Search upgrades"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          )}
        </label>

        <div className={styles.group}>
          <span className="lbl">Faction</span>
          <div className={styles.groupBody}>
            {FACTIONS.map((f) => {
              const on = factions.has(f);
              const count = hosts
                .filter((h) => h.faction === f)
                .reduce((n, h) => n + h.upgrades.length, 0);
              return (
                <button
                  key={f}
                  className={styles.checkRow}
                  data-on={on}
                  onClick={() => toggle(factions, setFactions, f)}
                  aria-pressed={on}
                >
                  <span className={styles.box} data-on={on}>
                    <Icon name="check" size={11} strokeWidth={2.4} />
                  </span>
                  <FactionMark faction={f} size={13} />
                  <span className={styles.checkLabel}>{f}</span>
                  <span className={styles.count}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Commander</span>
          <div className={styles.chips}>
            {([['all', 'All'], ['acu', 'ACU'], ['sacu', 'Support']] as const).map(([v, label]) => (
              <button
                key={v}
                className={styles.chip}
                data-on={kind === v}
                onClick={() => setKind(v)}
                aria-pressed={kind === v}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Slot</span>
          <div className={styles.chips}>
            {SLOT_ORDER.map((s) => (
              <button
                key={s}
                className={styles.chip}
                data-on={slots.has(s)}
                onClick={() => toggle(slots, setSlots, s)}
                aria-pressed={slots.has(s)}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.tally}>
          {shown === total ? `${total} upgrades` : `${shown} of ${total} upgrades`}
        </p>
      </aside>

      <div className={styles.main}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No upgrades match those filters.</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((host) => (
              <HostCard key={host.id} host={host} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HostCard({ host }: { host: HostRow }) {
  const bySlot = SLOT_ORDER.map(
    (s) => [s, host.upgrades.filter((u) => u.slot === s)] as const
  ).filter(([, list]) => list.length > 0);

  return (
    <section className={styles.host} data-faction={host.faction}>
      <Link href={`/unit/${host.slug}`} className={styles.hostHead}>
        <UnitWell
          id={host.id}
          faction={host.faction}
          techLabel={host.techLabel}
          size={44}
          imageSize={40}
          pip={false}
          hasRender={host.hasRender}
        />
        <span className={styles.hostBody}>
          <span className={`t ${styles.hostName}`}>{host.name}</span>
          <span className={styles.hostRole}>{host.faction} · {host.role}</span>
        </span>
        <Icon name="chevronRight" size={14} />
      </Link>

      {bySlot.map(([slot, list]) => (
        <div key={slot}>
          <div className={styles.slotHead}>
            <span className="lbl" style={{ fontSize: 9 }}>{SLOT_LABEL[slot]}</span>
            <span className={`m ${styles.slotCount}`}>{list.length}</span>
            <span className="rule" />
          </div>
          {list.map((u) => (
            <Link
              key={u.key}
              href={`/unit/${host.slug}#upgrade-${u.key.toLowerCase()}`}
              className={styles.row}
            >
              <div className={styles.rowTop}>
                <span className={`t ${styles.rowName}`}>{u.name}</span>
                <span className={styles.costs}>
                  <span className={styles.cost}><MassMark size={10} /><span className="m">{fmtNum(u.mass)}</span></span>
                  <span className={styles.cost}><EnergyMark size={10} /><span className="m">{fmtNum(u.energy)}</span></span>
                  <span className={styles.cost}><TimeMark size={10} /><span className="m">{fmtNum(u.buildTime)}</span></span>
                </span>
              </div>
              {u.blurb && <p className={styles.blurb}>{u.blurb}</p>}
              {(u.effects.length > 0 || u.unlocks) && (
                <div className={styles.effects}>
                  {u.effects.map((f) => (
                    <span key={f.label} className={styles.pill}>
                      <span className={styles.pillLabel}>{f.label}</span>
                      <span className="m">{f.value}</span>
                    </span>
                  ))}
                  {u.unlocks && (
                    <span className={styles.pill}>
                      <span className={styles.pillLabel}>Unlocks</span>
                      <span className="m">{u.unlocks}</span>
                    </span>
                  )}
                </div>
              )}
              {u.prerequisite && <div className={styles.prereq}>Requires {u.prerequisite}</div>}
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
