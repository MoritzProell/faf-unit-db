/**
 * What can shoot what, read from the blueprints rather than from opinion.
 *
 * Every weapon in FA declares exactly which layers it may fire at from which
 * layer it is standing on (`FireTargetLayerCapsTable`) and which unit
 * categories it may or may not target (`TargetRestrictOnlyAllow` /
 * `TargetRestrictDisallow`). Between those and a unit's own motion type, the
 * question "can this shoot that" has a definite answer, and so does its more
 * useful inverse: what is this unit simply safe from.
 *
 * Deliberately NOT here: any ranking of how *well* one unit counters another.
 * The blueprints give damage and reload, so a mass-efficiency ordering is easy
 * to compute and reliably wrong — it rates artillery top against everything
 * because it cannot see travel time, accuracy against a moving target, range,
 * or who dies first, and it rates a dual-purpose AA gun as a tank counter off
 * an 18 DPS pea-shooter. Legality is provable; effectiveness is a judgement,
 * and this file does not pretend otherwise.
 */
import { roleOf } from './roles';
import type { Weapon } from './dps';
import type { Unit } from './types';

export type Layer = 'Air' | 'Land' | 'Water' | 'Seabed';

export const LAYERS: Layer[] = ['Air', 'Land', 'Water', 'Seabed'];

/**
 * Where a unit physically sits, which is what a weapon's layer caps are keyed
 * on. Amphibious units and submarines legitimately occupy two.
 */
export function layersOf(unit: Unit): Layer[] {
  switch (unit.Physics?.MotionType) {
    case 'RULEUMT_Air': return ['Air'];
    case 'RULEUMT_Land': return ['Land'];
    case 'RULEUMT_Hover': return ['Land', 'Water'];
    case 'RULEUMT_Water': return ['Water'];
    case 'RULEUMT_Amphibious': return ['Land', 'Seabed'];
    case 'RULEUMT_AmphibiousFloating': return ['Land', 'Water'];
    case 'RULEUMT_SurfacingSub': return ['Water', 'Seabed'];
    // Structures do not move; a naval yard still sits on water.
    default: return unit.Categories?.includes('NAVAL') ? ['Water'] : ['Land'];
  }
}

/**
 * FA's category expression syntax, as the engine's own parser reads it: commas
 * separate alternatives, whitespace within an alternative is conjunction. So
 * `TACTICAL MISSILE` means both, and `TACTICAL,MISSILE` means either.
 */
export function matchesExpr(expr: string, categories: Set<string>): boolean {
  return expr.split(',').some((term) => {
    const parts = term.trim().split(/\s+/).filter(Boolean);
    return parts.length > 0 && parts.every((c) => categories.has(c.toUpperCase()));
  });
}

/** A weapon that can actually deal damage, as opposed to a targeting stub. */
function isLiveWeapon(w: Weapon & Record<string, unknown>): boolean {
  // Several units carry an unlabelled Damage 0 entry that exists only to drive
  // turret aiming. Counting it would make every AA unit look like a tank killer.
  if (!w.Damage || w.Damage <= 0) return false;
  if (w.WeaponCategory === 'Death') return false;
  return Boolean(w.FireTargetLayerCapsTable);
}

/** Can this weapon, fired by a unit standing on `from`, legally hit `target`? */
export function weaponCanHit(
  weapon: Weapon & Record<string, unknown>,
  from: Layer[],
  target: Unit
): boolean {
  if (!isLiveWeapon(weapon)) return false;

  const caps = weapon.FireTargetLayerCapsTable as Record<string, string> | undefined;
  if (!caps) return false;
  const targetLayers = new Set(layersOf(target));
  const reaches = from.some((layer) =>
    String(caps[layer] ?? '')
      .split('|')
      .some((t) => targetLayers.has(t.trim() as Layer))
  );
  if (!reaches) return false;

  const cats = new Set((target.Categories ?? []).map((c) => c.toUpperCase()));
  const only = weapon.TargetRestrictOnlyAllow as string | undefined;
  const not = weapon.TargetRestrictDisallow as string | undefined;
  if (only && !matchesExpr(only, cats)) return false;
  if (not && matchesExpr(not, cats)) return false;
  return true;
}

/** Can `attacker` bring any weapon to bear on `target`? */
export function canHit(attacker: Unit, target: Unit): boolean {
  const from = layersOf(attacker);
  return (attacker.Weapon ?? []).some((w) =>
    weaponCanHit(w as Weapon & Record<string, unknown>, from, target)
  );
}

export interface RoleThreat {
  role: string;
  /** How many units in this role can engage the subject without reply. */
  count: number;
  /** A few named ones, so the answer is actionable rather than a number. */
  examples: Array<{ name: string; slug: string; faction: string; techLabel: string }>;
}

export interface Engagement {
  /** Layers this unit's own weapons can reach, from where it stands. */
  reaches: Layer[];
  /** Layers a weapon must be able to reach to touch it. */
  occupies: Layer[];
  armed: boolean;
  /**
   * Roles that can engage it while it cannot engage them back. This is the
   * only "counter" claim the data actually supports, and it is the real
   * rock-paper-scissors: a tank cannot shoot at an aircraft, so every bomber
   * is a one-sided threat to it no matter how the numbers compare.
   */
  cannotAnswer: RoleThreat[];
  /** Roles where nothing at all can engage it. The non-obvious half. */
  safeFrom: string[];
}

/**
 * Roles excluded from the one-sided list. They carry defensive or incidental
 * guns — a transport's AA, an engineer platform's pop-gun — and listing a
 * Continental as a counter to a tank is technically true and useless.
 */
const NOT_A_THREAT = new Set(['Transport', 'Engineer', 'Scout']);

/** Build the engagement picture for one unit against the whole roster. */
export function engagementOf(subject: Unit, all: Unit[]): Engagement {
  const from = layersOf(subject);
  const occupies = layersOf(subject);
  const liveWeapons = (subject.Weapon ?? []).filter((w) =>
    isLiveWeapon(w as Weapon & Record<string, unknown>)
  );

  const reaches = new Set<Layer>();
  for (const w of liveWeapons) {
    const caps = (w as Record<string, unknown>).FireTargetLayerCapsTable as
      | Record<string, string>
      | undefined;
    if (!caps) continue;
    for (const layer of from) {
      for (const t of String(caps[layer] ?? '').split('|')) {
        const v = t.trim();
        if ((LAYERS as string[]).includes(v)) reaches.add(v as Layer);
      }
    }
  }

  const byRole = new Map<string, RoleThreat>();
  const engagingRoles = new Set<string>();

  for (const other of all) {
    if (other.Id === subject.Id) continue;
    if (!canHit(other, subject)) continue;

    const role = roleOf(other.Categories);
    engagingRoles.add(role);
    if (NOT_A_THREAT.has(role)) continue;
    if (canHit(subject, other)) continue;

    let entry = byRole.get(role);
    if (!entry) {
      entry = { role, count: 0, examples: [] };
      byRole.set(role, entry);
    }
    entry.count++;
    entry.examples.push({
      name: other.name,
      slug: other.slug,
      faction: other.faction,
      techLabel: other.techLabel,
    });
  }

  for (const entry of byRole.values()) {
    entry.examples.sort((a, b) => a.name.localeCompare(b.name));
    entry.examples = entry.examples.slice(0, 5);
  }

  // Only roles that actually field something armed can be "safe from"; a role
  // with no weapons anywhere would otherwise read as a reassuring absence.
  const armedRoles = new Set(
    all
      .filter((u) => (u.Weapon ?? []).some((w) => isLiveWeapon(w as Weapon & Record<string, unknown>)))
      .map((u) => roleOf(u.Categories))
  );

  return {
    reaches: LAYERS.filter((l) => reaches.has(l)),
    occupies,
    armed: liveWeapons.length > 0,
    cannotAnswer: [...byRole.values()].sort((a, b) => b.count - a.count),
    safeFrom: [...armedRoles].filter((r) => !engagingRoles.has(r) && !NOT_A_THREAT.has(r)).sort(),
  };
}
