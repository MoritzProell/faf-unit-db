'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnitWell } from './UnitWell';
import { FactionMark } from './FactionMark';
import { clock } from '@/lib/faf/opening';
import type { OpeningRun } from '@/lib/faf/opening';
import type { Opening, MapSize } from '@/data/openings';
import type { Faction } from '@/lib/faf/types';
import styles from './OpeningTimeline.module.css';

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim'];
const MAP_SIZES: MapSize[] = ['5x5', '10x10', '20x20'];

export interface RunKey {
  opening: string;
  faction: Faction;
}

/** One row's worth of what the picker resolved to, precomputed on the server. */
export type Runs = Record<string, Record<string, OpeningRun & { slugs: Record<string, string> }>>;

/**
 * The first five minutes, picked and then played out.
 *
 * The picker only offers branches that lead somewhere. An opening here is a
 * transcribed sequence with a source behind it, and there are three of those,
 * so the tree is two questions deep rather than the six it could be: offering a
 * Seton's air-slot branch that resolves to nothing would be worse than not
 * offering it, and the curated guides below still cover the maps.
 */
export function OpeningTimeline({
  openings,
  runs,
}: {
  openings: Opening[];
  runs: Runs;
}) {
  const [faction, setFaction] = useState<Faction>('UEF');
  const [second, setSecond] = useState<'land' | 'air'>('land');
  const [hydro, setHydro] = useState(false);
  const [mapSize, setMapSize] = useState<MapSize>('10x10');

  // Land plus hydro has no transcribed order behind it, so choosing land
  // settles the hydro question rather than pretending it is open.
  const hydroAvailable = openings.some((o) => o.secondFactory === second && o.hydro);
  const wantHydro = hydro && hydroAvailable;
  const opening =
    openings.find((o) => o.secondFactory === second && o.hydro === wantHydro) ?? openings[0];
  const run = runs[opening.id]?.[faction];

  if (!run) return null;

  const untimed = opening.lanes.filter((l) => !l.timed && l.advice?.length);

  return (
    <div className={styles.wrap} data-faction={faction}>
      <div className={styles.picker}>
        <Choice label="Faction">
          {FACTIONS.map((f) => (
            <button
              key={f}
              type="button"
              className={styles.opt}
              data-on={faction === f}
              onClick={() => setFaction(f)}
            >
              <FactionMark faction={f} size={11} />
              {f}
            </button>
          ))}
        </Choice>

        <Choice label="Second factory">
          {(['land', 'air'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={styles.opt}
              data-on={second === v}
              onClick={() => setSecond(v)}
            >
              {v === 'land' ? 'Land' : 'Air'}
            </button>
          ))}
        </Choice>

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

        <Choice label="Map size">
          {MAP_SIZES.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.opt}
              data-on={mapSize === v}
              onClick={() => setMapSize(v)}
            >
              {v}
            </button>
          ))}
        </Choice>
      </div>

      <div className={styles.head}>
        <div className={styles.headMain}>
          <h3 className={`t ${styles.title}`}>{opening.title}</h3>
          <p className={styles.summary}>{opening.summary}</p>
        </div>
        <dl className={styles.totals}>
          <Total label="ACU busy until" value={clock(run.duration)} />
          <Total label="Income at the end" value={`${Math.round(run.finalMass)} m/s`} sub={`${Math.round(run.finalEnergy)} e/s`} />
          <Total
            label="Stalled"
            value={run.stalledMass + run.stalledEnergy < 0.5 ? 'Never' : `${Math.round(run.stalledMass + run.stalledEnergy)}s`}
            tone={run.stalledMass + run.stalledEnergy >= 0.5 ? 'warn' : undefined}
          />
        </dl>
      </div>

      <ol className={styles.timeline}>
        {run.items.map((item, i) => (
          <li key={`${item.lane}-${i}`} className={styles.step} data-lane={item.lane} data-action={!item.id}>
            <span className={`m ${styles.time}`}>{clock(item.start)}</span>
            <span className={styles.rail} aria-hidden="true" />
            <div className={styles.body}>
              <div className={styles.line}>
                {item.id ? (
                  <Link href={`/unit/${run.slugs[item.id] ?? ''}`} className={styles.what}>
                    <UnitWell
                      id={item.id}
                      faction={faction}
                      techLabel={item.techLabel}
                      size={30}
                      imageSize={28}
                      pip={false}
                    />
                    <span className={`t ${styles.name}`}>
                      {item.name}
                      {item.count > 1 && <span className={styles.count}>×{item.count}</span>}
                    </span>
                  </Link>
                ) : (
                  <span className={styles.action}>{item.name}</span>
                )}
                <span className={styles.lane}>{item.laneLabel}</span>
                <span className={`m ${styles.dur}`}>
                  {item.end > item.start ? `${Math.round(item.end - item.start)}s` : ''}
                </span>
              </div>

              {item.id && (
                <div className={styles.econ}>
                  <span className={styles.econItem}>
                    <span className={styles.econLabel}>drain</span>
                    <span className={`m ${styles.mass}`}>{Math.round(item.drainMass)}</span>
                    <span className={styles.slash}>/</span>
                    <span className={`m ${styles.energy}`}>{Math.round(item.drainEnergy)}</span>
                  </span>
                  <span className={styles.econItem}>
                    <span className={styles.econLabel}>income after</span>
                    <span className={`m ${styles.mass}`}>{Math.round(item.incomeMass)}</span>
                    <span className={styles.slash}>/</span>
                    <span className={`m ${styles.energy}`}>{Math.round(item.incomeEnergy)}</span>
                  </span>
                  {item.stalledEnergy >= 0.5 && (
                    <span className={styles.stall}>stalled on energy {Math.round(item.stalledEnergy)}s</span>
                  )}
                  {item.stalledMass >= 0.5 && (
                    <span className={styles.stall}>stalled on mass {Math.round(item.stalledMass)}s</span>
                  )}
                </div>
              )}

              {item.note && <p className={styles.note}>{item.note}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.after}>
        <div className={styles.card}>
          <span className={`lbl ${styles.cardLabel}`}>What the first factory makes on a {mapSize}</span>
          <p className={styles.cardBody}>{opening.factoryQueue[mapSize]}</p>
        </div>

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
        {opening.source.edited && ` (last edited ${opening.source.edited})`}. Every time and cost on
        this page is computed from the current patch&rsquo;s blueprints, not copied from the guide:
        build points divided by build power, with the economy stepped forward so a stall shows up
        where it would happen. Two things it assumes — you start with the ACU&rsquo;s storage full
        ({run.startMass} mass, {run.startEnergy} energy), and there is no reclaim. With rocks near
        your spawn every time here is slower than you will actually manage.
        {opening.caveat && ` ${opening.caveat}`}
      </p>
    </div>
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

function Total({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className={styles.total} data-tone={tone}>
      <dt className={`lbl ${styles.totalLabel}`}>{label}</dt>
      <dd className={`m ${styles.totalValue}`}>
        {value}
        {sub && <span className={styles.totalSub}>{sub}</span>}
      </dd>
    </div>
  );
}
