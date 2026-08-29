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
const TIER_HEAD = 13;
/** The rule between a tier's mobile units and its buildings. */
const SPLIT = 7;
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

  const fits = useCallback(
    (size: number, w: number, h: number) => {
      const perRow = Math.max(1, Math.floor((w + GAP) / (size + GAP)));
      for (const col of columns) {
        let used = 0;
        for (const t of col.tiers) {
          // Each group wraps on its own, so a partial last row in the mobile
          // units does not get filled by the buildings: the rows have to be
          // counted per group or the solver picks a size that overflows.
          used += TIER_HEAD;
          if (t.mobile.length) used += Math.ceil(t.mobile.length / perRow) * (size + GAP);
          if (t.built.length) used += Math.ceil(t.built.length / perRow) * (size + GAP);
          if (t.mobile.length && t.built.length) used += SPLIT;
        }
        if (used > h) return false;
      }
      return true;
    },
    [columns]
  );

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const h = el.clientHeight - 18;
    const w = (el.clientWidth - (columns.length - 1) * 6) / columns.length - 12;
    if (h <= 0 || w <= 0) return;
    let lo = MIN_CHIP;
    let hi = MAX_CHIP;
    if (!fits(lo, w, h)) { setChip(MIN_CHIP); return; }
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (fits(mid, w, h)) lo = mid;
      else hi = mid;
    }
    setChip(Math.floor(lo * 2) / 2);
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
              {t.mobile.length > 0 && (
                <div className={styles.flow} title="Units">
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
                </div>
              )}
              {t.mobile.length > 0 && t.built.length > 0 && (
                <span className={styles.split} aria-hidden="true" />
              )}
              {t.built.length > 0 && (
                <div className={styles.flow} title="Buildings">
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
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
