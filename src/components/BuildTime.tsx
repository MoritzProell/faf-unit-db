'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnitWell } from './UnitWell';
import { fmtSeconds } from '@/lib/faf/buildpower';
import type { Builder } from '@/lib/faf/buildpower';
import type { Faction } from '@/lib/faf/types';
import styles from './BuildTime.module.css';

/** Enough assist to cover a pair of engineers up to a serious engineer ball. */
const PRESETS = [0, 5, 10, 25, 50, 100];

/**
 * How long this unit takes to build, and what it drains while it does.
 *
 * The game's own unit view gives one number and does not say whose it is: it
 * divides the build cost by the build power of whatever happens to be selected,
 * and assumes nothing is helping. Both of those are choices, so both are made
 * visible here — every builder that can make the unit gets a row, and the
 * assist control adds build power to all of them at once.
 *
 * Unassisted is the initial state on purpose. It is the honest default, it is
 * what the game shows, and it is what gets rendered on the server for anyone
 * arriving from a search result.
 */
export function BuildTime({
  builders,
  points,
  mass,
  energy,
  faction,
}: {
  builders: Builder[];
  /** The unit's cost in build points, which is what build power divides. */
  points: number;
  mass: number;
  energy: number;
  faction: Faction;
}) {
  const [assist, setAssist] = useState(0);

  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        <span className={`lbl ${styles.controlLabel}`}>Assisting build power</span>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={styles.preset}
              data-on={assist === p}
              onClick={() => setAssist(p)}
            >
              {p === 0 ? 'None' : `+${p}`}
            </button>
          ))}
        </div>
        <label className={styles.custom}>
          <input
            type="number"
            min={0}
            max={9999}
            step={5}
            value={assist}
            onChange={(e) => setAssist(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
            aria-label="Assisting build power"
          />
          <span className={styles.customUnit}>bp</span>
        </label>
      </div>

      <div className={styles.rows} role="table">
        <div className={styles.head} role="row">
          <span role="columnheader">Built by</span>
          <span role="columnheader" className={styles.num}>Build power</span>
          <span role="columnheader" className={styles.num}>Time</span>
          <span role="columnheader" className={styles.num}>Drain m/e</span>
        </div>

        {builders.map((b) => {
          const total = b.power + assist;
          const seconds = total > 0 ? points / total : 0;
          return (
            <div key={b.id} className={styles.row} role="row">
              <Link href={`/unit/${b.slug}`} className={styles.who}>
                <UnitWell
                  id={b.id}
                  faction={faction}
                  techLabel={b.techLabel}
                  size={26}
                  imageSize={24}
                  pip={false}
                  hasRender={b.hasRender}
                />
                <span className={styles.whoText}>
                  <span className={`t ${styles.whoName}`}>{b.name}</span>
                  <span className={styles.whoKind}>
                    {/* "Other" is the Fatboy, the CZAR, the carriers and the
                        Megalith: factories in everything but the category. */}
                    {b.techLabel} {b.upgrade ? 'upgrade' : b.kind === 'Other' ? 'builder' : b.kind}
                  </span>
                </span>
              </Link>
              <span className={`m ${styles.num}`}>
                {b.power}
                {assist > 0 && <span className={styles.plus}> +{assist}</span>}
              </span>
              <span className={`m ${styles.num} ${styles.time}`}>{fmtSeconds(seconds)}</span>
              <span className={`m ${styles.num} ${styles.drain}`}>
                {seconds > 0 ? (
                  <>
                    <span className={styles.mass}>{Math.round(mass / seconds)}</span>
                    <span className={styles.sep}>/</span>
                    <span className={styles.energy}>{Math.round(energy / seconds)}</span>
                  </>
                ) : (
                  '–'
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className={styles.note}>
        Time is {points.toLocaleString()} build points divided by build power. Drain is mass and
        energy per second while it is building, so more build power finishes sooner and costs the
        same total, but pulls harder on the economy.
      </p>
    </div>
  );
}
