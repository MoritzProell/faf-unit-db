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
  const [openingId, setOpeningId] = useState(openings[0].id);
  const [reclaim, setReclaim] = useState<string>('none');
  const [mapSize, setMapSize] = useState<MapSize>('10x10');

  /**
   * The build is the state, and the option chips are a second way of reaching
   * it rather than the only way.
   *
   * Narrowing by land-or-air and hydro is how you find an opening when you know
   * your situation and not its name. It is a poor way to get to one you already
   * know the name of, and it cannot express a build that is not a point in that
   * grid at all, which the transport opening is. So the openings are listed by
   * name, the chips select among them, and both directions stay in step because
   * the chips read their state off whichever build is selected.
   */
  const visible = openings.filter((o) => !o.only20x20 || mapSize === '20x20');
  const opening = visible.find((o) => o.id === openingId) ?? visible[0];
  const generic = opening.map === 'Generic';
  const variant = opening.forReclaim === 'high';

  /** The nearest build to what is selected now, with one thing changed. */
  const choose = (
    next: Partial<{ map: string; second: 'land' | 'air'; hydro: boolean; high: boolean }>
  ) => {
    const want = {
      map: next.map ?? opening.map,
      second: next.second ?? opening.secondFactory,
      hydro: next.hydro ?? opening.hydro,
      high: next.high ?? variant,
    };
    const pool = visible.filter((o) => o.map === want.map);
    const best = pool
      .map((o) => ({
        o,
        // Whichever axis the click named has to hold; the rest are preferences,
        // so a click always lands somewhere rather than doing nothing.
        score:
          (o.secondFactory === want.second ? 4 : 0) +
          (o.hydro === want.hydro ? 2 : 0) +
          ((o.forReclaim === 'high') === want.high ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (best) setOpeningId(best.o.id);
  };

  const pickReclaim = (key: string) => {
    setReclaim(key);
    if (generic) choose({ high: key === 'high' });
  };

  const pickOpening = (o: Opening) => {
    setOpeningId(o.id);
    if (o.only20x20) setMapSize('20x20');
    if (o.forReclaim === 'high' && reclaim !== 'high') setReclaim('high');
  };

  const run = runs[opening.id]?.[reclaim];
  if (!run) return null;

  const level = RECLAIM_LEVELS.find((l) => l.key === reclaim)!;
  const untimed = opening.lanes.filter((l) => !l.timed && l.advice?.length);
  const stalled = run.stalledMass + run.stalledEnergy;

  return (
    <div className={styles.wrap}>
      <div className={styles.picker}>
        <Choice label="Opening">
          {visible.map((o) => (
            <button
              key={o.id}
              type="button"
              className={styles.opt}
              data-on={o.id === opening.id}
              onClick={() => pickOpening(o)}
            >
              {o.title}
            </button>
          ))}
        </Choice>
      </div>

      <div className={styles.picker}>
        <Choice label="Map">
          {['Generic', ...new Set(openings.filter((o) => o.map !== 'Generic').map((o) => o.map))].map((m) => (
            <button key={m} type="button" className={styles.opt} data-on={opening.map === m} onClick={() => choose({ map: m })}>
              {m}
            </button>
          ))}
        </Choice>

        {generic && !opening.only20x20 && (
          <Choice label="Second factory">
            {(['land', 'air'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={styles.opt}
                data-on={opening.secondFactory === v}
                onClick={() => choose({ second: v })}
              >
                {v === 'land' ? 'Land' : 'Air'}
              </button>
            ))}
          </Choice>
        )}

        {generic && !opening.only20x20 && (
          <Choice label="Hydrocarbon nearby">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                className={styles.opt}
                data-on={opening.hydro === v}
                onClick={() => choose({ hydro: v })}
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
              onClick={() => pickReclaim(l.key)}
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
          <h3 className={`t ${styles.title}`}>
            {opening.title}
            {variant && <span className={styles.swap}>swapped in for high reclaim</span>}
          </h3>
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
                  {item.count > 1 && <span className={`m ${styles.count}`}>{item.count}&times;</span>}
                  <UnitWell
                    id={item.id}
                    faction="UEF"
                    techLabel={item.techLabel}
                    size={34}
                    imageSize={32}
                    pip={false}
                  />
                  <span className={`t ${styles.name}`}>{item.name}</span>
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
            <span className={styles.bank}>
              <Bar value={item.storedMass} max={run.startMass} kind="mass" />
              <Bar value={item.storedEnergy} max={run.startEnergy} kind="energy" />
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

/**
 * One resource's reserve, drawn the way the game draws it.
 *
 * The bank was two numbers, and a number that goes down reads as a loss even
 * when nothing is wrong: spending your starting mass on a factory is the
 * opening working, not the opening failing. In game you never read it as a
 * number, you read a bar filling and emptying against its cap, and empty is the
 * only state that means anything bad. Same two colours as the ecobar, mass
 * above energy, so the shape is already familiar.
 */
function Bar({ value, max, kind }: { value: number; max: number; kind: 'mass' | 'energy' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className={styles.bar} data-kind={kind} data-empty={pct < 1}>
      <span className={styles.track}>
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </span>
      <span className={`m ${styles.barValue}`}>{value}</span>
    </span>
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
