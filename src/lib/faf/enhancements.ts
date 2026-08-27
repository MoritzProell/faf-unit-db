/**
 * Commander upgrades.
 *
 * For an ACU or SCU the enhancements *are* the unit: which arm you commit to and
 * when is most of the decision. The blueprint stores them as a dict keyed by an
 * internal name, mixed in with a `Slots` layout entry and a `*Remove` action for
 * every upgrade, none of which belong on screen.
 */
import type { Unit } from './types';

export type Slot = 'LCH' | 'RCH' | 'Back';

/** Left arm, right arm, back. Display order matches the in-game panel. */
export const SLOT_ORDER: Slot[] = ['LCH', 'RCH', 'Back'];
export const SLOT_LABEL: Record<Slot, string> = {
  LCH: 'Left arm',
  RCH: 'Right arm',
  Back: 'Back',
};

/** The blueprint fields worth showing, in display order. */
const EFFECTS: Array<[string, string, (v: number) => string]> = [
  ['NewHealth', 'Health', (v) => `${v}`],
  ['AddHealth', 'Health', (v) => `+${v}`],
  ['ACUAddHealth', 'ACU health', (v) => `+${v}`],
  ['NewRegenRate', 'Regen', (v) => `${v}/s`],
  ['AddRegenRate', 'Regen', (v) => `+${v}/s`],
  ['NewBuildRate', 'Build rate', (v) => `${v}`],
  ['BonusRepairRate', 'Repair rate', (v) => `+${v}`],
  ['RegenAssistMult', 'Assist regen', (v) => `${v}x`],
  ['NewMaxRadius', 'Weapon range', (v) => `${v}`],
  ['NewRateOfFire', 'Rate of fire', (v) => `${v}`],
  ['NewDamageRadius', 'Damage radius', (v) => `${v}`],
  ['AdditionalDamage', 'Extra damage', (v) => `+${v}`],
  ['ZephyrDamageMod', 'Damage', (v) => `+${v}`],
  ['ShieldMaxHealth', 'Shield health', (v) => `${v}`],
  ['ShieldRegenRate', 'Shield regen', (v) => `${v}/s`],
  ['ShieldRechargeTime', 'Shield recharge', (v) => `${v}s`],
  ['NewVisionRadius', 'Vision', (v) => `${v}`],
  ['NewOmniRadius', 'Omni', (v) => `${v}`],
  ['NewSonarRadius', 'Sonar', (v) => `${v}`],
  ['NewJammerRadius', 'Jammer', (v) => `${v}`],
  ['ProductionPerSecondMass', 'Mass', (v) => `+${v}/s`],
  ['ProductionPerSecondEnergy', 'Energy', (v) => `+${v}/s`],
  ['MaintenanceConsumptionPerSecondEnergy', 'Upkeep', (v) => `${v} e/s`],
  ['StorageMass', 'Mass storage', (v) => `+${v}`],
  ['StorageEnergy', 'Energy storage', (v) => `+${v}`],
  ['SpeedMulti', 'Speed', (v) => `${v}x`],
];

export interface Enhancement {
  key: string;
  name: string;
  slot: Slot;
  mass: number;
  energy: number;
  buildTime: number;
  /**
   * The blueprint's `Icon` abbreviation (`aes`, `hamc`, `pqt`). This is the key
   * the game writes its own upgrade descriptions under, as `<unitId>-<icon>`.
   */
  icon?: string;
  /** Internal key of the upgrade this one replaces or requires. */
  prerequisite?: string;
  /** Unlocks building higher-tier structures. */
  unlocks?: string;
  effects: Array<{ label: string; value: string }>;
}

type Raw = Record<string, unknown>;

export function enhancementsOf(unit: Unit): Enhancement[] {
  const raw = unit.Enhancements as Record<string, Raw> | undefined;
  if (!raw) return [];

  const out: Enhancement[] = [];
  for (const [key, value] of Object.entries(raw)) {
    // `Slots` is panel layout, and every upgrade ships a `*Remove` counterpart
    // that only exists so you can sell it back.
    if (key === 'Slots' || key.endsWith('Remove')) continue;
    if (!value || typeof value !== 'object') continue;
    const slot = value.Slot as Slot | undefined;
    if (!slot) continue;

    const effects: Array<{ label: string; value: string }> = [];
    for (const [field, label, fmt] of EFFECTS) {
      const v = value[field];
      if (typeof v === 'number' && v !== 0) effects.push({ label, value: fmt(v) });
    }

    out.push({
      key,
      icon: typeof value.Icon === 'string' ? value.Icon : undefined,
      name: (value.Name as string) || key,
      slot,
      mass: (value.BuildCostMass as number) ?? 0,
      energy: (value.BuildCostEnergy as number) ?? 0,
      buildTime: (value.BuildTime as number) ?? 0,
      prerequisite: value.Prerequisite as string | undefined,
      unlocks: value.BuildableCategoryAdds as string | undefined,
      effects,
    });
  }

  // Cheapest first within a slot: that is the order you actually buy them.
  return out.sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.mass - b.mass
  );
}

export const groupBySlot = (list: Enhancement[]): Array<[Slot, Enhancement[]]> =>
  SLOT_ORDER.map((s) => [s, list.filter((e) => e.slot === s)] as [Slot, Enhancement[]]).filter(
    ([, l]) => l.length > 0
  );
