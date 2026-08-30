'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { ROLE_SHORT } from '@/lib/faf/roles';
import { orderedRoles } from '@/lib/faf/columns';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { solveBands, type ColumnMetric } from '@/lib/faf/fit';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './OnePage.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
/**
 * The four columns, and the tiers each one shows.
 *
 * Structures are not here on purpose. They are 274 units across five sections
 * and there is no honest way to fit them beside the army on one screen; the
 * compact view is where they live. What this answers is the question you
 * actually ask mid-game — what does each faction field, at every tier, in the
 * three domains and at T4 — and that fits.
 */
const COLUMNS: Array<{ section: string; tiers: Tech[] }> = [
  { section: 'Land', tiers: ['T1', 'T2', 'T3'] },
  { section: 'Air', tiers: ['T1', 'T2', 'T3'] },
  { section: 'Naval', tiers: ['T1', 'T2', 'T3'] },
  { section: 'Experimental', tiers: ['EXP'] },
];

const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];

/* The size below which a unit render is no longer recognisable, and the size
   above which the view stops reading as a roster. Both match the clamp in
   OnePage.module.css. */
const MIN_CHIP = 14;
const MAX_CHIP = 52;

/** The army is what fits on the screen; everything else waits below it. */
const ARMY = new Set(COLUMNS.map((c) => c.section));

function modalIcon(units: BrowseUnit[]): string | null {
  const counts = new Map<string, number>();
  for (const u of units) if (u.icon) counts.set(u.icon, (counts.get(u.icon) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [icon, n] of counts) if (n > bestN) { best = icon; bestN = n; }
  return best;
}

/**
 * The whole army on one screen, without scrolling.
 *
 * Everything here is subordinate to that one rule, and things do give way for
 * it: the role labels shrink to their icons with the name on hover, the tier
 * strips lose their padding, and the chips end up smaller than the compact
 * view would choose. That is the trade. What you get back is the comparison
 * this site exists for, made without moving: every faction's answer to every
 * slot, in all three domains and at T4, in one look.
 *
 * The chip size is not chosen here. It is `min()` of a width fit and a height
 * fit in CSS, so whichever runs out first decides, and the layout survives a
 * short wide window and a tall narrow one without either scrolling.
 */
export function OnePage({
  units,
  selected,
  onToggle,
  sort,
  pickMode = false,
  mode = 'roster',
}: {
  units: BrowseUnit[];
  selected: string[];
  onToggle: (id: string) => void;
  sort: SortDef;
  pickMode?: boolean;
  /**
   * 'roster' fits the army to the screen and puts the structures below it,
   * which is the default and works at any width.
   *
   * 'screen' puts all nine sections in one row and fits the lot, structures
   * included. It is only offered above 2000px because the role columns are
   * sparse — a column exists even where one faction fills it — so the nine
   * sections together need 55 chip-widths, and below that the chips come out
   * at eight pixels.
   */
  mode?: 'roster' | 'screen';
}) {
  const bySection = new Map<string, BrowseUnit[]>();
  for (const u of units) {
    const list = bySection.get(u.section);
    if (list) list.push(u);
    else bySection.set(u.section, [u]);
  }

  const wanted =
    mode === 'screen'
      ? SECTION_ORDER.filter((sec) => bySection.has(sec)).map((section) => ({
          section,
          tiers: TECH_ORDER.filter((t) => bySection.get(section)!.some((u) => u.tech === t)),
        }))
      : COLUMNS;
  const columns = wanted
    .map((c) => ({ ...c, units: bySection.get(c.section) ?? [] }))
    .filter((c) => c.units.length > 0);

  // Chip size divides by the number of unit rows in the tallest column, so the
  // CSS needs to know it rather than assume 12: filtering to one faction, or to
  // one tier, leaves far fewer and the chips should grow to use the space.
  const rowsIn = (c: (typeof columns)[number]) =>
    c.tiers.reduce((n, t) => {
      const tier = c.units.filter((u) => u.tech === t);
      return n + (tier.length ? FACTIONS.filter((f) => tier.some((u) => u.faction === f)).length : 0);
    }, 0);
  const headsIn = (c: (typeof columns)[number]) =>
    c.tiers.filter((t) => c.units.some((u) => u.tech === t)).length;

  const rows = Math.max(1, ...columns.map(rowsIn));
  const heads = Math.max(1, ...columns.map(headsIn));

  /**
   * How wide each column has to be, in chips, and how much of its width is
   * not chips.
   *
   * The furniture is counted rather than assumed. A first version subtracted a
   * flat 52px per column and came out 104px too wide, because it forgot that
   * every role column carries its own 4px of padding and every pair of chips
   * a 2px gap: on Land's ten-column tier that is most of a chip's worth of
   * error, and it pushed the fourth column off the screen.
   */
  const widestTier = (c: (typeof columns)[number]) => {
    let chips = 1;
    let cols = 1;
    for (const t of c.tiers) {
      const tier = c.units.filter((u) => u.tech === t);
      if (!tier.length) continue;
      const factions = FACTIONS.filter((f) => tier.some((u) => u.faction === f));
      const roles = [...new Set(tier.map((u) => u.roleKey))];
      const w = roles.reduce(
        (m, r) => m + Math.max(...factions.map((f) => tier.filter((u) => u.faction === f && u.roleKey === r).length)),
        0
      );
      if (w > chips) { chips = w; cols = roles.length; }
    }
    return { chips, cols };
  };

  const widths = columns.map(widestTier);
  const totalWide = widths.reduce((n, w) => n + w.chips, 0);
  // Per column: tier tab 17, faction mark 11, its gap 5, row padding 10,
  // borders 2, then 4px for each role column and 2px for each chip gap.
  // Plus a small margin. The model is close but not exact — a role column's
  // padding is trimmed on the first and last of each row, so the real total
  // lands a few pixels above the arithmetic — and the two failure modes are
  // not symmetric: a chip half a pixel smaller than it could be is invisible,
  // a column clipped off the right edge is the whole feature broken.
  const furniture =
    widths.reduce((n, w) => n + 45 + 4 * w.cols + 2 * (w.chips - w.cols), 0) +
    8 * (columns.length - 1) +
    18;

  /**
   * Screen mode packs the sections into bands, and picks how many.
   *
   * All nine sections in one row is the obvious reading, and on a very wide
   * screen it wins: 55 chip-widths across a 3440 is a 45px chip. But the same
   * row on a 2560 is width-starved while half the height goes unused, and two
   * bands of five and four turn that spare height into chip. Which way round it
   * falls depends on the screen's shape, not on anything that can be decided
   * here, so both are costed and the larger chip wins.
   *
   * The candidates are contiguous splits, so reading order survives: a band is
   * always a run of adjacent sections, never a regrouping.
   */
  const metrics: ColumnMetric[] = columns.map((c, i) => ({
    chips: widths[i].chips,
    cols: widths[i].cols,
    rows: rowsIn(c),
    heads: headsIn(c),
  }));

  /**
   * Screen mode measures its own box and solves for the arrangement, because
   * the band count is part of the answer and CSS cannot choose it. The other
   * mode leaves --chip to the calc in the stylesheet.
   */
  const boxRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ chip: number; cuts: number[] } | null>(null);

  const solve = useCallback(() => {
    const el = boxRef.current;
    if (!el || mode !== 'screen') return;
    const best = solveBands(metrics, el.clientWidth, el.clientHeight);
    if (best.chip <= 0) return;
    setFit({ chip: Math.min(MAX_CHIP, Math.max(MIN_CHIP, Math.floor(best.chip * 2) / 2)), cuts: best.cuts });
    // metrics is rebuilt on every render, so it cannot be a dependency without
    // re-running forever. What actually moves it is the filters, and those
    // arrive as a new units array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, units]);

  useLayoutEffect(() => {
    if (mode !== 'screen') return;
    solve();
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(solve);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, solve]);

  const bounds = mode === 'screen' ? [0, ...(fit?.cuts ?? []), columns.length] : [0, columns.length];
  /**
   * Empty bands are dropped rather than drawn.
   *
   * A band is `height: 100%` so that the army always fills the first screen,
   * which is right until there is no army: filter the roster to structures, or
   * search for one, and it drew a full screen of nothing above the results.
   * Reported by a player.
   */
  const bands = bounds
    .slice(0, -1)
    .map((from, i) => columns.slice(from, bounds[i + 1]))
    .filter((b) => b.length > 0);

  // Shared across both blocks so the eager-loading budget is spent on what is
  // actually above the fold, not restarted for the structures below it.
  const counter = { n: 0 };

  /**
   * Everything that is not the army, laid out the same way but below the fold.
   *
   * The one-screen promise is about the army: that is what you compare mid-game
   * and what has to be there without moving. Structures are 274 units and were
   * simply absent, which made the view feel like it was hiding things. They are
   * a scroll away now, in the same columns, so the page keeps its promise
   * without pretending the rest of the game does not exist.
   */
  const restColumns = (mode === 'screen' ? [] : SECTION_ORDER.filter((sec) => !ARMY.has(sec) && bySection.has(sec))).map(
    (section) => ({
      section,
      tiers: TECH_ORDER.filter((t) => bySection.get(section)!.some((u) => u.tech === t)),
      units: bySection.get(section)!,
    })
  );

  return (
    <div
      ref={boxRef}
      className={styles.scroll}
      data-mode={mode}
      // Screen mode solves its own size, so it hands CSS a number rather than
      // the calc; until the first measurement lands there is nothing to draw.
      data-ready={mode !== 'screen' || fit !== null}
      style={
        {
          '--rows': rows,
          '--heads': heads,
          '--cols': columns.length,
          '--wide': totalWide,
          '--furniture': `${furniture}px`,
          ...(fit ? { '--chip': `${fit.chip}px` } : null),
        } as React.CSSProperties
      }
    >
    {bands.map((cols) => (
      <div className={styles.sheet} key={cols[0]?.section ?? 'empty'}>
        {cols.map((col) => (
          <Column
            key={col.section}
            col={col}
            selected={selected}
            onToggle={onToggle}
            sort={sort}
            pickMode={pickMode}
            counter={counter}
            short={mode === 'screen'}
          />
        ))}
      </div>
    ))}

    {restColumns.length > 0 && (
      <div className={styles.rest}>
        <div className={styles.restHead}>
          <span className={`lbl ${styles.restLabel}`}>Structures</span>
          <span className="rule" />
          <span className={`m ${styles.restNote}`}>
            {restColumns.reduce((n, c) => n + c.units.length, 0)} more
          </span>
        </div>
        <div className={styles.restCols}>
          {restColumns.map((col) => (
            <Column
              key={col.section}
              col={col}
              selected={selected}
              onToggle={onToggle}
              sort={sort}
              pickMode={pickMode}
              counter={counter}
            />
          ))}
        </div>
      </div>
    )}
    </div>
  );
}

/**
 * One section as a column of tiers. Shared by the army above the fold and the
 * structures below it, so both read the same way and a change to either is a
 * change to both.
 */
function Column({
  col, selected, onToggle, sort, pickMode, counter, short = false,
}: {
  col: { section: string; tiers: Tech[]; units: BrowseUnit[] };
  selected: string[];
  onToggle: (id: string) => void;
  sort: SortDef;
  pickMode: boolean;
  counter: { n: number };
  /**
   * Drop the "Structures - " prefix from the title.
   *
   * Not only to save room. On one screen all nine sections stand side by side,
   * so which five are structures is plain from looking at them and the prefix
   * is five repetitions of a word. It also has to stay on one line: wrapped, it
   * made the structure columns 14px taller than the fitter had budgeted, and
   * the bottom row of every one of them was clipped.
   */
  short?: boolean;
}) {
  const title = short ? col.section.replace(/^Structures\s*-\s*/, '') : col.section;
  return (
    <section className={styles.col}>
      <header className={styles.colHead}>
        <h2 className={`t ${styles.colTitle}`}>{title}</h2>
        <span className={`m ${styles.colCount}`}>{col.units.length}</span>
      </header>

      {col.tiers.map((tech) => {
        const tierUnits = col.units.filter((u) => u.tech === tech);
        if (!tierUnits.length) return null;
        const factions = FACTIONS.filter((f) => tierUnits.some((u) => u.faction === f));
        const roles = orderedRoles(
          col.section,
          [...new Set(tierUnits.map((u) => u.roleKey))],
          (r) => new Set(tierUnits.filter((u) => u.roleKey === r).map((u) => u.faction)).size
        ).map((role) => {
          const mine = tierUnits.filter((u) => u.roleKey === role);
          return {
            role,
            width: Math.max(...factions.map((f) => mine.filter((u) => u.faction === f).length)),
            icon: modalIcon(mine),
          };
        });

        const colWidth = (w: number) =>
          `calc(var(--chip) * ${w} + var(--chip-gap) * ${w - 1})`;

        return (
          <div key={tech} className={styles.tier}>
            <div className={styles.tierTab}>
              <span className={`m ${styles.tierLabel}`}>{TECH_LABEL[tech]}</span>
            </div>

            <div className={styles.tierBody}>
              {/* Names, not icons. The icon this strip used to carry is on
                  every chip now, which says it per unit instead of per column;
                  what a column still needs is what it is called, and a title
                  attribute only tells you if you go looking. Diagonal because
                  horizontal would force each column to be at least as wide as
                  its word: "TORPEDO BOMBER" over one chip. */}
              <div className={styles.roleHead}>
                <span className={styles.facMark} aria-hidden="true" />
                <div className={styles.roleCols}>
                  {roles.map(({ role, width }) => (
                    <div key={role} className={styles.roleCol} style={{ width: colWidth(width) }}>
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
                    <FactionMark faction={faction} size={11} />
                  </span>
                  <div className={styles.roleCols}>
                    {roles.map(({ role, width }) => {
                      const mine = tierUnits
                        .filter((u) => u.faction === faction && u.roleKey === role)
                        .sort((a, b) => a.name.localeCompare(b.name));
                      return (
                        <div key={role} className={styles.roleCol} style={{ width: colWidth(width) }} title={role}>
                          {Array.from({ length: width }, (_, i) => {
                            const u = mine[i];
                            if (!u) return <span key={i} className={styles.slot} aria-hidden="true" />;
                            return (
                              <UnitChip
                                key={u.id}
                                unit={u}
                                size="var(--chip)"
                                selected={selected.includes(u.id)}
                                onToggle={onToggle}
                                sort={sort}
                                eager={counter.n++ < 120}
                                pickMode={pickMode}
                                cornerIcon
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
    </section>
  );
}
