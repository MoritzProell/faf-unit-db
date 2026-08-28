import { ROLE_ORDER } from './roles';

/**
 * The order the role columns are read in, per section.
 *
 * ROLE_ORDER is the order the rules happen to be written in, which is a
 * derivation detail. This is the order a player reads a tier in, which is a
 * different thing and worth stating separately: commander and engineers first
 * because that is what you build first, then the line units heaviest to
 * lightest, then the support that stands behind them, then the oddities.
 *
 * Anything not listed for a section falls to the end in ROLE_ORDER order, so a
 * new role appears rather than vanishing.
 */
const SECTION_COLUMNS: Record<string, string[]> = {
  Land: [
    'Commander',
    'Engineer',
    // The line: heaviest first, then the lighter chassis, then the bots that
    // sit behind them.
    'Heavy tank',
    'Tank',
    'Skirmisher',
    'Hover',
    'Light bot',
    'Artillery',
    'Anti-air',
    'Scout',
    'Shield',
    'Shield disruptor',
    'Missile',
    'Sniper',
    'Special',
    'Stealth',
    'Radar',
    'Sonar',
    'Omni',
    'Intel',
  ],
  Air: [
    'Scout',
    // At T1 and T3 this column is the fighters; at T2 it is the
    // fighter/bombers, which the game files as bombers. Either way it is the
    // thing that contests the air, and it reads before the things that use it.
    'Anti-air',
    'Bomber',
    'Torpedo bomber',
    'Gunship',
    'Transport',
    'Special',
    'Radar',
    'Omni',
    'Intel',
  ],
  Naval: [
    'Frigate',
    'Destroyer',
    'Cruiser',
    'Battleship',
    'Battlecruiser',
    'Missile ship',
    'Carrier',
    'Submarine',
    'Missile submarine',
    'Anti-navy',
    'Anti-air',
    'Shield',
    'Stealth',
    'Sonar',
    'Radar',
    'Intel',
  ],
  // Radar, then stealth, then sonar: the order they are built in, and the
  // order the tier offers them. Omni arrives at T3 and replaces the radar.
  'Structures - Intelligence': ['Radar', 'Stealth', 'Omni', 'Sonar', 'Optics', 'Intel'],
  Experimental: [
    'Experimental assault',
    'Long range',
    'Experimental artillery',
    'Experimental air',
    'Experimental navy',
    'Experimental special',
  ],
};

/**
 * Columns for one tier, in reading order.
 *
 * Two rules, in this order:
 *
 *  1. A column only one faction can fill goes to the right. These are the
 *     genuinely unique units — the Fire Beetle, the Deceiver, the Ravager —
 *     and left in place they open a gap in every other faction's row, so the
 *     dense columns stop lining up with each other. Pushed to the end, the
 *     comparable units sit together and the singletons read as what they are.
 *  2. Otherwise the section's own reading order.
 */
export function orderedRoles(
  section: string,
  roles: string[],
  countFactions: (role: string) => number
): string[] {
  const curated = SECTION_COLUMNS[section] ?? [];
  const rank = (r: string) => {
    const i = curated.indexOf(r);
    return i >= 0 ? i : curated.length + Math.max(0, ROLE_ORDER.indexOf(r));
  };
  return [...roles].sort((a, b) => {
    const aUnique = countFactions(a) <= 1;
    const bUnique = countFactions(b) <= 1;
    if (aUnique !== bUnique) return aUnique ? 1 : -1;
    return rank(a) - rank(b);
  });
}
