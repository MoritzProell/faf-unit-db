'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { FactionMark } from './FactionMark';
import { UnitChip } from './UnitChip';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { ROLE_ORDER } from '@/lib/faf/roles';
import type { BrowseUnit, SortDef } from '@/lib/faf/browse';
import type { Faction, Tech } from '@/lib/faf/types';
import styles from './OneScreen.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
const TECH_LABEL: Record<string, string> = { T1: 'T1', T2: 'T2', T3: 'T3', EXP: 'T4' };

const GAP = 2;
/* The tier marker sits above its rows, not in them.
   Inlining it was tried, on the reasoning that its own row costs 13px per tier
   and 52px a column. It lost: 15px taken out of each tier's first row pushed a
   chip onto an extra row, and the extra rows cost more height than the labels
   did. 29.5px with the label above, 28px with it inline. */
const TIER_HEAD = 13;
/** The divider between a tier's mobile units and its buildings, inline. */
const SPLIT_W = 9;
const MAX_PER_ROW = 26;
const MIN_CHIP = 9;
const MAX_CHIP = 52;

/**
 * Everything, on one screen, with nothing below the fold.
 *
 * The other two views keep the role columns, which is what makes them
 * readable and also what makes them wide: a column exists even when one
 * faction has nothing in it, and the labels above them cost height. This one
 * gives all of that up. A faction is a column, its units flow down it in
 * reading order grouped by tier, and there are no role labels at all. What is
 * left is the shape of a faction's whole roster against the others', which is
 * a different question from "what is the Cybran T2 gunship" and the only one
 * that fits in a single screen at 497 units.
 *
 * Order inside a tier is still section then role, so the eye can find things
 * even without headings: land, then air, then naval, then structures, and
 * within each the same role order the labelled views use.
 */
export function OneScreen({
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
  pickMode?: boolean;
}) {
  const sectionRank = (s: string) => {
    const i = SECTION_ORDER.indexOf(s);
    return i < 0 ? SECTION_ORDER.length : i;
  };
  const roleRank = (r: string) => {
    const i = ROLE_ORDER.indexOf(r);
    return i < 0 ? ROLE_ORDER.length : i;
  };

  const factions = FACTIONS.filter((f) => units.some((u) => u.faction === f));
  const columns = factions.map((faction) => {
    const mine = units.filter((u) => u.faction === faction);
    return {
      faction,
      total: mine.length,
      tiers: TECH_ORDER.map((tech) => {
        // Within a tier, what you build things with and what you build are
        // different questions, so they are drawn as two groups rather than one
        // run of chips. Order inside each is still section then role.
        const order = (a: BrowseUnit, b: BrowseUnit) =>
          sectionRank(a.section) - sectionRank(b.section) ||
          roleRank(a.roleKey) - roleRank(b.roleKey) ||
          a.mass - b.mass ||
          a.name.localeCompare(b.name);
        const inTier = mine.filter((u) => u.tech === tech);
        return {
          tech,
          mobile: inTier.filter((u) => u.kind !== 'Base').sort(order),
          built: inTier.filter((u) => u.kind === 'Base').sort(order),
          count: inTier.length,
        };
      }).filter((t) => t.count > 0),
    };
  });

  /**
   * Chip size, solved rather than declared.
   *
   * This is a packing problem — how many chips fit per row depends on the chip
   * size, and how many rows you need depends on that — and CSS cannot express
   * it: there is no sqrt and no way to ask how a flow wrapped. So the box is
   * measured and the largest size that still fits is found by bisection, which
   * takes about six iterations of pure arithmetic and no layout.
   */
  const boxRef = useRef<HTMLDivElement>(null);
  const [chip, setChip] = useState(0);

  /**
   * Rows a column needs at a given chip size, by walking the flow exactly as
   * the browser will wrap it.
   *
   * Simulated rather than divided, for two reasons. The divider between units
   * and buildings sits in the same flow and takes width, so a row does not
   * hold a whole number of chips. And letting the two groups share a row when
   * they fit is most of the point: UEF's T4 is two units and two buildings,
   * which was burning two rows to show four chips.
   */
  const heightAt = useCallback(
    (size: number, w: number, col: (typeof columns)[number]) => {
      const step = size + GAP;
      let total = 0;
      for (const t of col.tiers) {
        let rows = 1;
        let x = 0;
        const place = (itemW: number) => {
          if (x > 0 && x + itemW > w + 0.5) { rows++; x = 0; }
          x += itemW + GAP;
        };
        for (const _ of t.mobile) place(size);
        if (t.mobile.length && t.built.length) place(SPLIT_W);
        for (const _ of t.built) place(size);
        total += TIER_HEAD + rows * step;
      }
      return total;
    },
    [columns]
  );

  const fits = useCallback(
    (size: number, w: number, h: number) => columns.every((c) => heightAt(size, w, c) <= h),
    [columns, heightAt]
  );

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const h = el.clientHeight - 18;
    /**
     * The row width, read off the DOM rather than derived.
     *
     * Deriving it from the sheet's width minus gaps, padding and borders was
     * about 14px out, which is half a chip: the solver then sized for a row
     * that fits ten and the browser fitted nine, so it wrapped more than the
     * model predicted and settled a size smaller than it needed to. The flow
     * element knows its own width; ask it.
     */
    const flow = el.querySelector<HTMLElement>(`.${styles.flow.split(' ')[0]}`);
    const w = flow?.clientWidth ?? (el.clientWidth - (columns.length - 1) * 6) / columns.length - 12;
    if (h <= 0 || w <= 0) return;

    /**
     * Solved per row count rather than by bisecting on the size.
     *
     * Bisection left a remainder: a column 185px wide fitting six 26px chips
     * used 168 of it and wasted 17, on every row of every column. Choosing the
     * chips-per-row first and then sizing the chip to divide the width exactly
     * spends that remainder on the chips instead, which is where the visible
     * gap down the right of each faction box was going.
     */
    let best = 0;
    for (let perRow = 1; perRow <= MAX_PER_ROW; perRow++) {
      const size = (w + GAP) / perRow - GAP;
      if (size < MIN_CHIP || size > MAX_CHIP) continue;
      if (fits(size, w, h)) best = Math.max(best, size);
    }
    setChip(best > 0 ? Math.floor(best * 2) / 2 : MIN_CHIP);
  }, [columns.length, fits]);

  useLayoutEffect(() => {
    measure();
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={boxRef}
      className={styles.screen}
      style={{ '--chip': `${chip || 18}px`, '--gap': `${GAP}px` } as React.CSSProperties}
      // Until the first measurement lands the chips would render at a guessed
      // size and visibly resettle, so the grid is held back for one frame.
      data-ready={chip > 0}
    >
      {columns.map((col) => (
        <section key={col.faction} className={styles.col} data-faction={col.faction}>
          <header className={styles.head}>
            <FactionMark faction={col.faction} size={12} />
            <span className={`t ${styles.name}`}>{col.faction}</span>
            <span className={`m ${styles.count}`}>{col.total}</span>
          </header>

          {col.tiers.map((t) => (
            <div key={t.tech} className={styles.tier}>
              <span className={`m ${styles.tierLabel}`}>{TECH_LABEL[t.tech]}</span>
              <div className={styles.flow}>
                {t.mobile.map((u, i) => (
                  <UnitChip
                    key={u.id}
                    unit={u}
                    size="var(--chip)"
                    selected={selected.includes(u.id)}
                    onToggle={onToggle}
                    sort={sort}
                    eager={i < 30}
                    pickMode={pickMode}
                  />
                ))}
                {t.mobile.length > 0 && t.built.length > 0 && (
                  <span className={styles.split} title="Buildings below" aria-hidden="true" />
                )}
                {t.built.map((u) => (
                  <UnitChip
                    key={u.id}
                    unit={u}
                    size="var(--chip)"
                    selected={selected.includes(u.id)}
                    onToggle={onToggle}
                    sort={sort}
                    pickMode={pickMode}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
