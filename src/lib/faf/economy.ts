import type { Unit } from './types';

/**
 * Derived economy figures.
 *
 * These are the numbers that decide which building you actually put down, and
 * none of them are in the blueprint: a shield's raw hit points pick a different
 * winner from its hit points per unit of energy, and a mass extractor's cost
 * means nothing until you know how long it takes to earn it back. Everything
 * here is arithmetic on blueprint fields, so it moves with the patch.
 */

interface Economy {
  BuildCostMass?: number;
  BuildCostEnergy?: number;
  ProductionPerSecondMass?: number;
  ProductionPerSecondEnergy?: number;
  MaintenanceConsumptionPerSecondEnergy?: number;
}

const econ = (u: Unit): Economy => (u.Economy ?? {}) as Economy;

export interface ShieldEconomy {
  hp: number;
  regen: number;
  recharge: number;
  radius: number;
  /** Shield hit points bought per point of mass. */
  perMass: number | null;
  /** Shield hit points bought per 1 000 energy of build cost. */
  per1kEnergy: number | null;
  /** Energy drained per second just to keep it standing. */
  upkeep: number;
  /**
   * Seconds of upkeep that cost as much energy as building it did. A low
   * number means the shield is cheap to raise and expensive to hold.
   */
  upkeepPaybackSeconds: number | null;
}

export function shieldEconomy(u: Unit): ShieldEconomy | null {
  const s = u.Defense?.Shield;
  if (!s?.ShieldMaxHealth) return null;
  const e = econ(u);
  const hp = s.ShieldMaxHealth;
  const mass = e.BuildCostMass ?? 0;
  const energy = e.BuildCostEnergy ?? 0;
  const upkeep = e.MaintenanceConsumptionPerSecondEnergy ?? 0;
  return {
    hp,
    regen: s.ShieldRegenRate ?? 0,
    recharge: s.ShieldRechargeTime ?? 0,
    radius: s.ShieldSize ?? 0,
    perMass: mass > 0 ? hp / mass : null,
    per1kEnergy: energy > 0 ? (hp / energy) * 1000 : null,
    upkeep,
    upkeepPaybackSeconds: upkeep > 0 && energy > 0 ? energy / upkeep : null,
  };
}

export interface MassEconomy {
  /** Mass produced per second. */
  perSecond: number;
  /** Seconds of production to earn back the mass it cost to build. */
  paybackSeconds: number | null;
  /** Energy burned per second to run it. */
  upkeep: number;
  /** Energy burned for each point of mass produced. Zero for an extractor. */
  energyPerMass: number | null;
  /** True when it makes mass out of energy rather than out of a deposit. */
  fabricator: boolean;
}

export function massEconomy(u: Unit): MassEconomy | null {
  const e = econ(u);
  const perSecond = e.ProductionPerSecondMass ?? 0;
  if (perSecond <= 0) return null;
  const cost = e.BuildCostMass ?? 0;
  const upkeep = e.MaintenanceConsumptionPerSecondEnergy ?? 0;
  return {
    perSecond,
    paybackSeconds: cost > 0 ? cost / perSecond : null,
    upkeep,
    energyPerMass: upkeep > 0 ? upkeep / perSecond : null,
    fabricator: (u.Categories ?? []).includes('MASSFABRICATION'),
  };
}

export interface PowerEconomy {
  perSecond: number;
  /** Energy per second bought per point of mass. The efficiency comparison. */
  perMass: number | null;
  /** Seconds of output to earn back the energy it cost to build. */
  paybackSeconds: number | null;
}

export function powerEconomy(u: Unit): PowerEconomy | null {
  const e = econ(u);
  const perSecond = e.ProductionPerSecondEnergy ?? 0;
  if (perSecond <= 0) return null;
  const mass = e.BuildCostMass ?? 0;
  const energy = e.BuildCostEnergy ?? 0;
  return {
    perSecond,
    perMass: mass > 0 ? perSecond / mass : null,
    paybackSeconds: energy > 0 ? energy / perSecond : null,
  };
}

/** "18s", "2m 30s", "1h 4m" — payback times span three orders of magnitude. */
export function fmtDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

interface Intel {
  RadarRadius?: number;
  SonarRadius?: number;
  OmniRadius?: number;
  RadarStealthFieldRadius?: number;
  SonarStealthFieldRadius?: number;
  ReactivateTime?: number;
}

export interface IntelEconomy {
  kind: 'radar' | 'sonar' | 'omni' | 'stealth';
  /** What it covers: sensor reach, or the radius of the field it projects. */
  radius: number;
  /** Present only when a stealth field hides from radar and sonar unequally. */
  sonarRadius: number | null;
  upkeep: number;
  /** Radius bought per point of mass, and per 1 000 energy of build cost. */
  perMass: number | null;
  per1kEnergy: number | null;
  /** Seconds off the air after it is switched on again. */
  reactivate: number | null;
}

/**
 * What a sensor or a stealth field costs for what it covers.
 *
 * A radar's own hit points are nearly irrelevant and it has no damage at all,
 * so the stat block on those pages said nothing: the question is how much
 * ground it watches, or hides, for what you pay. The T2 stealth generators are
 * the clearest case — every faction's covers exactly radius 24, so the entire
 * difference between them is the 360 to 400 mass and the 5 400 to 6 000 energy
 * it costs to put one down.
 */
export function intelEconomy(u: Unit, role: string): IntelEconomy | null {
  const i = (u.Intel ?? {}) as Intel;
  const e = econ(u);
  const mass = e.BuildCostMass ?? 0;
  const energy = e.BuildCostEnergy ?? 0;

  const pick = (): { kind: IntelEconomy['kind']; radius: number; sonar: number | null } | null => {
    if (role === 'Stealth' && i.RadarStealthFieldRadius) {
      const sonar = i.SonarStealthFieldRadius ?? null;
      return {
        kind: 'stealth',
        radius: i.RadarStealthFieldRadius,
        sonar: sonar && sonar !== i.RadarStealthFieldRadius ? sonar : null,
      };
    }
    if (role === 'Omni' && i.OmniRadius) return { kind: 'omni', radius: i.OmniRadius, sonar: null };
    if (role === 'Sonar' && i.SonarRadius) return { kind: 'sonar', radius: i.SonarRadius, sonar: null };
    if (role === 'Radar' && i.RadarRadius) return { kind: 'radar', radius: i.RadarRadius, sonar: null };
    return null;
  };

  const got = pick();
  if (!got) return null;
  return {
    kind: got.kind,
    radius: got.radius,
    sonarRadius: got.sonar,
    upkeep: e.MaintenanceConsumptionPerSecondEnergy ?? 0,
    perMass: mass > 0 ? got.radius / mass : null,
    per1kEnergy: energy > 0 ? (got.radius / energy) * 1000 : null,
    reactivate: i.ReactivateTime ?? null,
  };
}
