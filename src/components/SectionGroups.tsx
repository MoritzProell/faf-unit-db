'use client';

import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './SectionGroups.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];

/**
 * The in-game-style roster: a labelled box per section, faction rows inside,
 * tech tiers separated by dashed rules. Section taxonomy is upstream's.
 */
export function SectionGroups({
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

  // The roster is 400+ images. Lazy-loading every one of them means the first
  // screen paints empty wells; the ones above the fold load eagerly instead.
  const EAGER_UNTIL = 48;
  let rendered = 0;

  return (
    <div className={styles.groups}>
      {sections.map(([section, list]) => (
        <section key={section} className={styles.box}>
          <header className={styles.boxHead}>
            <h2 className={`t ${styles.boxTitle}`}>{section}</h2>
            <span className={`m ${styles.boxCount}`}>{list.length}</span>
          </header>
          <div className={styles.body}>
            {FACTIONS.map((faction) => {
              const mine = list.filter((u) => u.faction === faction);
              if (!mine.length) return null;

              const tiers = TECH_ORDER.map((tech) =>
                mine
                  .filter((u) => u.tech === tech)
                  .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
              ).filter((t) => t.length > 0);

              return (
                <div key={faction} className={styles.facRow} data-faction={faction}>
                  <span className={styles.facMark} title={faction}>
                    <FactionMark faction={faction} size={16} />
                  </span>
                  <div className={styles.units}>
                    {tiers.map((tier, i) => (
                      <div key={tier[0].tech} style={{ display: 'contents' }}>
                        {i > 0 && <span className={styles.techSep} aria-hidden="true" />}
                        {tier.map((u) => (
                          <UnitChip
                            key={u.id}
                            unit={u}
                            size={44}
                            selected={selected.includes(u.id)}
                            onToggle={onToggle}
                            sort={sort}
                            eager={rendered++ < EAGER_UNTIL}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
