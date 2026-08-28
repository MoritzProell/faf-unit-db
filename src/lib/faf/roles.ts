/**
 * A unit's battlefield role, derived from the game's own categories.
 *
 * This exists so the roster can line units up by function across factions.
 * The blueprint `Description` cannot do that job, because the same role is
 * named differently per faction, and the chassis categories cannot do it alone
 * either: the Mantis is a BOT and the Striker is a TANK, but they are the same
 * T1 slot and a player picking one over the other is choosing between
 * equivalents. So land direct-fire is grouped by what a unit is *for* rather
 * than what it runs on, and the navy uses the ship classes the game already
 * ships (FRIGATE, DESTROYER, CRUISER, BATTLESHIP, CARRIER, NUKESUB).
 *
 * Order matters: the first rule that matches wins, and the order below is also
 * the display order of the columns.
 */
export interface RoleInput {
  Categories?: string[];
  Description?: string;
  Economy?: { BuildCostMass?: number };
  Weapon?: Array<{ DamageToShields?: number }>;
}

/**
 * Where T3 land direct-fire splits. This patch's field is 480 (Titan,
 * Loyalist), 840 (Harbinger, Othuum) and 1280 (Percival, Brick), so the gap
 * between 480 and 840 is the natural line. Revisit it if a patch adds a T3
 * assault unit between the two.
 */
const T3_HEAVY_MASS = 700;

/** T1 light bots are 30-42 mass, T1 tanks 54-56. */
const T1_TANK_MASS = 50;

const has = (c: Set<string>, ...names: string[]) => names.some((n) => c.has(n));

export const ROLE_RULES: Array<[string, (c: Set<string>, u: RoleInput) => boolean]> = [
  ['Commander', (c) => has(c, 'COMMAND', 'SUBCOMMANDER')],
  ['Engineer', (c) => has(c, 'ENGINEER', 'FIELDENGINEER', 'ENGINEERSTATION')],
  // Experimentals are grouped the way players talk about them rather than by the
  // same rules as everything else, because at T4 the domain is the plan. These
  // run before every general rule: the Fatboy carries a shield and the Megalith
  // carries SNIPER, so either would otherwise be filed as a shield unit or a
  // sniper rather than as the experimental it is.
  ['Long range', (c) => c.has('EXPERIMENTAL') && c.has('ARTILLERY')],
  ['Experimental special', (c) => c.has('EXPERIMENTAL') && c.has('STRUCTURE')],
  ['Experimental air', (c) => c.has('EXPERIMENTAL') && c.has('AIR')],
  ['Experimental navy', (c) => c.has('EXPERIMENTAL') && c.has('NAVAL')],
  ['Experimental assault', (c) => c.has('EXPERIMENTAL')],

  ['Scout', (c) => c.has('SCOUT')],
  ['Transport', (c) => c.has('TRANSPORTATION')],
  // A shield disruptor belongs with shields: it is the unit you build because
  // of them, and nobody looking for it looks under "tank".
  [
    'Shield',
    (c, u) =>
      c.has('SHIELD') || (u.Weapon ?? []).some((w) => (w.DamageToShields ?? 0) > 0),
  ],
  ['Special', (c) => has(c, 'BOMB', 'SNIPER')],

  // Ship classes, before the generic weapon rules, so a cruiser is a cruiser
  // rather than "anti-air" and a destroyer is not filed under "direct fire".
  ['Frigate', (c) => c.has('FRIGATE')],
  ['Destroyer', (c) => c.has('DESTROYER')],
  ['Cruiser', (c) => c.has('CRUISER')],
  // The Battlecruiser carries the BATTLESHIP category, so only the name
  // separates it. Same for the Aeon Missile Ship.
  ['Battlecruiser', (c, u) => c.has('BATTLESHIP') && /battlecruiser/i.test(u.Description ?? '')],
  ['Missile ship', (c, u) => c.has('BATTLESHIP') && /missile/i.test(u.Description ?? '')],
  ['Battleship', (c) => c.has('BATTLESHIP')],
  ['Carrier', (c) => has(c, 'CARRIER', 'NAVALCARRIER')],
  ['Missile submarine', (c) => c.has('NUKESUB')],
  ['Submarine', (c) => c.has('NAVAL') && c.has('SUBMERSIBLE')],

  // Land direct-fire. Chassis is ignored: a Mantis and a Striker are the same
  // slot, and so are an Ilshavoh and a Heavy Tank.
  [
    'Light tank',
    (c, u) =>
      c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH3') &&
      (u.Economy?.BuildCostMass ?? 0) < T3_HEAVY_MASS,
  ],
  ['Heavy tank', (c) => c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH3')],
  // T1 splits by cost too: the light assault bots sit at 30-42 mass and the
  // tanks at 54-56, and they are not bought for the same reason.
  [
    'Light bot',
    (c, u) =>
      c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH1') &&
      (u.Economy?.BuildCostMass ?? 0) < T1_TANK_MASS,
  ],
  ['Tank', (c) => c.has('DIRECTFIRE') && c.has('LAND')],

  ['Direct fire', (c) => c.has('DIRECTFIRE')],

  // Air. Gunships carry no category of their own at all — not DIRECTFIRE, not
  // anything — so the only handle on them is the name the game gives them.
  // Without this they fell through to "Other", which is why a Broadsword used
  // to be listed as an unclassified threat.
  ['Gunship', (c, u) => c.has('AIR') && /gunship/i.test(u.Description ?? '')],
  ['Torpedo bomber', (c) => c.has('AIR') && c.has('BOMBER') && c.has('ANTINAVY')],
  ['Bomber', (c) => c.has('BOMBER')],
  ['Artillery', (c) => c.has('ARTILLERY')],
  ['Missile', (c) => has(c, 'SILO', 'TACTICALMISSILEPLATFORM')],
  ['Anti-air', (c) => c.has('ANTIAIR')],
  ['Anti-navy', (c) => c.has('ANTINAVY')],
  [
    'Intel',
    (c) => has(c, 'RADAR', 'SONAR', 'OMNI', 'MOBILESONAR', 'COUNTERINTELLIGENCE', 'STEALTHFIELD'),
  ],
];

export const ROLE_ORDER: string[] = [...ROLE_RULES.map(([name]) => name), 'Other'];

/** Column headings. A 44px column fits about seven characters. */
export const ROLE_SHORT: Record<string, string> = {
  Commander: 'CMDR',
  Engineer: 'ENG',
  Scout: 'SCOUT',
  Transport: 'TRANS',
  Special: 'SPECIAL',
  'Experimental air': 'T4 AIR',
  'Experimental navy': 'T4 NAVY',
  'Long range': 'LONG',
  'Experimental assault': 'ASSAULT',
  'Experimental special': 'T4 SPEC',
  Frigate: 'FRIG',
  Destroyer: 'DESTR',
  Cruiser: 'CRUIS',
  Battlecruiser: 'BCRUIS',
  'Missile ship': 'MSHIP',
  Battleship: 'BSHIP',
  Carrier: 'CARR',
  'Missile submarine': 'M-SUB',
  Submarine: 'SUB',
  'Light bot': 'LT BOT',
  'Light tank': 'LIGHT',
  'Heavy tank': 'HEAVY',
  Tank: 'TANK',
  'Direct fire': 'DIRECT',
  Gunship: 'GUNSHIP',
  'Torpedo bomber': 'TORP',
  Bomber: 'BOMB',
  Artillery: 'ARTY',
  Missile: 'MISSILE',
  'Anti-air': 'AA',
  'Anti-navy': 'A-NAVY',
  Shield: 'SHIELD',
  Intel: 'INTEL',
  Other: 'OTHER',
};

export function roleOf(unit: RoleInput | string[] = {}): string {
  // Tolerates the old categories-array call shape.
  const u: RoleInput = Array.isArray(unit) ? { Categories: unit } : unit;
  const c = new Set(u.Categories ?? []);
  for (const [name, test] of ROLE_RULES) {
    if (test(c, u)) return name;
  }
  return 'Other';
}
