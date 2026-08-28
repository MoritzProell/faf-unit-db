import type { Unit } from './types';
import { roleOf } from './roles';

/**
 * The words players type that the game never writes down.
 *
 * Nobody searches for "Tactical Missile Defense" — they type TMD, or terminal
 * missile defense, or anti-missile. Nobody types "Quantum Gateway" when they
 * want SACUs. The blueprint text is the game's vocabulary, not the community's,
 * and a database that only answers to the former is a database you have to
 * already know the answer to use.
 *
 * Derived from the role and categories rather than listed per unit, so a new
 * unit inherits its slot's vocabulary with no edit. British and American
 * spellings are both included on purpose: the site writes "defence" and half
 * the people searching it will type "defense".
 */

const ROLE_ALIASES: Record<string, string[]> = {
  'Missile defence': ['missile defense', 'anti missile', 'antimissile', 'interceptor'],
  'Point defence': ['pd', 'point defense', 'turret', 'tower'],
  'Anti-air': ['aa', 'anti air', 'antiair', 'flak', 'sam'],
  'Anti-navy': ['torpedo launcher', 'anti navy', 'antinavy', 'depth charge'],
  'Mass extraction': ['mex', 'mass extractor', 'extractor'],
  'Mass fabrication': ['fab', 'mass fabricator', 'fabricator'],
  Power: ['pgen', 'power generator', 'energy'],
  Storage: ['storage'],
  Gateway: ['gate', 'quantum gateway', 'sacu', 'support commander'],
  Factory: ['factory', 'hq', 'support factory'],
  Engineer: ['engie', 'engineer', 'builder'],
  Commander: ['acu', 'commander'],
  Shield: ['shield', 'bubble', 'shield generator'],
  'Shield disruptor': ['shield disruptor', 'antishield', 'shield stripper'],
  Scout: ['scout', 'recon', 'spy plane'],
  Intel: ['radar', 'sonar', 'omni', 'stealth', 'intel'],
  Optics: ['optics', 'quantum optics'],
  Sniper: ['sniper', 'sniper bot'],
  Gunship: ['gunship'],
  Bomber: ['bomber'],
  'Torpedo bomber': ['torpedo bomber', 'torp bomber'],
  Transport: ['transport', 'drop', 'dropship'],
  'Air staging': ['air staging', 'refuel', 'repair pad'],
  Artillery: ['artillery', 'arty'],
  'Experimental artillery': ['experimental artillery', 'strategic artillery', 'siege'],
  Skirmisher: ['skirmisher', 'skirm'],
  Hover: ['hover', 'amphibious'],
  'Heavy tank': ['heavy tank', 'assault'],
  'Light tank': ['light tank'],
  'Light bot': ['light bot', 'assault bot'],
  Tank: ['tank'],
  Wall: ['wall', 'wall segment'],
  Submarine: ['sub', 'submarine'],
  'Missile submarine': ['nuke sub', 'strategic missile submarine', 'missile sub'],
  Carrier: ['carrier', 'aircraft carrier'],
};

export function aliasesFor(unit: Unit): string[] {
  const role = roleOf(unit);
  const cats = new Set(unit.Categories ?? []);
  const out = new Set<string>([role.toLowerCase()]);

  for (const a of ROLE_ALIASES[role] ?? []) out.add(a);

  // The two missile roles are the ones people ask for by acronym, and which
  // acronym depends on the tier rather than the role: a T2 anti-missile
  // building is a TMD and a T3 one is an SMD.
  if (role === 'Missile defence') {
    if (unit.tech === 'T3') {
      out.add('smd');
      out.add('anti nuke');
      out.add('antinuke');
      out.add('nuke defence');
      out.add('nuke defense');
      out.add('strategic missile defense');
    } else {
      out.add('tmd');
      out.add('terminal missile defence');
      out.add('terminal missile defense');
      out.add('tactical missile defense');
    }
  }
  if (role === 'Missile') {
    if (cats.has('NUKE')) {
      out.add('nuke');
      out.add('sml');
      out.add('strategic missile launcher');
      out.add('nuke launcher');
    } else if (cats.has('TACTICALMISSILEPLATFORM')) {
      out.add('tml');
      out.add('tactical missile launcher');
    } else {
      out.add('mml');
      out.add('mobile missile launcher');
    }
  }
  if (cats.has('EXPERIMENTAL')) {
    out.add('t4');
    out.add('experimental');
  }
  if (cats.has('SUBCOMMANDER')) out.add('sacu');
  if (cats.has('AIRSTAGINGPLATFORM')) out.add('air staging');

  return [...out];
}

/** Everything a query is matched against, built once rather than per keystroke. */
export function searchTextFor(unit: Unit, extra: string[]): string {
  return [
    unit.name,
    unit.role,
    unit.type,
    unit.Id,
    unit.blurb ?? '',
    ...extra,
    ...aliasesFor(unit),
  ]
    .join(' ')
    .toLowerCase();
}
