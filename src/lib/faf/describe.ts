import type { Unit } from './types';
import { roleOf } from './roles';
import { combatDps, primaryWeapon, isAirCrash } from './dps';

/**
 * A description for the units the game never wrote one for.
 *
 * Forty units carry no usable text: the four factions' scouts and torpedo
 * launchers get a blurb that restates their own type name, and Nomads, being a
 * mod, largely never wrote `unitdescription.lua` entries at all, so thirty of
 * its units say things like "Frigate" and "Bomber" and nothing else.
 *
 * The rule for filling that gap is the rule for everything else here: derive
 * it, never invent it. Every clause below is read off the unit's own blueprint,
 * so it cannot contradict the stat block beside it and cannot go stale — a
 * rebalance moves the sentence with it. It is labelled as derived where it is
 * shown, so nobody mistakes it for the game's own words.
 */

/** "a", "a and b", "a, b and c". */
const list = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

const num = (n: number): string =>
  n >= 1000 ? n.toLocaleString('en-US').replace(/,/g, ' ') : String(Math.round(n * 10) / 10);

/** True when the game's own text is missing, or just repeats the type name. */
export function hasThinDescription(unit: Unit): boolean {
  const blurb = (unit.blurb ?? '').trim();
  if (!blurb) return true;
  const desc = (unit.Description ?? '').trim();
  if (blurb.toLowerCase() === desc.toLowerCase()) return true;
  // "Standard air scout." and "Frigate" say nothing the type name did not.
  return blurb.split(/\s+/).length <= 3;
}

export function describe(unit: Unit): string {
  const parts: string[] = [];
  const role = roleOf(unit);
  const cats = new Set(unit.Categories ?? []);
  const weapons = unit.weapons ?? [];
  const primary = primaryWeapon(weapons);
  const dps = combatDps(weapons);

  // Opening clause: what it is and what it costs.
  const domain =
    unit.kind === 'Base' ? 'structure' : unit.kind === 'Air' ? 'aircraft' : unit.kind.toLowerCase();
  parts.push(
    `${unit.techLabel} ${unit.faction} ${role.toLowerCase()}` +
      `${unit.kind === 'Base' ? '' : ` (${domain})`}, ${num(unit.mass)} mass for ${num(unit.health)} health.`
  );

  // What it does about it.
  if (dps > 0 && primary) {
    const range = primary.MaxRadius;
    parts.push(
      `${num(dps)} damage a second` +
        (range ? ` out to ${num(range)}` : '') +
        (primary.DamageRadius && primary.DamageRadius > 0
          ? `, with a ${num(primary.DamageRadius)} blast`
          : '') +
        '.'
    );
    // Falling out of the sky is not a weapon. Without this every unarmed
    // aircraft claims to deliver its damage on impact.
  } else if (weapons.some((w) => !isAirCrash(w) && (w.fullDamage ?? 0) > 0)) {
    parts.push('Its damage is delivered once rather than sustained.');
  } else {
    parts.push('Unarmed.');
  }

  // The handful of capabilities that change how it is used. Each is a category
  // on the unit, not a judgement about it.
  const traits: string[] = [];
  if (cats.has('AMPHIBIOUS')) traits.push('crosses water');
  else if (cats.has('HOVER')) traits.push('hovers');
  if (cats.has('SUBMERSIBLE')) traits.push('submerges');
  if (unit.Defense?.Shield?.ShieldMaxHealth) {
    traits.push(`carries a ${num(unit.Defense.Shield.ShieldMaxHealth)} hp shield`);
  }
  if (cats.has('STEALTHFIELD')) traits.push('projects stealth');
  else if (cats.has('STEALTH')) traits.push('is stealthed');
  // Sensors read as one clause, not three: "carries radar and sonar", never
  // "carries radar, carries sonar".
  const sensors: string[] = [];
  if (cats.has('OMNI')) sensors.push('omni');
  else if (cats.has('RADAR')) sensors.push('radar');
  if (cats.has('SONAR')) sensors.push('sonar');
  if (sensors.length) traits.push(`carries ${list(sensors)}`);
  if (cats.has('ANTIAIR') && role !== 'Anti-air') traits.push('can shoot at aircraft');
  if (cats.has('ANTINAVY') && role !== 'Anti-navy' && role !== 'Torpedo bomber') {
    traits.push('carries torpedoes');
  }
  // Comma-join when a clause already contains "and", or a destroyer reads
  // "carries radar and sonar and carries torpedoes".
  if (traits.length) {
    const shown = traits.slice(0, 3);
    const joined = shown.some((t) => t.includes(' and ')) ? shown.join(', ') : list(shown);
    parts.push(`It ${joined}.`);
  }

  return parts.join(' ');
}
