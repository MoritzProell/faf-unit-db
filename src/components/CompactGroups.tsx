'use client';

import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './CompactGroups.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

/**
 * Compact, but organised.
 *
 * This used to be one wrap of every unit per faction, which at 100+ units a
 * faction is a wall rather than a list. It now uses the same hierarchy as the
 * roster view — section, then tech tier, then a row per faction — and drops
 * only the role columns. Losing the columns is what keeps it compact: units
 * pack tight instead of leaving a blank slot wherever a faction has no unit
 * for that role, so a section takes a fraction of the height.
 *
 * Within a row units stay in the current sort order, so the control still does
 * something here even though it does not in the roster view.
 */
export function CompactGroups({
  units,
  selected,
  onToggle,
  sort,
}: {
  units: BrowseUnit[];
  selected: string[];
  onToggle: (id: string) => void;
  sort: SortDef;
}) {
  const bySection = new Map<string, BrowseUnit[]>();
  for (const u of units) {
    const list = bySection.get(u.section);
    if (list) list.push(u);
    else bySection.set(u.section, [u]);
  }

  const sections = [...SECTION_ORDER, 'Unknown']
    .filter((s) => bySection.has(s))
    .map((s) => [s, bySection.get(s)!] as const);

  const EAGER_UNTIL = 60;
  let rendered = 0;

  return (
    <div className={styles.groups}>
      {sections.map(([section, list]) => {
        const tiers = TECH_ORDER.map((tech) => [tech, list.filter((u) => u.tech === tech)] as const)
          .filter(([, us]) => us.length > 0);

        return (
          <section key={section} className={styles.box}>
            <header className={styles.boxHead}>
              <h2 className={`t ${styles.boxTitle}`}>{section}</h2>
              <span className={`m ${styles.boxCount}`}>{list.length}</span>
            </header>

            <div className={styles.body}>
              {tiers.map(([tech, tierUnits]) => {
                const factions = FACTIONS.filter((f) => tierUnits.some((u) => u.faction === f));
                return (
                  <div key={tech} className={styles.tier}>
                    <div className={styles.tierTab}>
                      <span className={`m ${styles.tierLabel}`}>{TECH_LABEL[tech]}</span>
                    </div>
                    <div className={styles.tierRows}>
                      {factions.map((faction) => {
                        const row = tierUnits.filter((u) => u.faction === faction);
                        return (
                          <div key={faction} className={styles.row} data-faction={faction}>
                            <span className={styles.rowMark} title={faction}>
                              <FactionMark faction={faction} size={14} />
                            </span>
                            <div className={styles.rowUnits}>
                              {row.map((u) => {
                                const eager = rendered++ < EAGER_UNTIL;
                                return (
                                  <UnitChip
                                    key={u.id}
                                    unit={u}
                                    size={40}
                                    selected={selected.includes(u.id)}
                                    onToggle={onToggle}
                                    sort={sort}
                                    eager={eager}
                                  />
                                );
                              })}
                            </div>
                            <span className={`m ${styles.rowCount}`}>{row.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
