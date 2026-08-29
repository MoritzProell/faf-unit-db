'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { UnitWell } from './UnitWell';
import { Icon } from './Icon';
import { fmt, type BrowseUnit, type SortDef } from '@/lib/faf/browse';
import styles from './UnitChip.module.css';

/**
 * A bare unit well with a hover card. This is the reference app's icon-wall
 * affordance, kept because veterans navigate by silhouette, but with the name
 * and the sorted figure one hover away instead of nowhere.
 *
 * Clicking opens the unit. Comparison is a button inside the hover card, so the
 * icon wall stays uncluttered and a click never does something you did not ask
 * for.
 */
export function UnitChip({
  unit,
  size = 44,
  selected,
  onToggle,
  sort,
  eager = false,
  pickMode = false,
  cornerIcon = false,
}: {
  unit: BrowseUnit;
  size?: number | string;
  selected: boolean;
  onToggle: (id: string) => void;
  sort: SortDef;
  /** Above-the-fold chips must not lazy-load; the roster is 400+ images. */
  eager?: boolean;
  /**
   * While picking for a comparison the chip adds the unit instead of opening
   * it. Without this the roster views ignored pick mode entirely and every
   * click navigated away, which is not what a button called "Compare" that
   * says "Done picking" promises.
   */
  pickMode?: boolean;
  /**
   * Overlay the unit's strategic icon in the corner. Only the one-page view
   * asks for it: at 29px the render is a silhouette and the icon is what a
   * player actually reads on the battlefield, so having both is worth the
   * clutter there. It is sized off the chip, so it shrinks with it.
   */
  cornerIcon?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState({ x: false, up: false, down: false });
  /**
   * The card is not rendered until the chip is first pointed at.
   *
   * The roster puts 400+ chips on one page and every card is eleven elements,
   * so mounting them all up front cost roughly 4500 nodes that nobody had
   * asked to see — enough to make the first hover on each chip feel late while
   * the browser did style and layout work for cards still hidden. Once armed
   * it stays mounted, so moving back and forth over the same chip is instant.
   */
  const [armed, setArmed] = useState(false);

  // Measured on hover rather than guessed: which chips sit near an edge depends
  // on layout and scroll position, neither known at render time.
  const measure = useCallback(() => {
    setArmed(true);
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const CARD_W = 252;
    const CARD_H = 200;
    const centre = r.top + r.height / 2;
    setFlip({
      x: r.right + CARD_W + 12 > window.innerWidth,
      up: centre + CARD_H / 2 > window.innerHeight - 12,
      down: centre - CARD_H / 2 < 12,
    });
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      data-selected={selected}
      data-pick={pickMode}
      data-flip={flip.x}
      data-flip-up={flip.up}
      data-flip-down={flip.down}
      onMouseEnter={measure}
      onFocus={measure}
    >
      {pickMode ? (
        <button
          type="button"
          className={styles.btn}
          onClick={() => onToggle(unit.id)}
          aria-pressed={selected}
          aria-label={`${selected ? 'Remove' : 'Add'} ${unit.name} ${selected ? 'from' : 'to'} comparison`}
        >
          <UnitWell
            id={unit.id}
            faction={unit.faction}
            techLabel={unit.techLabel}
            size={size}
            imageSize={typeof size === 'number' ? Math.round(size * 0.93) : undefined}
            hasRender={unit.hasRender}
            priority={eager}
          />
          <span className={styles.pickMark} aria-hidden="true">
            <Icon name={selected ? 'check' : 'plus'} size={11} strokeWidth={selected ? 2.6 : 2} />
          </span>
        </button>
      ) : (
        <Link href={`/unit/${unit.slug}`} className={styles.btn} aria-label={`${unit.name}, ${unit.role}`}>
          <UnitWell
            id={unit.id}
            faction={unit.faction}
            techLabel={unit.techLabel}
            size={size}
            imageSize={typeof size === 'number' ? Math.round(size * 0.93) : undefined}
            hasRender={unit.hasRender}
            priority={eager}
          />
          {cornerIcon && unit.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/strategic/${unit.icon}.png`} alt="" className={styles.corner} />
          )}
        </Link>
      )}

      {armed && (
      <div className={styles.card}>
        <div className={styles.panel}>
          <div className={styles.top}>
            <span className={`t ${styles.name}`}>{unit.name}</span>
            <span className={`m ${styles.id}`}>{unit.id}</span>
          </div>
          <div className={styles.role}>{unit.name === unit.role ? unit.type : unit.role}</div>
          <div className={styles.rule} />
          <div className={styles.stats}>
            {/* A shield generator has no damage and its own hit points are
                beside the point: 220 mass buys a Parashield's 3000 shield, and
                that is the number you are comparing. Mobile shields and shield
                structures both. */}
            {unit.roleKey === 'Shield' ? (
              <>
                <Stat label="Mass" value={fmt(unit.mass)} />
                <Stat label="Shield" value={fmt(unit.shieldHp)} tone="shield" />
                <Stat
                  label="Per mass"
                  value={unit.shieldHp && unit.mass ? (unit.shieldHp / unit.mass).toFixed(2) : '–'}
                />
                <Stat label="Radius" value={fmt(unit.shieldRadius)} />
              </>
            ) : (
              <>
                <Stat label="Mass" value={fmt(unit.mass)} />
                <Stat label="Health" value={fmt(unit.health)} />
                {/* Damage is worth more here than whatever the list happens to be
                    sorted by, so it is fixed. The sort stat still shows when it is
                    something else. */}
                <Stat
                  label="DPS"
                  value={unit.totalDps === null ? '–' : unit.totalDps.toFixed(1)}
                  tone="damage"
                />
                {sort.key !== 'directDps' && sort.key !== 'dpsPerMass' && (
                  <Stat label={sort.tileLabel} value={sort.format(unit)} />
                )}
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.compare}
            data-on={selected}
            onClick={() => onToggle(unit.id)}
            aria-pressed={selected}
          >
            <Icon name={selected ? 'check' : 'plus'} size={12} strokeWidth={selected ? 2.6 : 2} />
            {selected ? 'In comparison' : 'Add to comparison'}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Damage is red and shields are blue, matching the unit pages. Neither is
 * green: green is health, and a damage figure in the health colour reads as
 * another health figure.
 */
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'damage' | 'shield' }) {
  return (
    <div className={styles.stat}>
      <span className="lbl" style={{ fontSize: 8 }}>{label}</span>
      <span
        className={`m ${styles.figure}`}
        style={tone ? { color: `var(--${tone === 'damage' ? 'dmg' : 'shield'})` } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
