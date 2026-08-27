/**
 * Curated notes on how a unit actually plays: the things the blueprints cannot
 * tell you, and that this project will not invent.
 *
 * Everything else on the site is computed from FAF's own data and can be
 * re-derived from it. This file is the one exception, so it is kept small,
 * explicit and attributed. Rules for adding to it:
 *
 *   - One or two sentences. If it needs a paragraph it belongs in a guide.
 *   - Say something the stats do not already say. "Has 4000 health" is on the
 *     page already; "dies to a single torpedo bomber run if unescorted" is not.
 *   - Give a `source` when the claim comes from somewhere: a guide, a forum
 *     post, a replay. Leave it off only for your own first-hand experience,
 *     and set `by` instead.
 *   - Balance changes. Stamp `patch` with the patch you wrote it for so a
 *     stale note is visible as stale rather than quietly wrong.
 *
 * Keyed by blueprint id, uppercase.
 */
export interface UnitNote {
  /** One or two sentences on how the unit is actually used or beaten. */
  text: string;
  /** Where the claim comes from, if it came from somewhere. */
  source?: { label: string; url?: string };
  /** Who wrote it, for first-hand notes. */
  by?: string;
  /** The patch this was written against. */
  patch: string;
}

export const UNIT_NOTES: Record<string, UnitNote> = {
  // Seeded as format examples. Add your own; the section only renders for
  // units that have one, so an empty entry costs nothing.
};
