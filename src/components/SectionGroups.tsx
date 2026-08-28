'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { ROLE_SHORT } from '@/lib/faf/roles';
import { orderedRoles } from '@/lib/faf/columns';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './SectionGroups.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

/**
 * The in-game-style roster: a labelled box per section, split by tech tier, with
 * faction rows inside.
 *
 * Within a tier the columns are roles, so the same function lines up down the
 * factions: every engineer in one column, every commander in another. A faction
 * that lacks a role gets a blank slot rather than shifting everything left,
 * which is the whole point of the layout.
 */
export function SectionGroups({
  units,
  selected,
  onToggle,
  sort,
  pickMode = false,
}: {
  units: BrowseUnit[];
  selected: string[];
  onToggle: (id: string) => void;
  sort: SortDef;
  /** Passed to every chip: while picking, a click adds rather than opens. */
  pickMode?: boolean;
}) {
  // Collapsed sections, by name. Everything starts open: the roster is what
  // the page is for, and a view that opens folded makes you work to see it.
  // Folding is for getting Structures out of the way while you read Land.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (section: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(section)) next.add(section);
      return next;
    });

  const bySection = new Map<string, BrowseUnit[]>();
  for (const u of units) {
    const list = bySection.get(u.section);
    if (list) list.push(u);
    else bySection.set(u.section, [u]);
  }

  const sections = [...SECTION_ORDER, 'Unknown']
    .filter((s) => bySection.has(s))
    .map((s) => [s, bySection.get(s)!] as const);

  // The roster is 400+ images; the ones above the fold load eagerly.
  const EAGER_UNTIL = 48;
  let rendered = 0;

  return (
    <div className={styles.groups}>
      {sections.map(([section, list]) => {
        const tiers = TECH_ORDER.map((tech) => [tech, list.filter((u) => u.tech === tech)] as const)
          .filter(([, us]) => us.length > 0);

        const isOpen = !collapsed.has(section);

        return (
          <section key={section} className={styles.box}>
            <header className={styles.boxHead}>
              <button
                type="button"
                className={styles.boxToggle}
                onClick={() => toggle(section)}
                aria-expanded={isOpen}
                title={isOpen ? `Collapse ${section}` : `Expand ${section}`}
              >
                <span className={styles.boxCaret} data-open={isOpen}>
                  <Icon name="chevronDown" size={13} strokeWidth={2} />
                </span>
                <h2 className={`t ${styles.boxTitle}`}>{section}</h2>
                <span className={`m ${styles.boxCount}`}>{list.length}</span>
              </button>
            </header>

            {isOpen && (
            <div className={styles.body}>
              {tiers.map(([tech, tierUnits]) => {
                const factions = FACTIONS.filter((f) => tierUnits.some((u) => u.faction === f));

                // Column widths: how many of this role the busiest faction has.
                const roles = orderedRoles(
                  section,
                  [...new Set(tierUnits.map((u) => u.roleKey))],
                  (r) => new Set(tierUnits.filter((u) => u.roleKey === r).map((u) => u.faction)).size
                ).map(
                  (role) => {
                    const width = Math.max(
                      ...factions.map((f) => tierUnits.filter((u) => u.faction === f && u.roleKey === role).length)
                    );
                    return { role, width };
                  }
                );

                return (
                  <div key={tech} className={styles.tier}>
                    <div className={styles.tierLabel}>
                      <span className="lbl">{TECH_LABEL[tech]}</span>
                    </div>

                    <div className={styles.tierBody}>
                      {/* One header per tier: the columns are shared by every
                          faction row below, so labelling them once is enough. */}
                      <div className={styles.roleHead}>
                        <span className={styles.facMark} aria-hidden="true" />
                        <div className={styles.roleCols}>
                          {roles.map(({ role, width }) => (
                            <div key={role} className={styles.roleCol}>
                              <span
                                className={`lbl ${styles.roleLabel}`}
                                style={{ width: width * 44 + (width - 1) * 6 }}
                                title={role}
                              >
                                {ROLE_SHORT[role] ?? role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {factions.map((faction) => (
                        <div key={faction} className={styles.facRow} data-faction={faction}>
                          <span className={styles.facMark} title={faction}>
                            <FactionMark faction={faction} size={15} />
                          </span>
                          <div className={styles.roleCols}>
                            {roles.map(({ role, width }) => {
                              const mine = tierUnits
                                .filter((u) => u.faction === faction && u.roleKey === role)
                                .sort((a, b) => a.name.localeCompare(b.name));
                              return (
                                <div key={role} className={styles.roleCol} title={role}>
                                  {Array.from({ length: width }, (_, i) => {
                                    const u = mine[i];
                                    if (!u) return <span key={i} className={styles.slot} aria-hidden="true" />;
                                    return (
                                      <UnitChip
                                        key={u.id}
                                        unit={u}
                                        size={44}
                                        selected={selected.includes(u.id)}
                                        onToggle={onToggle}
                                        sort={sort}
                                        eager={rendered++ < EAGER_UNTIL}
                                        pickMode={pickMode}
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
            )}
          </section>
        );
      })}
    </div>
  );
}
