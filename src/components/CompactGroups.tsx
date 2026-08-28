'use client';

import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { ROLE_SHORT } from '@/lib/faf/roles';
import { orderedRoles } from '@/lib/faf/columns';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import { Icon, type IconName } from './Icon';
import ICON_DIMS from '@/data/strategic-icons.json';
import styles from './CompactGroups.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

/**
 * Chip size follows the window, because no single number is right.
 *
 * Measured on the live page with the boxes' flex-grow off, so these are the
 * widths the content actually asks for. Land, Air and Naval side by side need
 * 22·chip + 328px of fixed furniture, which means the largest chip that keeps
 * all three on one row is:
 *
 *     1440px screen (1152 grid) -> 36
 *     1920px screen (1600 grid) -> 56
 *     2000px screen (1712 grid) -> 61
 *
 * A fixed 32 was leaving most of a wide screen empty; a fixed 42 broke the
 * narrow one. So the size lives in CSS as --chip and steps with the viewport,
 * and every width here is a calc() against it rather than a number baked in at
 * render time. Chosen conservatively: each step sits a little under its own
 * ceiling so the layout never sits exactly on the edge of wrapping.
 */
const CHIP_VAR = 'var(--chip)';

const DIMS = ICON_DIMS as unknown as Record<string, [number, number]>;

/**
 * Columns whose strategic icon does not distinguish them.
 *
 * The game draws a T1 radar and a T1 sonar with the same
 * `icon_structure1_intel`, so the split columns would carry identical symbols
 * and the icon would say nothing. These four use the site's own line icons
 * instead, which do tell them apart.
 */
const ROLE_ICON: Record<string, IconName> = {
  Radar: 'radar',
  Sonar: 'sonar',
  Omni: 'omni',
  Stealth: 'stealth',
};

/** The icon most of a column's units carry, or none if the column disagrees. */
function modalIcon(units: BrowseUnit[]): string | null {
  const counts = new Map<string, number>();
  for (const u of units) {
    if (u.icon) counts.set(u.icon, (counts.get(u.icon) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [icon, n] of counts) {
    if (n > bestN) { best = icon; bestN = n; }
  }
  return best;
}

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
  pickMode = false,
}: {
  units: BrowseUnit[];
  selected: string[];
  onToggle: (id: string) => void;
  sort: SortDef;
  /** Passed to every chip: while picking, a click adds rather than opens. */
  pickMode?: boolean;
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
                const roles = orderedRoles(
                  section,
                  [...new Set(tierUnits.map((u) => u.roleKey))],
                  (r) => new Set(tierUnits.filter((u) => u.roleKey === r).map((u) => u.faction)).size
                ).map(
                  (role) => {
                    const mine = tierUnits.filter((u) => u.roleKey === role);
                    return {
                      role,
                      width: Math.max(
                        ...factions.map(
                          (f) => mine.filter((u) => u.faction === f).length
                        )
                      ),
                      // The column's own symbol, taken by vote of the units
                      // standing in it rather than from a hand-written map:
                      // strategic icons already encode domain, tier and weapon
                      // role, so a column of T2 gunships agrees with itself,
                      // and where a column is mixed the majority is the honest
                      // answer. A hand-written map would go stale; this cannot.
                      icon: modalIcon(mine),
                    };
                  }
                );

                // calc, not arithmetic: --chip changes with the viewport and
                // the columns have to change with it.
                const colWidth = (w: number) =>
                  `calc(${CHIP_VAR} * ${w} + var(--chip-gap) * ${w - 1})`;

                return (
                  <div key={tech} className={styles.tier}>
                    <div className={styles.tierTab}>
                      <span className={`m ${styles.tierLabel}`}>{TECH_LABEL[tech]}</span>
                    </div>

                    <div className={styles.tierBody}>
                      <div className={styles.roleHead}>
                        <span className={styles.facMark} aria-hidden="true" />
                        <div className={styles.roleCols}>
                          {roles.map(({ role, width, icon }) => (
                            <div
                              key={role}
                              className={styles.roleCol}
                              style={{ width: colWidth(width) }}
                            >
                              <span className={`lbl ${styles.roleLabel}`} title={role}>
                                {ROLE_SHORT[role] ?? role}
                              </span>
                              {ROLE_ICON[role] ? (
                                <span className={styles.roleGlyph}>
                                  <Icon name={ROLE_ICON[role]} size={14} strokeWidth={1.6} />
                                </span>
                              ) : icon && DIMS[icon] && (
                                // Native size, and never forced square: these
                                // icons come in eight shapes and a square box
                                // stretched most of them.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`/strategic/${icon}.png`}
                                  alt=""
                                  width={DIMS[icon][0]}
                                  height={DIMS[icon][1]}
                                  className={styles.roleIcon}
                                />
                              )}
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
                                        size={CHIP_VAR}
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
          </section>
        );
      })}
    </div>
  );
}
