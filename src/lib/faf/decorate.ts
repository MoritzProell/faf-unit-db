/**
 * Derives everything the UI needs from a raw blueprint, once.
 *
 * Every rule here is taken from FAForever's own game source so the numbers agree
 * with what the game shows:
 *   - wreckage:  FAForever/fa lua/sim/Unit.lua, CreateWreckageProp
 *   - veterancy: FAForever/fa lua/system/blueprints-units.lua (mass thresholds)
 *                and lua/defaultcomponents.lua (regen buffs)
 *   - DPS:       see dps.ts, transliterated from lua/ui/game/unitviewDetail.lua
 */
import { calculateDps, calculateFiringCycle, calculateProjectileDamage, type Weapon } from './dps';
import { getSection, getType } from './sections';
import renderIds from '@/data/unit-images.json';

const HAS_RENDER = new Set(renderIds as string[]);
import type { Blueprint, DecoratedWeapon, Faction, Kind, Tech, Unit, UnitDefaults } from './types';

const TECH_MAP: Record<string, Tech> = {
  TECH1: 'T1',
  TECH2: 'T2',
  TECH3: 'T3',
  EXPERIMENTAL: 'EXP',
};

export const getTech = (bp: Blueprint, fallback: Tech = 'T1'): Tech =>
  TECH_MAP[(bp.Categories || []).find((c) => TECH_MAP[c]) || ''] || fallback;

export const deriveKind = (categories: string[] = []): Kind => {
  const has = (c: string) => categories.includes(c);
  // Sonar platforms carry MOBILE and NAVAL, but they are buoys an engineer
  // builds and leaves: they hold a position, they do not fight, and grouping
  // them with the fleet put a building in among the destroyers. Two of the
  // five even have structure ids (XNB, XSB).
  if (has('MOBILESONAR')) return 'Base';
  if (has('MOBILE')) {
    if (has('AIR')) return 'Air';
    if (has('NAVAL')) return 'Naval';
    return 'Land';
  }
  if (has('STRUCTURE')) return 'Base';
  return 'Unknown';
};

/** Upstream shows EXP as "T4" in its own type labels; players say T4 too. */
const TECH_LABEL: Record<Tech, 'T1' | 'T2' | 'T3' | 'T4'> = {
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  EXP: 'T4',
};

/** Slug for the unit's own page. Ids are unique; names are not. */
export const unitSlug = (bp: Blueprint): string => {
  const name = bp.General?.UnitName;
  const base = (name || bp.Description || bp.Id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${bp.Id.toLowerCase()}`;
};

/** "1 450 damage every 4.3 s" / "3 x 118 damage every 1.2 s" */
const cycleText = (w: Weapon, perProjDamage: number): string | null => {
  const cycle = w.firingCycle;
  if (!cycle || !cycle.cycleTime) return null;
  const dmg = fmtNum(round(perProjDamage, 1));
  const secs = cycle.cycleTime.toFixed(1);
  if (cycle.cycleProjs > 1) return `${cycle.cycleProjs} × ${dmg} damage every ${secs} s`;
  return `${dmg} damage every ${secs} s`;
};

export const round = (value: number, decimals = 0): number => {
  const m = 10 ** decimals;
  return Math.round((value || 0) * m) / m;
};

/** Upstream separates thousands with a narrow no-break space. */
export const fmtNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined || Number.isNaN(val)) return '–';
  const parts = val.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
};

/** Half-up to `dp`, trailing zeros trimmed: 5.625, 1.063, 5, 4.25. */
export const fmtRatio = (val: number, dp = 3): string => {
  const m = 10 ** dp;
  const r = Math.floor(Math.abs(val) * m + 0.5) / m;
  return (val < 0 ? -r : r).toString();
};

function decorateWeapons(bp: Blueprint): DecoratedWeapon[] {
  const out: DecoratedWeapon[] = [];
  for (const raw of bp.Weapon || []) {
    const w: Weapon = { ...raw };
    if (w.WeaponCategory === 'Death' && !w.FireOnDeath) w.FireOnDeath = true;
    if (w.childCount && w.childSplitType === 'onWater') w.__splitCount = w.childCount;
    if (w.WeaponCategory === 'Anti Navy') {
      w.WeaponCategory = w.isTorpedo ? 'Torpedo' : 'Depth charge';
    }
    // fire beetle: a 1-damage kamikaze that would otherwise skew its own listing
    if (bp.Id === 'XRL0302' && w.WeaponCategory === 'Kamikaze' && w.Damage === 1) w.Damage = 0;

    w.firingCycle = calculateFiringCycle(w);
    const dps = calculateDps(w, false);
    const fullDamage = calculateProjectileDamage(w, false);
    out.push({
      ...w,
      dps,
      fullDamage,
      cycleText: cycleText(w, fullDamage),
      category: w.WeaponCategory || 'Other',
    });
  }
  return out;
}

function decorateAbilities(bp: Blueprint): string[] {
  const shown = [...(bp.Display?.Abilities || [])];
  const dynamic: string[] = [];
  if (bp.Categories?.includes('SNIPEMODE') && !shown.includes('Snipemode')) dynamic.push('Snipemode');
  if (bp.Transport?.CanFireFromTransport) dynamic.push('Fires from transport');
  return [...dynamic, ...shown];
}

function wreckageOf(bp: Blueprint, tech: Tech, d: UnitDefaults) {
  if (!bp.Wreckage?.HealthMult) return null;
  const techKey = tech === 'EXP' ? 'EXPERIMENTAL' : `TECH${tech.charAt(1)}`;
  const techMult = d.wreckageTechMassMults[techKey] ?? d.wreckageTechMassMults.EXPERIMENTAL ?? 1;
  const mass = (bp.Economy?.BuildCostMass || 0) * (bp.Wreckage.MassMult || 0) * techMult;
  return {
    mass: round(mass),
    massInWater: round(mass * d.wreckageWaterMult),
    health: round((bp.Defense?.Health || 0) * (bp.Wreckage.HealthMult || 0)),
  };
}

function veterancyOf(bp: Blueprint, tech: Tech, weapons: DecoratedWeapon[], d: UnitDefaults) {
  const canVet = weapons.some(
    (w) =>
      !w.FireOnDeath &&
      !['Kamikaze', 'Death'].includes(w.WeaponCategory || '') &&
      w.Label !== 'DeathWeapon' &&
      (w.Damage || w.NukeInnerRingDamage)
  );
  if (!canVet || !bp.Defense?.Health) return null;

  const isACU = !!bp.Categories?.includes('COMMAND');
  const isSACU = !!bp.Categories?.includes('SUBCOMMANDER');

  let vetMult: number | undefined;
  if (isACU) vetMult = bp.VeteranMassMult ?? d.techToVetMultipliers.COMMAND;
  else if (isSACU) vetMult = bp.VeteranMassMult ?? d.techToVetMultipliers.SUBCOMMANDER;
  else if (tech === 'EXP') vetMult = bp.VeteranMassMult ?? d.techToVetMultipliers.EXPERIMENTAL;
  else vetMult = bp.VeteranMassMult ?? d.techToVetMultipliers[tech.replace('T', 'TECH')];

  const regenIndex = isSACU ? 3 : isACU ? 2 : tech === 'EXP' ? 4 : tech === 'T3' ? 2 : tech === 'T2' ? 1 : 0;

  return {
    healthPerLevel: round(bp.Defense.Health * 0.1),
    regenPerLevel: d.veterancyRegenBuffs?.[regenIndex]?.[0] || 0,
    massToKillPerLevel: round((vetMult || 1) * (bp.Economy?.BuildCostMass || 1)),
  };
}

export function decorateUnit(bp: Blueprint, d: UnitDefaults): Unit {
  const tech = getTech(bp);
  const weapons = decorateWeapons(bp);

  const dpsByCategory: Record<string, number> = {};
  for (const w of weapons) {
    if (w.dps === null || w.dps === undefined) continue;
    dpsByCategory[w.category] = (dpsByCategory[w.category] || 0) + w.dps;
  }

  const health = bp.Defense?.Health || 0;
  const mass = bp.Economy?.BuildCostMass || 0;
  const type = getType(bp.Id, TECH_LABEL[tech], bp.Description || '');

  return {
    ...bp,
    type,
    section: getSection(bp.Categories, tech),
    slug: unitSlug(bp),
    name: bp.General?.UnitName || bp.Description || bp.Id,
    faction: (bp.General?.FactionName || 'UEF') as Faction,
    kind: deriveKind(bp.Categories),
    tech,
    techLabel: TECH_LABEL[tech],
    role: bp.Description || 'Unknown',
    abilities: decorateAbilities(bp),
    health,
    mass,
    energy: bp.Economy?.BuildCostEnergy || 0,
    buildTime: bp.Economy?.BuildTime || 0,
    hpPerMass: mass ? health / mass : 0,
    dpsByCategory,
    directDps: dpsByCategory['Direct Fire'] ?? dpsByCategory['Direct Fire Experimental'] ?? null,
    weapons,
    wreckage: wreckageOf(bp, tech, d),
    veterancy: veterancyOf(bp, tech, weapons, d),
    hasRender: HAS_RENDER.has(bp.Id),
    isCommand: !!bp.Categories?.includes('COMMAND'),
    isSub: !!bp.Categories?.includes('SUBCOMMANDER'),
  };
}
