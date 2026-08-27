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

const FORUM_BRICK_LOYALIST = {
  label: 'FAF forums: Brick vs Loyalist',
  url: 'https://forums.faforever.com/viewtopic.php?f=40&t=4069',
};

export const UNIT_NOTES: Record<string, UnitNote> = {
  // T3 land. Every figure below was checked against this patch's blueprints
  // before it was written down; the source thread quotes 1600 damage for the
  // Percival, which is a balance change out of date.
  XEL0305: {
    text:
      'Its 1450 damage a shot kills experimentals and commanders in a handful of hits, and at 34 it outranges every other T3 bot. That same shot is mostly wasted on anything small: one round overkills a T1 tank several times over.',
    source: FORUM_BRICK_LOYALIST,
    patch: '3838',
  },
  XRL0305: {
    text:
      'The 7500 health and 33 range are the point: it kites, sits behind point defence and picks up veterancy. Three Loyalists cost only a little more than one Brick (1440 to 1280) and beat it head-on even when both are microed, so the Brick wins ground rather than duels. Also carries torpedoes and anti-torpedo.',
    source: FORUM_BRICK_LOYALIST,
    patch: '3838',
  },
  URL0303: {
    text:
      'Carries a tactical missile deflector, and for the same 480 mass as a Titan it brings more health and more damage. Its 20 range is the shortest of the T3 bots, so it has to close, which its 3.8 speed lets it do.',
    source: FORUM_BRICK_LOYALIST,
    patch: '3838',
  },
  XSL0303: {
    text:
      '412 DPS at 625 a shot is the hardest hit of any T3 assault unit for its cost, and it is amphibious with torpedoes, so water is not a flank against it.',
    patch: '3838',
  },
};
