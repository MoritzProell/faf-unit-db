/**
 * Game-accurate DPS calculator.
 *
 * Transliterated from the game's own weapon readout,
 * FAForever/fa `lua/ui/game/unitviewDetail.lua` (deploy/faf), lines 596-700.
 * Names follow the game's: MATH_IRound, CycleProjs, CycleTime, FiringCooldown.
 * Cited line numbers below refer to that file.
 *
 * Do not "simplify" this. The naive damage x rate-of-fire formula agrees with the
 * game only for single-rack single-muzzle weapons; it is wrong for salvos,
 * multi-rack sequences, beams and damage-over-time.
 *
 * Two deliberate departures from the in-game readout, both because this is a
 * database rather than a HUD:
 *   - the game skips DPS for ManualFire / Kamikaze / Defense weapons (line 677).
 *     We compute it for Defense weapons too, since an anti-torpedo's throughput
 *     is a fact worth showing.
 *   - the game folds DamageToShields into damage unconditionally (line 606).
 *     We make it opt-in so the headline figure is damage to units.
 */

export interface RackBone {
  MuzzleBones?: string[];
}

export interface Weapon {
  DisplayName?: string;
  Label?: string;
  WeaponCategory?: string;
  DamageType?: string;
  Damage?: number;
  TractorDamage?: number;
  TractorDamageInterval?: number;
  InitialDamage?: number;
  DamageToShields?: number;
  /** Projectiles released per trigger pull; >1 splits the shot. */
  ProjectilesPerOnFire?: number;
  DamageRadius?: number;
  DoTPulses?: number;
  DoTTime?: number;
  NukeInnerRingDamage?: number;
  NukeOuterRingDamage?: number;
  NukeInnerRingRadius?: number;
  NukeOuterRingRadius?: number;
  BeamLifetime?: number;
  BeamCollisionDelay?: number;
  RateOfFire?: number;
  MuzzleSalvoSize?: number;
  MuzzleSalvoDelay?: number;
  MuzzleChargeDelay?: number;
  MuzzleVelocity?: number;
  RackSalvoSize?: number;
  RackSalvoChargeTime?: number;
  RackSalvoReloadTime?: number;
  RackFireTogether?: boolean;
  RackBones?: RackBone[];
  MaxRadius?: number;
  MinRadius?: number;
  TurretYawRange?: number;
  FiringTolerance?: number;
  FiringRandomness?: number;
  ForceSingleFire?: boolean;
  FireOnDeath?: boolean;
  ManualFire?: boolean;
  WeaponUnpackAnimation?: unknown;
  TargetRestrictOnlyAllow?: string;
  TargetRestrictDisallow?: string;
  FireTargetLayerCapsTable?: Record<string, string>;
  EnergyRequired?: number;
  EnergyDrainPerSecond?: number;
  isTorpedo?: boolean;
  childCount?: number;
  childSplitType?: string;
  /** set by the decorator */
  __splitCount?: number;
  __fragmentCount?: number;
  __category?: string;
  /** derived */
  firingCycle?: FiringCycle;
  dps?: number | null;
  fullDamage?: number;
}

export interface FiringCycle {
  cycleProjs: number;
  cycleTime: number | null;
}

/** The engine's banker's-rounding to one decimal (unitviewDetail.lua). */
export const MATH_IRound = (val: number): number => {
  const scaled = val * 10;
  const rounded = Math.round(scaled);
  const diff = Math.abs(scaled - rounded);
  if (diff === 0.5) {
    return (rounded % 2 === 0 ? rounded : rounded - 1) / 10;
  }
  return rounded / 10;
};

/** unitviewDetail.lua:604-618. */
export const calculateProjectileDamage = (weapon: Weapon, toShields = false): number => {
  let damage = weapon.TractorDamage || weapon.Damage || 0;
  if (weapon.NukeInnerRingDamage) {
    return damage + weapon.NukeInnerRingDamage + (weapon.NukeOuterRingDamage || 0);
  }

  if (toShields && weapon.DamageToShields) {
    damage += weapon.DamageToShields;
  }

  if ((weapon.BeamLifetime || 0) > 0) {
    const beamTicks = Math.floor(MATH_IRound((weapon.BeamLifetime || 0) * 10));
    const collisionTicks = Math.floor(MATH_IRound((weapon.BeamCollisionDelay || 0) * 10));
    damage = damage * (1 + Math.floor(beamTicks / (collisionTicks + 1)));
  } else {
    damage = damage * (weapon.DoTPulses || 1) + (weapon.InitialDamage || 0);
    if (weapon.__fragmentCount) {
      damage *= weapon.__fragmentCount;
    }
  }

  return damage;
};

export const getBeamDamageTicks = (weapon: Weapon): number => {
  if (!weapon.BeamLifetime || weapon.BeamLifetime <= 0) return 0;
  const beamTicks = Math.floor(MATH_IRound(weapon.BeamLifetime * 10));
  const collisionTicks = Math.floor(MATH_IRound((weapon.BeamCollisionDelay || 0) * 10));
  return 1 + Math.floor(beamTicks / (collisionTicks + 1));
};

export interface DoTBreakdown {
  hasDoT: boolean;
  instant?: number;
  dotTotal?: number;
  ticks?: number;
  interval?: number;
  totalTime?: number;
}

export const getDoTBreakdown = (weapon: Weapon): DoTBreakdown => {
  if (weapon.BeamLifetime !== undefined) return { hasDoT: false };

  const hasDoT = (weapon.DoTPulses || 1) > 1;
  if (!hasDoT) return { hasDoT: false };

  const ticks = (weapon.DoTPulses || 1) - 1;
  const instant = (weapon.Damage || 0) + (weapon.InitialDamage || 0);
  const dotTotal = (weapon.Damage || 0) * ticks;

  return {
    hasDoT: true,
    instant,
    dotTotal,
    ticks,
    interval: (weapon.DoTTime || 0) / ticks,
    totalTime: weapon.DoTTime,
  };
};

export const getSalvoInfo = (weapon: Weapon) => {
  const hasMuzzleSalvo = (weapon.MuzzleSalvoDelay || 0) > 0;
  const hasMultiRackSequential =
    (weapon.RackBones?.length ?? 0) > 1 && !weapon.RackFireTogether;
  const hasMultiMuzzleSingleRack =
    weapon.RackBones?.length === 1 &&
    (weapon.RackBones[0].MuzzleBones?.length ?? 0) > 1 &&
    (weapon.MuzzleChargeDelay || 0) > 0;
  return {
    hasMuzzleSalvo,
    hasMultiRackSequential,
    hasMultiMuzzleSingleRack,
    isSalvo: hasMuzzleSalvo || hasMultiRackSequential || hasMultiMuzzleSingleRack,
  };
};

/** Delays are snapped to game ticks: unitviewDetail.lua:626-642. */
export const getRoundedTime = (weapon: Weapon, prop: keyof Weapon): number => {
  const val = (weapon[prop] as number) || 0;
  return val > 0 ? Math.max(0.1, MATH_IRound(10 * val) / 10) : 0;
};

/** unitviewDetail.lua:625 */
export const getFiringCooldown = (weapon: Weapon): number =>
  Math.max(0.1, (weapon.TractorDamageInterval || MATH_IRound(10 / (weapon.RateOfFire || 1))) / 10);

/** The rack/muzzle firing simulation: unitviewDetail.lua:649-670. */
export const processRackSequence = (
  weapon: Weapon,
  firingCooldown: number,
  chargeTime: number,
  muzzleDelays: number,
  muzzleChargeDelay: number
) => {
  let cycleProjs = 0;
  let cycleTime = 0;
  let subCycleTime = 0;

  // "Keep track that the firing cycle has a constant rate" (line 645).
  let singleShot = true;

  const rackBones = weapon.RackBones;
  const rackCount = rackBones?.length || 0;

  if (rackBones && rackCount > 0) {
    for (let index = 0; index < rackCount; index++) {
      const rack = rackBones[index];
      let muzzleCount = weapon.MuzzleSalvoSize || 1;

      if ((weapon.MuzzleSalvoDelay || 0) === 0) {
        muzzleCount = rack.MuzzleBones ? rack.MuzzleBones.length : 1;
      }
      if (muzzleCount > 1 || (weapon.RackFireTogether && rackCount > 1)) singleShot = false;

      cycleProjs += muzzleCount;
      // The game folds MuzzleChargeDelay into MuzzleDelays before the loop
      // (line 634-637); we pass it separately and add it here for the same total.
      subCycleTime += muzzleCount * muzzleDelays + muzzleCount * muzzleChargeDelay;

      if (!weapon.RackFireTogether && index !== rackCount - 1) {
        if (firingCooldown <= subCycleTime + chargeTime) {
          cycleTime +=
            subCycleTime + chargeTime + Math.max(0.1, firingCooldown - subCycleTime - chargeTime);
        } else {
          cycleTime += firingCooldown;
        }
        subCycleTime = 0;
      }
    }
  } else {
    // Teleport damage has no rack bone (line 650).
    cycleProjs = weapon.MuzzleSalvoSize || 1;
  }

  return { cycleProjs, cycleTime, subCycleTime, singleShot };
};

/** unitviewDetail.lua:620-700. */
export const calculateFiringCycle = (weapon: Weapon): FiringCycle => {
  const firingCooldown = getFiringCooldown(weapon);
  const chargeTime = getRoundedTime(weapon, 'RackSalvoChargeTime');
  const muzzleDelays = getRoundedTime(weapon, 'MuzzleSalvoDelay');
  const muzzleChargeDelay = getRoundedTime(weapon, 'MuzzleChargeDelay');
  const reloadTime = getRoundedTime(weapon, 'RackSalvoReloadTime');

  const {
    cycleProjs: rackProjs,
    cycleTime: rackCycleTime,
    subCycleTime,
    singleShot,
  } = processRackSequence(weapon, firingCooldown, chargeTime, muzzleDelays, muzzleChargeDelay);

  let cycleProjs = rackProjs;
  let cycleTime: number | null = rackCycleTime;
  if (firingCooldown <= subCycleTime + chargeTime + reloadTime) {
    cycleTime +=
      subCycleTime +
      reloadTime +
      chargeTime +
      Math.max(0.1, firingCooldown - subCycleTime - chargeTime - reloadTime);
  } else {
    cycleTime += firingCooldown;
  }

  // "Avoid saying a unit fires a salvo when it in fact has a constant rate of
  // fire" (line 693).
  if (singleShot && reloadTime === 0 && cycleProjs > 1) {
    cycleTime /= cycleProjs;
    cycleProjs = 1;
  }

  if (
    (weapon.WeaponUnpackAnimation && (weapon.NukeInnerRingDamage || weapon.ManualFire)) ||
    Number.isNaN(cycleTime)
  ) {
    cycleTime = null;
  }

  return { cycleProjs, cycleTime };
};

export const calculateDps = (weapon: Weapon, toShields = false): number | null => {
  // unitviewDetail.lua:677 skips ManualFire and Kamikaze. Teleport and
  // fire-on-death weapons have no sustained rate to speak of either.
  if (
    !weapon.RateOfFire ||
    weapon.ManualFire ||
    weapon.ForceSingleFire ||
    weapon.FireOnDeath ||
    ['Teleport', 'Kamikaze'].includes(weapon.WeaponCategory || '')
  ) {
    return null;
  }
  const cycle = weapon.firingCycle ?? calculateFiringCycle(weapon);
  if (!cycle.cycleTime) return null;
  const damage = calculateProjectileDamage(weapon, toShields);
  return (damage * cycle.cycleProjs) / cycle.cycleTime;
};
