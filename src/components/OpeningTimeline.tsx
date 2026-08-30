'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnitWell } from './UnitWell';
import { clock } from '@/lib/faf/opening';
import type { OpeningRun } from '@/lib/faf/opening';
import { RECLAIM_LEVELS, type Opening, type MapSize } from '@/data/openings';
import styles from './OpeningTimeline.module.css';

const MAP_SIZES: MapSize[] = ['5x5', '10x10', '20x20'];

/** One run of one opening at one reclaim level, precomputed on the server. */
export type Runs = Record<string, Record<string, OpeningRun & { slugs: Record<string, string> }>>;

export function OpeningTimeline({ openings, runs }: { openings: Opening[]; runs: Runs }) {
  const [map, setMap] = useState('Generic');
  const [second, setSecond] = useState<'land' | 'air'>('land');
  const [hydro, setHydro] = useState(false);
  const [reclaim, setReclaim] = useState<string>('none');
  const [mapSize, setMapSize] = useState<MapSize>('10x10');

  const maps = ['Generic', ...new Set(openings.filter((o) => o.map !== 'Generic').map((o) => o.map))];
  const generic = map === 'Generic';

  /**
   * A map build answers the land-or-air and hydro questions itself, so those
   * two pickers only appear for the generic openings. Offering them alongside a
   * build written for one slot of one map would imply a choice that is not
   * there.
   *
   * Within the generic set, land plus hydro has no transcribed order behind it,
   * so choosing land settles the hydro question rather than pretending it is
   * open.
   */
  const pool = openings.filter((o) => o.map === map);
  const hydroAvailable = pool.some((o) => o.secondFactory === second && o.hydro);
  const wantHydro = hydro && hydroAvailable;
  const opening = generic
    ? pool.find((o) => o.secondFactory === second && o.hydro === wantHydro) ?? pool[0]
    : pool[0];
  const run = runs[opening.id]?.[reclaim];
  if (!run) return null;

  const level = RECLAIM_LEVELS.find((l) => l.key === reclaim)!;
  const untimed = opening.lanes.filter((l) => !l.timed && l.advice?.length);
  const stalled = run.stalledMass + run.stalledEnergy;

  return (
    <div className={styles.wrap}>
      <div className={styles.picker}>
        <Choice label="Map">
          {maps.map((m) => (
            <button key={m} type="button" className={styles.opt} data-on={map === m} onClick={() => setMap(m)}>
              {m}
            </button>
          ))}
        </Choice>

        {generic && (
        <Choice label="Second factory">
          {(['land', 'air'] as const).map((v) => (
            <button key={v} type="button" className={styles.opt} data-on={second === v} onClick={() => setSecond(v)}>
              {v === 'land' ? 'Land' : 'Air'}
            </button>
          ))}
        </Choice>

        )}

        {generic && (
        <Choice label="Hydrocarbon nearby">
          {([false, true] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              className={styles.opt}
              data-on={wantHydro === v}
              disabled={v && !hydroAvailable}
              title={v && !hydroAvailable ? 'No transcribed hydro order for a second land factory' : undefined}
              onClick={() => setHydro(v)}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </Choice>
        )}

        <Choice label="Reclaim near your base">
          {RECLAIM_LEVELS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={styles.opt}
              data-on={reclaim === l.key}
              onClick={() => setReclaim(l.key)}
            >
              {l.label}
              {l.perSecond > 0 && <span className={styles.optSub}>+{l.perSecond}</span>}
            </button>
          ))}
        </Choice>

        {generic && (
        <Choice label="Map size">
          {MAP_SIZES.map((v) => (
            <button key={v} type="button" className={styles.opt} data-on={mapSize === v} onClick={() => setMapSize(v)}>
              {v}
            </button>
          ))}
        </Choice>
        )}
      </div>

      <div className={styles.head}>
        <div className={styles.headMain}>
          <h3 className={`t ${styles.title}`}>{opening.title}</h3>
          <p className={styles.summary}>{opening.summary}</p>
        </div>
        <dl className={styles.totals}>
          <Total label="ACU busy until" value={clock(run.duration)} />
          <Total
            label="Income at the end"
            value={String(Math.round(run.finalMass))}
            unit="m/s"
            second={`${Math.round(run.finalEnergy)} e/s`}
          />
          <Total
            label="Stalled"
            value={stalled < 0.5 ? 'Never' : `${Math.round(stalled)}s`}
            tone={stalled >= 0.5 ? 'warn' : undefined}
          />
        </dl>
      </div>

      <div className={styles.table}>
        <div className={styles.headRow}>
          <span />
          <span>Build</span>
          <span className={styles.byCol}>By</span>
          <span className={styles.num}>Takes</span>
          <span className={styles.num}>Drain /s</span>
          <span className={styles.num}>Income /s</span>
          <span className={styles.num}>In the bank</span>
        </div>

        {run.items.map((item, i) => (
          <div key={`${item.lane}-${i}`} className={styles.row} data-action={!item.id}>
            <span className={`m ${styles.time}`}>{clock(item.start)}</span>

            <span className={styles.what}>
              {item.id ? (
                <Link href={`/unit/${run.slugs[item.id] ?? ''}`} className={styles.link}>
                  <UnitWell
                    id={item.id}
                    faction="UEF"
                    techLabel={item.techLabel}
                    size={34}
                    imageSize={32}
                    pip={false}
                  />
                  <span className={`t ${styles.name}`}>{item.name}</span>
                  {item.count > 1 && <span className={`m ${styles.count}`}>&times;{item.count}</span>}
                </Link>
              ) : (
                <span className={styles.action}>{item.name}</span>
              )}
            </span>

            <span className={styles.byCol}>{item.laneLabel}</span>
            <span className={`m ${styles.num} ${styles.takes}`}>
              {item.end > item.start ? `${Math.round(item.end - item.start)}s` : '–'}
            </span>
            <span className={`m ${styles.num}`}>
              {item.id ? <Pair mass={Math.round(item.drainMass)} energy={Math.round(item.drainEnergy)} /> : '–'}
            </span>
            <span className={`m ${styles.num}`}>
              <Pair mass={Math.round(item.incomeMass)} energy={Math.round(item.incomeEnergy)} />
            </span>
            <span className={`m ${styles.num}`}>
              <Pair mass={item.storedMass} energy={item.storedEnergy} />
            </span>

            {(item.note || item.stalledEnergy >= 0.5 || item.stalledMass >= 0.5) && (
              <span className={styles.foot}>
                {item.stalledEnergy >= 0.5 && (
                  <span className={styles.stall}>stalled on energy {Math.round(item.stalledEnergy)}s</span>
                )}
                {item.stalledMass >= 0.5 && (
                  <span className={styles.stall}>stalled on mass {Math.round(item.stalledMass)}s</span>
                )}
                {item.note}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.after}>
        {generic && (
          <div className={styles.card}>
            <span className={`lbl ${styles.cardLabel}`}>What the first factory makes on a {mapSize}</span>
            <p className={styles.cardBody}>{opening.factoryQueue[mapSize]}</p>
          </div>
        )}

        {untimed.map((l) => (
          <div key={l.key} className={styles.card}>
            <span className={`lbl ${styles.cardLabel}`}>{l.label}</span>
            <ul className={styles.adviceList}>
              {l.advice!.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className={styles.provenance}>
        Sequence from{' '}
        <a href={opening.source.url} target="_blank" rel="noopener noreferrer">
          {opening.source.label}
        </a>
        {opening.alsoSee && (
          <>
            , also taught in prose on the{' '}
            <a href={opening.alsoSee.url} target="_blank" rel="noopener noreferrer">
              {opening.alsoSee.label}
            </a>
          </>
        )}
        . Every time, cost and reserve here is computed from the current patch&rsquo;s blueprints
        rather than copied from the guide: build points divided by build power, with the economy
        stepped forward tick by tick so a stall shows up where it would happen. Costs are identical
        in all four factions, so there is no faction to choose. Three things it assumes. You start
        with the ACU&rsquo;s storage full, {run.startMass} mass and {run.startEnergy} energy, read
        off its blueprint.{' '}
        {level.perSecond > 0
          ? `Reclaim is worth ${level.perSecond} mass a second from the moment your first engineer exists, which is a figure you set rather than one measured: what a map's rocks are worth is a property of the map and is not in the blueprints.`
          : 'Reclaim is off, so every time here is pessimistic on a map with rocks near your spawn. The reclaim buttons show what it buys.'}
        {' '}And nothing is lost, so no engineer here ever walks into a raid.
        {opening.caveat && ` ${opening.caveat}`}
      </p>
    </div>
  );
}

function Pair({ mass, energy }: { mass: number; energy: number }) {
  return (
    <>
      <span className={styles.mass}>{mass}</span>
      <span className={styles.slash}>/</span>
      <span className={styles.energy}>{energy}</span>
    </>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.choice}>
      <span className={`lbl ${styles.choiceLabel}`}>{label}</span>
      <div className={styles.opts}>{children}</div>
    </div>
  );
}

function Total({
  label,
  value,
  unit,
  second,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  second?: string;
  tone?: 'warn';
}) {
  return (
    <div className={styles.total} data-tone={tone}>
      <dt className={`lbl ${styles.totalLabel}`}>{label}</dt>
      <dd className={`m ${styles.totalValue}`}>
        {value}
        {unit && <span className={styles.totalUnit}>{unit}</span>}
        {second && <span className={styles.totalSub}>{second}</span>}
      </dd>
    </div>
  );
}
