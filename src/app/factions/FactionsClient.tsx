'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UnitWell } from '@/components/UnitWell';
import { Icon } from '@/components/Icon';
import { FactionMark } from '@/components/FactionMark';
import type { Faction } from '@/lib/faf/types';
import styles from './factions.module.css';

export interface SlotRowLite {
  id: string;
  slug: string;
  name: string;
  faction: Faction;
  techLabel: string;
  hasRender: boolean;
  values: Array<{ key: string; text: string; best: boolean }>;
}

export interface SlotLite {
  id: string;
  label: string;
  role: string;
  tech: string;
  techLabel: string;
  kind: string;
  columns: string[];
  rows: SlotRowLite[];
  unique: boolean;
  missing: Faction[];
}

const KINDS = ['Land', 'Air', 'Naval', 'Base'];
const KIND_LABEL: Record<string, string> = { Land: 'Land', Air: 'Air', Naval: 'Naval', Base: 'Structures' };
const TECHS = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

export function FactionsClient({ slots }: { slots: SlotLite[] }) {
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState<Set<string>>(new Set(KINDS));
  const [techs, setTechs] = useState<Set<string>>(new Set(TECHS));
  const [onlyUnique, setOnlyUnique] = useState(false);

  const roles = useMemo(
    () => [...new Set(slots.map((s) => s.role))].sort(),
    [slots]
  );
  const [role, setRole] = useState<string>('all');

  const toggle = (set: Set<string>, apply: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    apply(next);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slots
      .filter((s) => kinds.has(s.kind) && techs.has(s.tech))
      .filter((s) => (role === 'all' ? true : s.role === role))
      .filter((s) => (onlyUnique ? s.unique : true))
      .filter((s) => !q || s.label.toLowerCase().includes(q) ||
        s.rows.some((r) => r.name.toLowerCase().includes(q)));
  }, [slots, query, kinds, techs, role, onlyUnique]);

  const dirty =
    query.trim() !== '' || role !== 'all' || onlyUnique ||
    kinds.size !== KINDS.length || techs.size !== TECHS.length;

  const reset = () => {
    setQuery(''); setRole('all'); setOnlyUnique(false);
    setKinds(new Set(KINDS)); setTechs(new Set(TECHS));
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.rail} aria-label="Slot filters">
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
            placeholder="Search slots or units"
            aria-label="Search slots"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          )}
        </label>

        <div className={styles.group}>
          <span className="lbl">Domain</span>
          <div className={styles.chips}>
            {KINDS.map((k) => (
              <button key={k} className={styles.chip} data-on={kinds.has(k)}
                onClick={() => toggle(kinds, setKinds, k)} aria-pressed={kinds.has(k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Tech level</span>
          <div className={styles.chips}>
            {TECHS.map((t) => (
              <button key={t} className={styles.chip} data-on={techs.has(t)}
                onClick={() => toggle(techs, setTechs, t)} aria-pressed={techs.has(t)}>
                {TECH_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.group}>
          <span className="lbl">Role</span>
          <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <button className={styles.uniqueToggle} data-on={onlyUnique}
          onClick={() => setOnlyUnique((v) => !v)} aria-pressed={onlyUnique}>
          <span className={styles.box} data-on={onlyUnique}>
            <Icon name="check" size={11} strokeWidth={2.4} />
          </span>
          Only slots one faction has
        </button>

        <p className={styles.tally}>{filtered.length} of {slots.length} slots</p>
      </aside>

      <div className={styles.main}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No slots match those filters.</p>
        ) : (
          filtered.map((slot) => <SlotCard key={slot.id} slot={slot} />)
        )}
      </div>
    </div>
  );
}

function SlotCard({ slot }: { slot: SlotLite }) {
  return (
    <section className={styles.slot}>
      <div className={styles.slotHead}>
        <h2 className={`t ${styles.slotTitle}`}>{slot.label}</h2>
        {slot.unique && (
          <span className={styles.uniqueBadge}>
            Only {slot.rows[0]?.faction} has one
          </span>
        )}
        {!slot.unique && slot.missing.length > 0 && (
          <span className={styles.missingNote}>
            none for {slot.missing.join(', ')}
          </span>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thUnit}>Unit</th>
              {slot.columns.map((c) => <th key={c}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {slot.rows.map((r) => (
              <tr key={r.id} data-faction={r.faction}>
                <td className={styles.tdUnit}>
                  <Link href={`/unit/${r.slug}`} className={styles.unitLink}>
                    <UnitWell id={r.id} faction={r.faction} techLabel={r.techLabel}
                      size={28} imageSize={26} pip={false} hasRender={r.hasRender} />
                    <span className={styles.unitBody}>
                      <span className={styles.unitName}>{r.name}</span>
                      <span className={styles.unitFaction}>
                        <FactionMark faction={r.faction} size={10} /> {r.faction}
                      </span>
                    </span>
                  </Link>
                </td>
                {r.values.map((v) => (
                  <td key={v.key} className={`m ${styles.num}`} data-best={v.best}>{v.text}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
