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
