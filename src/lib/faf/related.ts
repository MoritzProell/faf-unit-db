import type { Unit } from './types';

/**
 * Links a unit to the units it builds, where that relationship is narrow enough
 * to be meaningful.
 *
 * The Novax Center has `Economy.BuildableCategory: ['SATELLITE']` and the Defense
 * Satellite carries `SATELLITE`, so the pair is derivable rather than a
 * hand-written special case. Factories declare buildable categories too, which
 * is why anything resolving to more than a handful of units is ignored: a land
 * factory "building" 90 units is not a relationship worth showing.
 */
const MAX_CHILDREN = 4;

export function buildRelations(units: Unit[]): Map<string, string[]> {
  const children = new Map<string, string[]>();

  for (const parent of units) {
    const wanted = parent.Economy?.BuildableCategory;
    if (!Array.isArray(wanted) || wanted.length === 0) continue;

    // A blueprint's BuildableCategory entries can be space-joined conjunctions.
    const matches = units.filter((u) => {
      if (u.Id === parent.Id) return false;
      return wanted.some((expr) =>
        String(expr)
          .split(/\s+/)
          .filter(Boolean)
          .every((token) => u.Categories?.includes(token))
      );
    });

    if (matches.length > 0 && matches.length <= MAX_CHILDREN) {
      children.set(parent.Id, matches.map((u) => u.Id));
    }
  }

  return children;
}
