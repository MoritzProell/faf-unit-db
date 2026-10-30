'use client';

import { useRef, useState } from 'react';
import { UnitWell } from './UnitWell';
import { UnitLink } from '@/components/UnitLink';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { clock } from '@/lib/faf/opening';
import type { OpeningRun } from '@/lib/faf/opening';
import { OPENING_GROUPS, RECLAIM_LEVELS, type Opening, type MapSize } from '@/data/openings';
import styles from './OpeningTimeline.module.css';

const MAP_SIZES: MapSize[] = ['5x5', '10x10', '20x20'];

/** One run of one opening at one reclaim level, precomputed on the server. */
export type Runs = Record<string, Record<string, OpeningRun & { slugs: Record<string, string> }>>;

type ReclaimKey = (typeof RECLAIM_LEVELS)[number]['key'];

/**
 * The openings, as a list to pick from and the one picked, played out.
 *
 * This used to be a chain of questions — map, second factory, hydro, reclaim,
 * map size — that steered to a build, with questions appearing and vanishing
 * depending on the earlier answers. Seven builds do not need steering: every
 * one is shown with the situation it is for and the two numbers that tell
 * them apart, and reclaim stays as the one real input, because it changes the
 * timings of whichever build is open rather than which build it is.
 */
export function OpeningTimeline({ openings, runs }: { openings: Opening[]; runs: Runs }) {
  const [openingId, setOpeningId] = useState(openings[0].id);
  const [reclaim, setReclaim] = useState<ReclaimKey>('none');
  const detail = useRef<HTMLElement>(null);

  const opening = openings.find((o) => o.id === openingId) ?? openings[0];
  const generic = opening.map === 'Generic';
  const variant = opening.forReclaim === 'high';

  /**
   * The plain build and its dual-assist counterpart point at each other.
   *
   * Picking high reclaim used to swap the build silently. Saying so, with the
   * other build one click away, keeps the reader in charge of which build is
   * on screen.
   */
  const partner =
    generic && !opening.only20x20 && !opening.hydro
      ? openings.find(
          (o) =>
            o.id !== opening.id &&
            o.map === 'Generic' &&
            !o.only20x20 &&
            !o.hydro &&
            o.secondFactory === opening.secondFactory &&
            (o.forReclaim === 'high') !== variant
        )
      : undefined;

  const pick = (o: Opening) => {
    setOpeningId(o.id);
    if (o.forReclaim === 'high') setReclaim('high');
    // Stacked layout: the build is below the list, so take the reader to it.
    const el = detail.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.5) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const run = runs[opening.id]?.[reclaim];
  if (!run) return null;

  const level = RECLAIM_LEVELS.find((l) => l.key === reclaim)!;
  const untimed = opening.lanes.filter((l) => !l.timed && l.advice?.length);
  const stalled = run.stalledMass + run.stalledEnergy;
  const sizes = opening.only20x20 ? (['20x20'] as MapSize[]) : MAP_SIZES;

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <div className={styles.chooser}>
          {OPENING_GROUPS.map((g) => {
            const list = openings.filter((o) => o.group === g.key);
            if (!list.length) return null;
            return (
              <div key={g.key} className={styles.shelf} role="group" aria-labelledby={`opening-shelf-${g.key}`}>
                <span id={`opening-shelf-${g.key}`} className={`lbl ${styles.shelfLabel}`}>
                  {g.label}
                </span>
                {list.map((o) => {
                  const r = runs[o.id]?.[reclaim];
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={styles.pick}
                      aria-pressed={o.id === opening.id}
                      onClick={() => pick(o)}
                    >
                      <span className={`t ${styles.pickTitle}`}>{o.title}</span>
                      <span className={styles.pickWhen}>{o.situation}</span>
                      {r && (
                        <span className={`m ${styles.pickStats}`}>
                          <span title="When the ACU is free to leave the base">
                            <Icon name="clock" size={11} /> {clock(r.duration)}
                          </span>
                          <span className={styles.mass} title="Mass income at the end of the opening">
                            {Math.round(r.finalMass)} m/s
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <article className={styles.detail} ref={detail} aria-labelledby="opening-title">
          <header className={styles.head}>
            <div className={styles.headMain}>
              <span className={`lbl ${styles.kicker}`}>{opening.situation}</span>
              <h3 id="opening-title" className={`t ${styles.title}`}>
                {opening.title}
              </h3>
              <p className={styles.summary}>{opening.summary}</p>
              <p className={styles.credit}>
                Sequence from{' '}
                <a href={opening.source.url} target="_blank" rel="noopener noreferrer">
                  {opening.source.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </p>
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
          </header>

          <div className={styles.controls}>
            <Segmented
              label="Reclaim near your base"
              value={reclaim}
              onChange={setReclaim}
              options={RECLAIM_LEVELS.map((l) => ({
                value: l.key,
                label: l.perSecond > 0 ? `${l.label} +${l.perSecond}/s` : l.label,
              }))}
            />
            {partner && reclaim === 'high' && !variant && (
              <p className={styles.hint}>
                With this much reclaim, two engineers can stand on the ACU instead of walking off.{' '}
                <button type="button" className={styles.hintBtn} onClick={() => pick(partner)}>
                  Show {partner.title} <Icon name="chevronRight" size={11} strokeWidth={2.2} />
                </button>
              </p>
            )}
            {partner && reclaim !== 'high' && variant && (
              <p className={styles.hint}>
                This build is paid for by heavy reclaim; with less, watch the stall column.{' '}
                <button type="button" className={styles.hintBtn} onClick={() => pick(partner)}>
                  Show {partner.title} <Icon name="chevronRight" size={11} strokeWidth={2.2} />
                </button>
              </p>
            )}
          </div>

          <div className={styles.body}>
            <div className={styles.table}>
              <div className={styles.headRow} aria-hidden="true">
                <span>Time</span>
                <span>Build</span>
                <span>By</span>
                <span className={styles.num}>Takes</span>
                <span className={styles.num}>Drain /s</span>
                <span className={styles.num}>Income /s</span>
                <span className={styles.num}>In the bank</span>
              </div>
              <ol className={styles.steps} aria-label={`${opening.title}, step by step`}>
                {run.items.map((item, i) => (
                  <li key={`${item.lane}-${i}`} className={styles.row} data-action={!item.id}>
                    <span className={`m ${styles.time}`}>{clock(item.start)}</span>

                    <span className={styles.what}>
                      {item.id ? (
                        <UnitLink href={`/unit/${run.slugs[item.id] ?? ''}`} className={styles.link}>
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
                        </UnitLink>
                      ) : (
                        <span className={styles.action}>{item.name}</span>
                      )}
                    </span>

                    <span className={styles.metrics}>
                      <span className={styles.byCol}>{item.laneLabel}</span>
                      <span className={`m ${styles.num} ${styles.takes}`} data-label="Takes">
                        {item.end > item.start ? `${Math.round(item.end - item.start)}s` : '–'}
                      </span>
                      <span className={`m ${styles.num}`} data-label="Drain">
                        {item.id ? <Pair mass={Math.round(item.drainMass)} energy={Math.round(item.drainEnergy)} /> : '–'}
                      </span>
                      <span className={`m ${styles.num}`} data-label="Income">
                        <Pair mass={Math.round(item.incomeMass)} energy={Math.round(item.incomeEnergy)} />
                      </span>
                      <span className={styles.bank}>
                        <Bar value={item.storedMass} max={run.startMass} kind="mass" />
                        <Bar value={item.storedEnergy} max={run.startEnergy} kind="energy" />
                      </span>
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
                  </li>
                ))}
              </ol>
            </div>

            <aside className={styles.notes} aria-label="Around the build">
              {generic && (
                <div className={styles.card}>
                  <span className={`lbl ${styles.cardLabel}`}>What the first factory makes</span>
                  <dl className={styles.sizes}>
                    {sizes.map((s) => (
                      <div key={s} className={styles.size}>
                        <dt className="m">{s}</dt>
                        <dd>{opening.factoryQueue[s]}</dd>
                      </div>
                    ))}
                  </dl>
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
                . Every time, cost and reserve here is computed from the current patch&rsquo;s
                blueprints rather than copied from the guide: build points divided by build power,
                with the economy stepped forward tick by tick so a stall shows up where it would
                happen. Costs are identical in all four factions, so there is no faction to choose.
                Three things it assumes. You start with the ACU&rsquo;s storage full,{' '}
                {run.startMass} mass and {run.startEnergy} energy, read off its blueprint.{' '}
                {level.perSecond > 0
                  ? `Reclaim is worth ${level.perSecond} mass a second from the moment your first engineer exists, which is a figure you set rather than one measured: what a map's rocks are worth is a property of the map and is not in the blueprints.`
                  : 'Reclaim is off, so every time here is pessimistic on a map with rocks near your spawn. The reclaim buttons show what it buys.'}{' '}
                And nothing is lost, so no engineer here ever walks into a raid.
                {opening.caveat && ` ${opening.caveat}`}
              </p>
            </aside>
          </div>
        </article>
      </div>
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
      <span className={`m ${styles.barValue}`}>
        {value}
        <span className="visually-hidden"> {kind} in storage</span>
      </span>
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
