import type { Weapon } from './dps';

/** Shape of a raw blueprint inside the upstream `data/index.json`. */
export interface Blueprint {
  Id: string;
  Description?: string;
  /** The in-game rollover text, from the game's own unitdescription.lua. */
  blurb?: string;
  Categories?: string[];
  StrategicIconName?: string;
  VeteranMassMult?: number;
  VeteranMass?: unknown;
  General?: { FactionName?: string; Icon?: string; UnitName?: string };
  Defense?: {
    Health?: number;
    RegenRate?: number;
    Shield?: {
      ShieldMaxHealth?: number;
      ShieldRegenRate?: number;
      ShieldRegenStartTime?: number;
      ShieldRechargeTime?: number;
      ShieldSize?: number;
      PersonalShield?: boolean;
      PersonalBubble?: boolean;
      ShieldSpillOverDamageMod?: number;
    };
  };
  Economy?: {
    BuildCostMass?: number;
    BuildCostEnergy?: number;
    BuildTime?: number;
    BuildRate?: number;
    /** Category expressions this unit can build, e.g. ['SATELLITE']. */
    BuildableCategory?: string[];
  };
  Intel?: { VisionRadius?: number; WaterVisionRadius?: number; RadarRadius?: number; SonarRadius?: number };
  Physics?: {
    MaxSpeed?: number; TurnRate?: number; BackUpDistance?: number; Elevation?: number;
    FuelUseTime?: number; FuelRechargeRate?: number;
  };
  Air?: { MaxAirspeed?: number; MinAirspeed?: number; TurnSpeed?: number };
  Display?: { Abilities?: string[] };
  Transport?: { TransportClass?: number; CanFireFromTransport?: boolean; AirClass?: boolean };
  Wreckage?: { MassMult?: number; HealthMult?: number };
  Weapon?: Weapon[];
  /** Commander upgrades, keyed by internal name. See lib/faf/enhancements.ts. */
  Enhancements?: Record<string, Record<string, unknown>>;
  SplitDamage?: unknown;
}

/** Global constants that ship alongside the units. */
export interface UnitDefaults {
  version: string;
  shieldDefaultOverspill: number;
  shieldDefaultRechargeTime: number;
  overchargeEnergyRatio: number;
  techToVetMultipliers: Record<string, number>;
  veterancyRegenBuffs: number[][];
  wreckageTechMassMults: Record<string, number>;
  wreckageWaterMult: number;
}

export type Tech = 'T1' | 'T2' | 'T3' | 'EXP';
export type Kind = 'Land' | 'Air' | 'Naval' | 'Base' | 'Unknown';
export type Faction = 'UEF' | 'Cybran' | 'Aeon' | 'Seraphim' | 'Nomads';

/** A blueprint plus everything we derive from it once, at build time. */
export interface Unit extends Blueprint {
  slug: string;
  name: string;
  faction: Faction;
  kind: Kind;
  tech: Tech;
  /** What players call the tier: T1/T2/T3/T4. */
  techLabel: 'T1' | 'T2' | 'T3' | 'T4';
  role: string;
  /** e.g. "T3 Heavy Assault Bot/Tank" — upstream's displayed type. */
  type: string;
  /** e.g. "Land", "Structures - Weapons" — the box this unit belongs in. */
  section: string;
  abilities: string[];
  health: number;
  mass: number;
  energy: number;
  buildTime: number;
  /** Health per mass, the app's headline efficiency stat. */
  hpPerMass: number;
  /** Summed DPS of every weapon in a category, keyed by the decorated category. */
  dpsByCategory: Record<string, number>;
  /** Direct-fire DPS, the number people mean by "this unit's DPS". */
  directDps: number | null;
  weapons: DecoratedWeapon[];
  wreckage: { mass: number; massInWater: number; health: number } | null;
  veterancy: { healthPerLevel: number; regenPerLevel: number; massToKillPerLevel: number } | null;
  /** False for the handful of blueprints with no unit render available. */
  hasRender: boolean;
  isCommand: boolean;
  isSub: boolean;
}

export interface DecoratedWeapon extends Weapon {
  dps: number | null;
  fullDamage: number;
  /** e.g. "1 450 damage every 4.3 s" */
  cycleText: string | null;
  category: string;
}
