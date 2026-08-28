'use client';

import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { ROLE_ORDER, ROLE_SHORT } from '@/lib/faf/roles';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './CompactGroups.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

const CHIP = 32;
const CHIP_GAP = 3;

/**
 * The roster again, but dense: same section, tier, faction and role structure
 * as the grouped view, with two things traded for height.
 *
 * Sections flow into as many columns as fit rather than stacking, and the role
 * labels run on a diagonal. The diagonal is what makes the rest possible — a
 * horizontal label forces its column to be at least as wide as the word, so
 * "TORPEDO BOMBER" would set a floor no number of units justifies. Rotated, a
 * label needs almost no width, and a column can be exactly as wide as the
 * units standing in it.
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

                // A column is as wide as the busiest faction's count for that
                // role, so every faction row lines up beneath the same label.
                const roles = ROLE_ORDER.filter((r) => tierUnits.some((u) => u.roleKey === r)).map(
                  (role) => ({
                    role,
                    width: Math.max(
                      ...factions.map(
                        (f) => tierUnits.filter((u) => u.faction === f && u.roleKey === role).length
                      )
                    ),
                  })
                );

                const colWidth = (w: number) => w * CHIP + (w - 1) * CHIP_GAP;

                return (
                  <div key={tech} className={styles.tier}>
                    <div className={styles.tierTab}>
                      <span className={`m ${styles.tierLabel}`}>{TECH_LABEL[tech]}</span>
                    </div>

                    <div className={styles.tierBody}>
                      <div className={styles.roleHead}>
                        <span className={styles.facMark} aria-hidden="true" />
                        <div className={styles.roleCols}>
                          {roles.map(({ role, width }) => (
                            <div
                              key={role}
                              className={styles.roleCol}
                              style={{ width: colWidth(width) }}
                            >
                              <span className={`lbl ${styles.roleLabel}`} title={role}>
                                {ROLE_SHORT[role] ?? role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {factions.map((faction) => (
                        <div key={faction} className={styles.row} data-faction={faction}>
                          <span className={styles.facMark} title={faction}>
                            <FactionMark faction={faction} size={14} />
                          </span>
                          <div className={styles.roleCols}>
                            {roles.map(({ role, width }) => {
                              const mine = tierUnits
                                .filter((u) => u.faction === faction && u.roleKey === role)
                                .sort((a, b) => a.name.localeCompare(b.name));
                              return (
                                <div
                                  key={role}
                                  className={styles.roleCol}
                                  style={{ width: colWidth(width) }}
                                  title={role}
                                >
                                  {Array.from({ length: width }, (_, i) => {
                                    const u = mine[i];
                                    if (!u) {
                                      return <span key={i} className={styles.slot} aria-hidden="true" />;
                                    }
                                    return (
                                      <UnitChip
                                        key={u.id}
                                        unit={u}
                                        size={CHIP}
                                        selected={selected.includes(u.id)}
                                        onToggle={onToggle}
                                        sort={sort}
                                        eager={rendered++ < EAGER_UNTIL}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
