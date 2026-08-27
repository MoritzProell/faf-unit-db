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

const FORUM_FIRE_BEETLE = {
  label: 'FAF forums: Fire Beetle',
  url: 'https://forum.faforever.com/topic/23/fire-beetle-balance-suggestion',
};

const FORUM_MERCY = {
  label: 'FAF forums: finding a use for the Mercy',
  url: 'https://forum.faforever.com/topic/6866/trying-to-find-a-use-for-mercy-janus-does-it-better/24',
};

const FORUM_BEST_NAVY = {
  label: 'FAF forums: what is the best navy?',
  url: 'https://forums.faforever.com/viewtopic.php?f=2&t=6323',
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
  // Unique units. The source threads compare the Beetle's blast to a tactical
  // missile's and give ratios that no longer hold: this patch has 1100 damage
  // over radius 6.5 against a TML's 6000 over radius 2, so the area is about
  // ten times larger, not six, and the single-target damage is under a fifth,
  // not half. The figures below are this patch's.
  XRL0302: {
    text:
      '1100 damage over a 6.5 radius, against a tactical missile\u2019s 6000 over 2. It is the wrong tool for one tough target and the right one for a clump. Historically an ACU snipe; the practical modern use is a transport of beetles with a mobile stealth, dropped onto mexes or power, which reaches at T2 what otherwise needs a strategic bomber.',
    source: FORUM_FIRE_BEETLE,
    patch: '3838',
  },
  DAA0206: {
    text:
      '2100 damage in a single hit, and it dies delivering it. Good for removing a T3 mex or forcing an ACU to move. The catch is that it can be shut out completely: anti-air stops a Mercy dead where a bomber will usually get something through.',
    source: FORUM_MERCY,
    patch: '3838',
  },

  // Naval. The source thread also claims the UEF Valiant is the one destroyer
  // that cannot kill submarines; the blueprint disagrees (it carries torpedoes
  // and ANTINAVY like the rest), so that claim is not repeated here.
  URS0201: {
    text:
      'The only destroyer that can climb out of the water, which makes it a shore assault unit as much as a warship: it will walk onto a beach and shoot a base that has no naval defence. Costs the same 2250 mass as the other T2 destroyers and gives up a little health for it.',
    source: FORUM_BEST_NAVY,
    patch: '3838',
  },
  XSS0201: {
    text:
      'The only destroyer that submerges. Surface-only weapons lose it entirely, so it can pick fights that other destroyers cannot break off from, and it beats frigates in a way no other destroyer does.',
    source: FORUM_BEST_NAVY,
    patch: '3838',
  },
  XSS0203: {
    text:
      'Carries anti-torpedo as well as torpedoes, which most T1 submarines do not, so it survives a torpedo exchange its counterparts lose.',
    patch: '3838',
  },
  XSL0303: {
    text:
      '412 DPS at 625 a shot is the hardest hit of any T3 assault unit for its cost, and it is amphibious with torpedoes, so water is not a flank against it.',
    patch: '3838',
  },
};
