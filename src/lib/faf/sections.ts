/**
 * Section taxonomy, derived from the game's own categories rather than a
 * hand-written list.
 *
 * Structures carry the build-menu group the game itself sorts them into
 * (SORTCONSTRUCTION / SORTDEFENSE / SORTECONOMY / SORTINTEL / SORTSTRATEGIC).
 * Mobile units carry their domain (LAND / AIR / NAVAL). Experimentals are split
 * out because that is how players think about them.
 *
 * Because it reads categories, a unit added in a future patch lands in the right
 * box with no edit here.
 */

/** Display order of the section boxes. */
export const SECTION_ORDER: string[] = [
  'Land',
  'Air',
  'Naval',
  'Experimental',
  'Structures - Construction',
  'Structures - Defence',
  'Structures - Intelligence',
  'Structures - Economy',
  'Structures - Strategic',
  'Structures - Other',
];

/** The game's structure build-menu tabs, in its own vocabulary. */
const SORT_TO_SECTION: Array<[string, string]> = [
  ['SORTCONSTRUCTION', 'Structures - Construction'],
  ['SORTDEFENSE', 'Structures - Defence'],
  ['SORTINTEL', 'Structures - Intelligence'],
  ['SORTECONOMY', 'Structures - Economy'],
  ['SORTSTRATEGIC', 'Structures - Strategic'],
];

/**
 * A unit's displayed type: its tier and what the blueprint calls it.
 * e.g. "T3 Armored Assault Bot".
 */
export function getType(_id: string, techLabel: string, description: string): string {
  return `${techLabel} ${description || 'Unknown'}`.trim();
}

export function getSection(categories: string[] = [], tech?: string): string {
  const has = (c: string) => categories.includes(c);

  if (tech === 'EXP' || has('EXPERIMENTAL')) return 'Experimental';

  if (has('STRUCTURE')) {
    for (const [cat, section] of SORT_TO_SECTION) {
      if (has(cat)) return section;
    }
    return 'Structures - Other';
  }

  if (has('AIR')) return 'Air';
  if (has('NAVAL')) return 'Naval';
  if (has('LAND')) return 'Land';
  return 'Structures - Other';
}
