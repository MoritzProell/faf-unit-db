import type { Unit, Faction } from './types';
import type { Opening, OpeningStep } from '@/data/openings';

/**
 * A build order, run against the blueprints.
 *
 * Build orders are normally written as a list of things to put down, and the
 * part players actually need — when each one lands, and whether the economy can
 * carry it — is left to be learned by replaying the opening a hundred times.
 * All of it is arithmetic over numbers this site already has:
 *
 *   seconds  = BuildTime / (build power working on it)
 *   drain/s  = BuildCost / seconds
 *
 * so the whole opening can be stepped forward and the answer read off.
 *
 * The economy is simulated rather than summed, because the interesting failure
 * is a stall and a stall is not visible in totals. The game slows construction
 * to whatever the resources can cover, so this does the same: at each tick,
 * work out what every active builder is asking for, see what income plus
 * storage can actually pay, and advance progress by that fraction. An opening
 * that outruns its power comes out as a longer timeline with the stall marked
 * where it happens, which is exactly what it feels like to play it.
 *
 * Two assumptions are stated rather than hidden, because the blueprints do not
 * settle them. The player starts with the ACU's own storage full, which is
 * where 650 mass and 3900 energy come from — read off the ACU blueprint, not
 * typed in. And reclaim is not modelled at all: on a map with rocks near the
 * spawn every one of these timings is pessimistic, and by a lot.
 */

/** Simulation granularity. Fine enough that a 6-second build lands within 0.05s. */
const TICK = 0.05;
/** A build order that has not finished by here is not an opening any more. */
const MAX_SECONDS = 900;

export interface TimelineItem {
  /** Blueprint id of what was built, or null for a step that builds nothing. */
  id: string | null;
  name: string;
  techLabel: string;
  count: number;
  lane: string;
  laneLabel: string;
  /** Seconds from game start to when the first of the count begins. */
  start: number;
  /** Seconds from game start to when the last of the count completes. */
  end: number;
  /** Mass and energy per second while this step is being built, unstalled. */
  drainMass: number;
  drainEnergy: number;
  massEach: number;
  energyEach: number;
  /** Income the moment this step completes. */
  incomeMass: number;
  incomeEnergy: number;
  /** Seconds of this step's duration spent short of a resource. */
  stalledMass: number;
  stalledEnergy: number;
  note?: string;
  action?: string;
}

export interface OpeningRun {
  items: TimelineItem[];
  /** Total elapsed seconds for the ACU lane. */
  duration: number;
  /** Income at the end of the run. */
  finalMass: number;
  finalEnergy: number;
  startMass: number;
  startEnergy: number;
  /** Seconds spent stalled on each resource across the whole run. */
  stalledMass: number;
  stalledEnergy: number;
  /** Steps whose unit could not be resolved for this faction. */
  unresolved: string[];
}

interface Econ {
  mass: number;
  energy: number;
  buildPoints: number;
  massPerSecond: number;
  energyPerSecond: number;
  energyUpkeep: number;
}

function econOf(u: Unit): Econ {
  const e = (u.Economy ?? {}) as Record<string, number | undefined>;
  return {
    mass: e.BuildCostMass ?? 0,
    energy: e.BuildCostEnergy ?? 0,
    buildPoints: e.BuildTime ?? 0,
    massPerSecond: e.ProductionPerSecondMass ?? 0,
    energyPerSecond: e.ProductionPerSecondEnergy ?? 0,
    energyUpkeep: e.MaintenanceConsumptionPerSecondEnergy ?? 0,
  };
}

/**
 * Resolve a suffix like 'B0101' to this faction's unit.
 *
 * The last four characters of a blueprint id mean the same thing in every
 * faction, which is what lets an opening be written once. Anchored on the
 * suffix and the faction rather than on a table of ids, so a faction added
 * later needs no edit here.
 */
function resolve(suffix: string, faction: Faction, all: Unit[]): Unit | undefined {
  return all.find((u) => u.faction === faction && u.Id.toUpperCase().endsWith(suffix.toUpperCase()));
}

interface Job {
  lane: string;
  laneLabel: string;
  step: OpeningStep;
  unit: Unit | null;
  econ: Econ | null;
  count: number;
  /** Build power on this job. The ACU lane picks up assists. */
  power: number;
  /** Not started before this. Used to hold an engineer lane until it exists. */
  readyAt: number;
  /** Lane key this job lends its build power to instead of building itself. */
  assist?: string;
}

/**
 * Run one opening for one faction.
 *
 * Lanes advance in parallel and share one economy, which is the only way the
 * hydro opening reads correctly: its ACU builds almost nothing and the
 * interesting sequence is on an engineer that does not exist until the factory
 * has produced it.
 */
export function runOpening(opening: Opening, faction: Faction, all: Unit[]): OpeningRun {
  const unresolved: string[] = [];

  const acuUnit = all.find((u) => u.faction === faction && /L0001$/i.test(u.Id));
  const acuEcon = acuUnit ? econOf(acuUnit) : null;
  const acuPower = ((acuUnit?.Economy ?? {}) as { BuildRate?: number }).BuildRate ?? 10;

  const startMass = ((acuUnit?.Economy ?? {}) as { StorageMass?: number }).StorageMass ?? 650;
  const startEnergy = ((acuUnit?.Economy ?? {}) as { StorageEnergy?: number }).StorageEnergy ?? 3900;

  // Income starts as the ACU's own trickle, which is why an opening works at
  // all before the first extractor lands.
  let massPerSecond = acuEcon?.massPerSecond ?? 1;
  let energyPerSecond = acuEcon?.energyPerSecond ?? 20;
  let upkeep = 0;
  let storedMass = startMass;
  let storedEnergy = startEnergy;

  const build = (step: OpeningStep, lane: string, laneLabel: string, power: number, readyAt = 0): Job => {
    const unit = step.unit ? resolve(step.unit, faction, all) ?? null : null;
    if (step.unit && !unit) unresolved.push(step.unit);
    return {
      lane,
      laneLabel,
      step,
      unit,
      econ: unit ? econOf(unit) : null,
      count: step.count ?? 1,
      power,
      readyAt,
      assist: step.assist,
    };
  };

  // Lane 1: the ACU, from t=0.
  const acuJobs = opening.acu.map((s) => build(s, 'acu', 'ACU', acuPower));

  // Lane 2: the first factory, which cannot start until the ACU has built it.
  // Its own build power comes off the blueprint, not a constant.
  const factoryLane = opening.lanes.find((l) => l.key === 'factory' && l.timed);
  const firstFactory = opening.acu.find((s) => s.unit?.startsWith('B01'));
  const factoryUnit = firstFactory?.unit ? resolve(firstFactory.unit, faction, all) : undefined;
  const factoryPower = ((factoryUnit?.Economy ?? {}) as { BuildRate?: number }).BuildRate ?? 20;

  // Lane 3+: engineer lanes, each held until that engineer has been produced.
  const engieLanes = opening.lanes.filter((l) => l.timed && l.key.startsWith('engie'));
  const engieUnit = resolve('L0105', faction, all);
  const engiePower = ((engieUnit?.Economy ?? {}) as { BuildRate?: number }).BuildRate ?? 5;

  const items: TimelineItem[] = [];

  // Per-lane cursors into their job lists.
  const lanes: {
    jobs: Job[];
    at: number;
    progress: number;
    done: number;
    started: number | null;
    assistTarget?: number;
    assistFrom?: number;
  }[] = [{ jobs: acuJobs, at: 0, progress: 0, done: 0, started: 0 }];
  if (factoryLane) {
    lanes.push({
      jobs: factoryLane.steps.map((s) => build(s, 'factory', factoryLane.label, factoryPower, Infinity)),
      at: 0,
      progress: 0,
      done: 0,
      started: null,
    });
  }
  for (const l of engieLanes) {
    lanes.push({
      jobs: l.steps.map((s) => build(s, l.key, l.label, engiePower, Infinity)),
      at: 0,
      progress: 0,
      done: 0,
      started: null,
    });
  }

  const FACTORY_LANE = factoryLane ? 1 : -1;
  const ENGIE_START = factoryLane ? 2 : 1;

  let t = 0;
  let stalledMassTotal = 0;
  let stalledEnergyTotal = 0;
  // Per-item stall accounting, keyed by the item index being worked.
  const itemStall = new Map<string, { mass: number; energy: number }>();
  const openItems = new Map<string, TimelineItem>();

  const laneKey = (li: number) => `${li}:${lanes[li].at}`;

  while (t < MAX_SECONDS) {
    /**
     * Who is helping whom, this tick.
     *
     * An assisting builder does not build anything of its own: it adds its
     * build power to whatever the lane it is helping is working on, and the
     * drain goes up to match. This is not a detail. The hydrocarbon opening
     * has one T1 engineer put down a 400-point building, which alone is 80
     * seconds; the source has the ACU and a second engineer pile onto it, and
     * at 20 build power it is 20 seconds. Modelling the assist as nothing
     * would have shown the opening as four times slower than it plays, which
     * is worse than not showing a clock at all.
     */
    const helpFor = new Map<number, number>();
    const assisting = new Set<number>();
    for (let li = 0; li < lanes.length; li++) {
      const lane = lanes[li];
      const job = lane.jobs[lane.at];
      if (!job?.assist || t < job.readyAt) continue;
      const target = lanes.findIndex((l) => l.jobs[l.at]?.lane === job.assist);
      const tj = target >= 0 ? lanes[target].jobs[lanes[target].at] : undefined;
      // Nothing to help yet: wait rather than skipping the step, because the
      // engineer being helped may not have come off the factory.
      if (!tj || !tj.unit || t < tj.readyAt) continue;
      helpFor.set(target, (helpFor.get(target) ?? 0) + job.power);
      assisting.add(li);
      lane.assistTarget = target;
      if (lane.assistFrom === undefined) lane.assistFrom = t;
    }

    // Which lanes can work this tick.
    const active: number[] = [];
    for (let li = 0; li < lanes.length; li++) {
      const lane = lanes[li];
      const job = lane.jobs[lane.at];
      if (!job) continue;
      if (t < job.readyAt) continue;
      // An assisting lane contributes power but does no work of its own.
      if (job.assist) continue;
      // A step that builds nothing is an instruction, not work: record it and
      // move on without consuming time.
      if ((!job.unit || !job.econ) && !job.assist) {
        items.push({
          id: null,
          name: job.step.action ?? 'Continue',
          techLabel: '',
          count: 1,
          lane: job.lane,
          laneLabel: job.laneLabel,
          start: t,
          end: t,
          drainMass: 0,
          drainEnergy: 0,
          massEach: 0,
          energyEach: 0,
          incomeMass: massPerSecond,
          incomeEnergy: energyPerSecond - upkeep,
          stalledMass: 0,
          stalledEnergy: 0,
          note: job.step.note,
          action: job.step.action,
        });
        lane.at++;
        lane.progress = 0;
        lane.done = 0;
        li--; // re-examine this lane, its next job may also be instant
        continue;
      }
      active.push(li);
    }

    if (active.length === 0) {
      // Nothing can work. Either everything is finished, or a lane is waiting
      // on a unit that has not been produced yet.
      const waiting = lanes.some((l) => l.jobs[l.at] && l.jobs[l.at].readyAt > t && l.jobs[l.at].readyAt < Infinity);
      if (!waiting) break;
      t += TICK;
      continue;
    }

    // What every active lane wants this tick, at full speed.
    let wantMass = 0;
    let wantEnergy = 0;
    const powerOf = (li: number) => lanes[li].jobs[lanes[li].at]!.power + (helpFor.get(li) ?? 0);

    for (const li of active) {
      const job = lanes[li].jobs[lanes[li].at]!;
      const e = job.econ!;
      const seconds = e.buildPoints / powerOf(li);
      wantMass += (e.mass / seconds) * TICK;
      wantEnergy += (e.energy / seconds) * TICK;
    }

    const haveMass = storedMass + massPerSecond * TICK;
    const haveEnergy = storedEnergy + (energyPerSecond - upkeep) * TICK;
    const ratioMass = wantMass > 0 ? Math.min(1, haveMass / wantMass) : 1;
    const ratioEnergy = wantEnergy > 0 ? Math.min(1, haveEnergy / wantEnergy) : 1;
    const ratio = Math.min(ratioMass, ratioEnergy);

    if (ratioMass < 0.999) stalledMassTotal += TICK;
    if (ratioEnergy < 0.999) stalledEnergyTotal += TICK;

    storedMass = Math.min(startMass, haveMass - wantMass * ratio);
    storedEnergy = Math.min(startEnergy, haveEnergy - wantEnergy * ratio);

    for (const li of active) {
      const lane = lanes[li];
      const job = lane.jobs[lane.at]!;
      const e = job.econ!;
      const power = powerOf(li);
      const key = laneKey(li);

      if (lane.progress === 0 && lane.done === 0 && !openItems.has(key)) {
        openItems.set(key, {
          id: job.unit!.Id,
          name: job.unit!.name,
          techLabel: job.unit!.techLabel,
          count: job.count,
          lane: job.lane,
          laneLabel: job.laneLabel,
          start: t,
          end: t,
          drainMass: e.mass / (e.buildPoints / power),
          drainEnergy: e.energy / (e.buildPoints / power),
          massEach: e.mass,
          energyEach: e.energy,
          incomeMass: 0,
          incomeEnergy: 0,
          stalledMass: 0,
          stalledEnergy: 0,
          note: job.step.note,
        });
        itemStall.set(key, { mass: 0, energy: 0 });
      }
      const stall = itemStall.get(key)!;
      if (ratioMass < 0.999) stall.mass += TICK;
      if (ratioEnergy < 0.999) stall.energy += TICK;

      lane.progress += power * ratio * TICK;

      if (lane.progress >= e.buildPoints) {
        lane.progress -= e.buildPoints;
        lane.done++;

        // A finished building starts paying immediately.
        massPerSecond += e.massPerSecond;
        energyPerSecond += e.energyPerSecond;
        upkeep += e.energyUpkeep;

        // The factory cannot start producing until the ACU has finished
        // building it, which is the whole reason the lanes share a clock.
        if (FACTORY_LANE >= 0 && factoryUnit && job.unit!.Id === factoryUnit.Id) {
          for (const j of lanes[FACTORY_LANE].jobs) j.readyAt = Math.min(j.readyAt, t);
        }

        // An engineer coming off the factory releases the next engineer lane.
        if (li === FACTORY_LANE) {
          const idx = ENGIE_START + lane.done - 1;
          if (idx < lanes.length && lanes[idx].jobs.length) {
            for (const j of lanes[idx].jobs) j.readyAt = Math.min(j.readyAt, t);
          }
        }

        if (lane.done >= job.count) {
          // Everyone who was helping with this is free to move on.
          for (let ai = 0; ai < lanes.length; ai++) {
            if (lanes[ai].assistTarget === li) {
              const aItem = lanes[ai].jobs[lanes[ai].at];
              items.push({
                id: null,
                name: aItem?.step.action ?? 'Assist',
                techLabel: '',
                count: 1,
                lane: aItem!.lane,
                laneLabel: aItem!.laneLabel,
                start: lanes[ai].assistFrom ?? t,
                end: t,
                drainMass: 0,
                drainEnergy: 0,
                massEach: 0,
                energyEach: 0,
                incomeMass: massPerSecond,
                incomeEnergy: energyPerSecond - upkeep,
                stalledMass: 0,
                stalledEnergy: 0,
                note: aItem?.step.note,
                action: aItem?.step.action ?? 'Assist',
              });
              lanes[ai].at++;
              lanes[ai].progress = 0;
              lanes[ai].done = 0;
              lanes[ai].assistTarget = undefined;
              lanes[ai].assistFrom = undefined;
            }
          }
          const item = openItems.get(key)!;
          item.end = t;
          /**
           * Drain, measured rather than predicted.
           *
           * Set when the step started it would be the rate for whoever began
           * it, which goes stale the moment anyone assists, and it ignores a
           * stall entirely. Total cost over the time the step actually took is
           * true in every case and is the number that matters: it is what the
           * economy had to carry while this was going up.
           */
          const span = Math.max(TICK, item.end - item.start);
          item.drainMass = (item.massEach * item.count) / span;
          item.drainEnergy = (item.energyEach * item.count) / span;
          item.incomeMass = massPerSecond;
          item.incomeEnergy = energyPerSecond - upkeep;
          item.stalledMass = Math.round(stall.mass * 10) / 10;
          item.stalledEnergy = Math.round(stall.energy * 10) / 10;
          items.push(item);
          openItems.delete(key);
          lane.at++;
          lane.done = 0;
          lane.progress = 0;
        }
      }
    }

    t += TICK;
  }

  items.sort((a, b) => a.start - b.start || a.end - b.end);

  const acuItems = items.filter((i) => i.lane === 'acu');
  return {
    items,
    duration: acuItems.length ? acuItems[acuItems.length - 1].end : 0,
    finalMass: massPerSecond,
    finalEnergy: energyPerSecond - upkeep,
    startMass,
    startEnergy,
    stalledMass: Math.round(stalledMassTotal * 10) / 10,
    stalledEnergy: Math.round(stalledEnergyTotal * 10) / 10,
    unresolved: [...new Set(unresolved)],
  };
}

/** m:ss, which is how a build order is talked about. */
export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`;
}
