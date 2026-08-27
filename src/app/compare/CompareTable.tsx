'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { UnitWell } from '@/components/UnitWell';
import { FactionMark } from '@/components/FactionMark';
import { Icon } from '@/components/Icon';
import { MassMark, EnergyMark, TimeMark } from '@/components/Marks';
import { fmtNum } from '@/lib/faf/decorate';
import type { CompareGroup } from '@/lib/faf/compare';
import styles from './compare.module.css';

export interface CompareUnit {
  id: string;
  slug: string;
  name: string;
  role: string;
  faction: string;
  techLabel: string;
  mass: number;
  energy: number;
  buildTime: number;
  abilities: string[];
}

export function CompareTable({ units, groups }: { units: CompareUnit[]; groups: CompareGroup[] }) {
  const [onlyDiff, setOnlyDiff] = useState(false);

  const shown = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, rows: onlyDiff ? g.rows.filter((r) => !r.identical) : g.rows }))
        .filter((g) => g.rows.length > 0),
    [groups, onlyDiff]
  );

  const backHref = '/';

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <Link href={backHref} className={styles.back}>
          <Icon name="chevronLeft" size={14} strokeWidth={2} /> All units
        </Link>
        <span className={styles.divider} />
        <span className={`t ${styles.title}`}>Compare</span>
        <span className={styles.sub}>
          {units.length} units · {units.map((u) => u.techLabel).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
        </span>
        <span className={styles.spacer} />
        <button className={styles.toggle} onClick={() => setOnlyDiff((v) => !v)} aria-pressed={onlyDiff}>
          <span className={styles.switch} data-on={onlyDiff}><span className={styles.knob} /></span>
          Only differences
        </button>
      </div>

      <div className={styles.wrap}>
        <div className={styles.scroller}>
          <div className={styles.table}>
            <div className={styles.headRow}>
              <div className={styles.stub}><span className="lbl" style={{ fontSize: 10 }}>Stat</span></div>
              {units.map((u) => (
                <div key={u.id} className={styles.col} data-faction={u.faction}>
                  <div className={styles.colMark} aria-hidden="true">
                    <FactionMark faction={u.faction as never} size={74} opacity={0.1} />
                  </div>
                  <div className={styles.colTop}>
                    <UnitWell id={u.id} faction={u.faction as never} techLabel={u.techLabel} size={44} imageSize={40} pip={false} />
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/unit/${u.slug}`} className={`t ${styles.colName}`}>{u.name}</Link>
                      {u.name !== u.role && <div className={styles.colRole}>{u.role}</div>}
                    </div>
                  </div>
                  <div className={styles.colCosts}>
                    <span className={styles.costItem}><MassMark size={12} /><span className="m">{fmtNum(u.mass)}</span></span>
                    <span className={styles.costItem}><EnergyMark size={12} /><span className="m">{fmtNum(u.energy)}</span></span>
                    <span className={styles.costItem}><TimeMark size={12} /><span className="m">{fmtNum(u.buildTime)}</span></span>
                  </div>
                </div>
              ))}
              {units.length < 4 && (
                <Link href={backHref} className={styles.addCol}>
                  <Icon name="plus" size={16} /> Add unit
                </Link>
              )}
            </div>

            {shown.map((group) => (
              <div key={group.label}>
                <div className={styles.groupRow}>
                  <span className={`lbl ${styles.groupLabel}`}>{group.label}</span>
                  <span className={styles.groupNote}>
                    <Icon name={group.note.startsWith('lower') ? 'down' : 'up'} size={11} strokeWidth={2} />
                    {group.note}
                  </span>
                </div>
                {group.rows.map((row, ri) => {
                  const groupLower = group.note.startsWith('lower');
                  const values = row.cells.map((c) => c.value).filter((v): v is number => v !== null);
                  const max = values.length ? Math.max(...values) : 1;
                  const min = values.length ? Math.min(...values) : 1;
                  return (
                    <div key={row.label} className={styles.row} data-stripe={ri % 2 === 1}>
                      <div className={styles.rowLabel}>
                        <span className={styles.rowLabelText}>{row.label}</span>
                        {row.ranked && row.lowerBetter !== groupLower && (
                          <span className={styles.rowDir} title={row.lowerBetter ? 'lower is better' : 'higher is better'}>
                            <Icon name={row.lowerBetter ? 'down' : 'up'} size={11} strokeWidth={2} />
                          </span>
                        )}
                      </div>
                      {row.cells.map((c, ci) => {
                        if (c.value === null) {
                          return (
                            <div key={ci} className={styles.cell}>
                              <span className={styles.cellNone}>{c.display}</span>
                            </div>
                          );
                        }
                        // Bar length always reads as "better", whichever way the stat runs.
                        const pct = row.lowerBetter
                          ? Math.max(3, (min / c.value) * 100)
                          : Math.max(3, (c.value / max) * 100);
                        const best = row.best.includes(ci);
                        return (
                          <div key={ci} className={styles.cell} data-best={best}>
                            <span className={styles.bar} style={{ width: `${pct}%` }} />
                            <span className={`m ${styles.figure}`}>{c.display}</span>
                            {best && (
                              <span className={styles.tick} aria-label="best">
                                <Icon name="check" size={9} strokeWidth={2.6} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {units.length < 4 && <span className={styles.filler} />}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className={styles.groupRow}>
              <span className={`lbl ${styles.groupLabel}`}>Abilities</span>
              <span className={styles.groupNote}>not ranked</span>
            </div>
            <div className={styles.abilityRow}>
              <div className={styles.abilityLabel}><span className={styles.rowLabelText}>Abilities</span></div>
              {units.map((u) => (
                <div key={u.id} className={styles.abilityCell} data-faction={u.faction}>
                  {u.abilities.length ? (
                    u.abilities.map((a) => <span key={a} className={styles.ability}>{a}</span>)
                  ) : (
                    <span className={styles.abilityNone}>None</span>
                  )}
                </div>
              ))}
              {units.length < 4 && <span className={styles.filler} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
