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
  /**
   * Set when every figure in the note is arithmetic on this patch's own
   * blueprints — a comparison across units that no single unit page can show,
   * rather than knowledge from outside the data. These need no source, but
   * they do go stale on a rebalance, which is what `patch` is for.
   */
  derived?: boolean;
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

  // ---------------------------------------------------------------------
  // Derived notes. Every figure below is arithmetic on this patch's own
  // blueprints, checked against them before it was written, and says
  // something a single unit page cannot: how the unit sits against the other
  // factions' answer to the same problem.
  //
  // Four candidates were dropped rather than softened. Two claimed ranges
  // that the blueprints contradict: T3 mobile anti-air does not reach 58-64
  // across the board (the Bouncer reaches 25 and the Uyanah 28), and the
  // Ithalua is not the shortest-ranged cruiser. One claimed T3 mobile AA
  // outranges gunships that sit outside flak, which is false — every gunship
  // in the game sits at 20-30 range, well inside flak's 40. One would have
  // described shield bubble behaviour, which is not in this data at all.
  // ---------------------------------------------------------------------

  // T2 land. The game's own text calls this one "lightly armored", which is
  // the only description in the set that points a player the wrong way.
  XSL0202: {
    text:
      'The game calls it lightly armored; it has the most health of any T2 tank in the game at 2500, ahead of the Rhino at 1900, the Riptide at 1800 and the Pillar at 1500. It also ties the longest reach of the T2 tanks at 26 and sits second in damage at 116.7, behind only the Obsidian.',
    derived: true,
    patch: '3838',
  },
  UEL0202: {
    text:
      'At 198 mass for 1500 health it is the cheapest T2 heavy tank and has the best health per mass of any T2 land unit, 7.6. It pays for that with the lowest damage of the four, 58.3 against 83.3, 116.7 and 120, so it holds ground rather than winning trades.',
    derived: true,
    patch: '3838',
  },
  DEL0204: {
    text:
      'Reaches 34 where every T2 tank stops at 26 or less. It is also among the most fragile T2 land units for its cost at 3.25 health per mass, against 5.6 to 7.6 for the tanks, so the range only pays while something else holds the line.',
    derived: true,
    patch: '3838',
  },
  DRL0204: {
    text:
      'The longest reach of any T2 land unit at 37, against 26 for the best of the tanks. It is also the most fragile of them for its cost at 2.75 health per mass, against 5.6 to 7.6 for the tanks it fires over, so it dies to anything that closes.',
    derived: true,
    patch: '3838',
  },

  // T2 mobile shields. Two factions get one, one gets it a tier late, one
  // never gets it at all — which is a fact about all four and lives on each.
  UEL0307: {
    text:
      'Mobile shields are not evenly handed out: UEF and Aeon get one at T2 for 220 mass, Seraphim not until T3, and Cybran never. At 3.5 speed this one is slower than the Titan at 3.8 and the Riptide at 3.7 that it is usually asked to escort, so the column it protects has to wait for it.',
    derived: true,
    patch: '3838',
  },
  UAL0307: {
    text:
      'Costs the same 220 mass as the UEF Parashield and carries 3500 shield to its 3000, and at 4.0 speed it keeps pace with everything Aeon fields where the Parashield trails its own escort. Cybran have no mobile shield at all and Seraphim wait until T3.',
    derived: true,
    patch: '3838',
  },
  XSL0307: {
    text:
      'The only T3 mobile shield in the game, and Seraphim get nothing at T2 while UEF and Aeon field one for 220 mass. It costs 720 for 10 000 shield, which is roughly three times the shield of a Parashield for three times the mass.',
    derived: true,
    patch: '3838',
  },

  // Structures.
  XEB2306: {
    text:
      'The only T3 point defence in the game; the other three factions stop at T2. For 3.7 times the mass of a UEF Triad it brings 2.9 times the health, 2.1 times the damage and 20 more range: 6500 and 261 DPS at range 70, against 2250 and 124 at 50.',
    derived: true,
    patch: '3838',
  },
  UAB4201: {
    text:
      'Every faction’s tactical missile defence costs the same 280 mass, about a third of the launcher it answers, but the Aeon one is the odd one out twice over: it covers range 24 where the others cover 31, and it has 500 health where the others have 950 to 1000. Aeon have to place them tighter and lose them faster.',
    derived: true,
    patch: '3838',
  },

  // T3 mobile artillery, all four factions.
  UEL0304: {
    text:
      'All four factions’ T3 mobile artillery costs 800 mass and reaches 90, which is further than every point defence in the game: T1 stops at 26, T2 at 50, and the UEF Ravager, the only T3, at 70. They differ mainly in blast radius, and this one sits third at 4.',
    derived: true,
    patch: '3838',
  },
  UAL0304: {
    text:
      'Range 90 for 800 mass, like every faction’s T3 mobile artillery, which outranges every point defence in the game (T2 stops at 50 and the one T3 at 70). Its blast radius of 3 is the smallest of the four, against 6 for the Trebuchet.',
    derived: true,
    patch: '3838',
  },
  URL0304: {
    text:
      'Range 90 for 800 mass, like every faction’s T3 mobile artillery, which outranges every point defence in the game. Its blast radius of 6 is the largest of the four, against 5, 4 and 3, so it is the one that punishes a clump rather than a building.',
    derived: true,
    patch: '3838',
  },
  XSL0304: {
    text:
      'Range 90 for 800 mass, like every faction’s T3 mobile artillery, which outranges every point defence in the game (T2 stops at 50 and the one T3 at 70). Its blast radius of 5 is second largest, behind the Trebuchet’s 6.',
    derived: true,
    patch: '3838',
  },

  // Air. The four T3 fighters are the same unit in four colours, which is
  // worth saying on the page rather than leaving to be noticed.
  UEA0303: {
    text:
      'The four factions’ air-superiority fighters are effectively one unit: 450 mass each, 2225 to 2300 health, 500 to 505 damage. Air control at T3 is decided by how many you have, not by which faction you are.',
    derived: true,
    patch: '3838',
  },
  UAA0303: {
    text:
      'The four factions’ air-superiority fighters are effectively one unit: 450 mass each, 2225 to 2300 health, 500 to 505 damage. Air control at T3 is decided by how many you have, not by which faction you are.',
    derived: true,
    patch: '3838',
  },
  URA0303: {
    text:
      'The four factions’ air-superiority fighters are effectively one unit: 450 mass each, 2225 to 2300 health, 500 to 505 damage. Air control at T3 is decided by how many you have, not by which faction you are.',
    derived: true,
    patch: '3838',
  },
  XSA0303: {
    text:
      'The four factions’ air-superiority fighters are effectively one unit: 450 mass each, 2225 to 2300 health, 500 to 505 damage. Air control at T3 is decided by how many you have, not by which faction you are.',
    derived: true,
    patch: '3838',
  },
  XAA0306: {
    text:
      'The only T3 torpedo bomber in the game, and Aeon-only. It does 500 DPS where all four T2 torpedo bombers do exactly 75, and costs 1650 against their 270, a little over six of them for seven times the damage.',
    derived: true,
    patch: '3838',
  },
  XSA0107: {
    text:
      'Carries 8 where the other three factions’ T1 transports carry 6, for the same 120 mass and 500 health. Planning a drop, Seraphim need fewer airframes to move the same army, and that holds at T2 as well.',
    derived: true,
    patch: '3838',
  },
  XSA0104: {
    text:
      'Carries 16 where the other T2 transports carry 10 to 12, for the same 330 mass. Two of these move what three of anyone else’s would, which is the difference between one trip and two.',
    derived: true,
    patch: '3838',
  },

  // Naval.
  UAS0203: {
    text:
      'All four T1 attack submarines cost 360 mass and reach 32, but this one does 37.5 damage where the others do 57.5 to 62.5. At identical cost it is the worst of the four in a straight exchange.',
    derived: true,
    patch: '3838',
  },
};
