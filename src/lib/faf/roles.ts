/**
 * A unit's battlefield role, derived from the game's own categories.
 *
 * This exists so the roster can line units up by function across factions:
 * engineers under engineers, commanders under commanders, tanks under tanks.
 * The blueprint `Description` cannot do that job, because the same role is named
 * differently per faction ("Light Tank", "Medium Tank", "Assault Bot" are all
 * the T1 direct-fire slot). Reading categories keeps this derived rather than a
 * hand-maintained list.
 *
 * Order matters: the first rule that matches wins, and the order below is also
 * the display order of the columns.
 */
export const ROLE_RULES: Array<[string, (c: Set<string>) => boolean]> = [
  ['Commander', (c) => c.has('COMMAND') || c.has('SUBCOMMANDER')],
  ['Engineer', (c) => c.has('ENGINEER') || c.has('FIELDENGINEER') || c.has('ENGINEERSTATION')],
  // The game has a SCOUT category; use it. Inferring a scout from INTELLIGENCE
  // put the UEF Lobo (which carries a radar) in the scout column while the other
  // factions' identical artillery sat under ARTY, and filed every radar and
  // sonar structure as a scout besides.
  ['Scout', (c) => c.has('SCOUT')],
  ['Transport', (c) => c.has('TRANSPORTATION')],
  // Units that do something no column above describes: the Fire Beetle's
  // one-way trip, the Mercy, the sniper bots.
  ['Special', (c) => c.has('BOMB') || c.has('SNIPER')],
  // Crossing water changes how a unit is used enough to be its own slot, and
  // it is why the Cybran and UEF T2 "tanks" are not interchangeable with a
  // Seraphim one. HOVER and AMPHIBIOUS both qualify; LAND keeps destroyers out.
  ['Amphibious', (c) => c.has('DIRECTFIRE') && c.has('LAND') && (c.has('AMPHIBIOUS') || c.has('HOVER'))],
  ['Tank', (c) => c.has('DIRECTFIRE') && c.has('TANK')],
  ['Bot', (c) => c.has('DIRECTFIRE') && c.has('BOT')],
  ['Direct fire', (c) => c.has('DIRECTFIRE')],
  ['Bomber', (c) => c.has('BOMBER')],
  ['Artillery', (c) => c.has('ARTILLERY')],
  ['Missile', (c) => c.has('SILO') || c.has('TACTICALMISSILEPLATFORM')],
  ['Anti-air', (c) => c.has('ANTIAIR')],
  ['Anti-navy', (c) => c.has('ANTINAVY')],
  ['Shield', (c) => c.has('SHIELD')],
  // Radar, sonar, omni and the counter-intel structures, which used to be
  // swept up by the old scout rule.
  [
    'Intel',
    (c) =>
      c.has('RADAR') || c.has('SONAR') || c.has('OMNI') ||
      c.has('MOBILESONAR') || c.has('COUNTERINTELLIGENCE') || c.has('STEALTHFIELD'),
  ],
];

export const ROLE_ORDER: string[] = [...ROLE_RULES.map(([name]) => name), 'Other'];

/** Column headings. A 44px column fits about seven characters, and these are
 *  the abbreviations players use anyway. */
export const ROLE_SHORT: Record<string, string> = {
  Commander: 'CMDR',
  Engineer: 'ENG',
  Scout: 'SCOUT',
  Transport: 'TRANS',
  Special: 'SPECIAL',
  Amphibious: 'AMPHIB',
  Tank: 'TANK',
  Bot: 'BOT',
  'Direct fire': 'DIRECT',
  Bomber: 'BOMB',
  Artillery: 'ARTY',
  Missile: 'MISSILE',
  'Anti-air': 'AA',
  'Anti-navy': 'A-NAVY',
  Shield: 'SHIELD',
  Intel: 'INTEL',
  Other: 'OTHER',
};

export function roleOf(categories: string[] = []): string {
  const c = new Set(categories);
  for (const [name, test] of ROLE_RULES) {
    if (test(c)) return name;
  }
  return 'Other';
}
