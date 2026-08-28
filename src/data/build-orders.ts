/**
 * An index of build order material, aggregated from where it actually lives.
 *
 * There is no one place for this. The good generic openings are in an
 * eight-year-old YouTube series, the map-specific ones are in videos and a
 * Google Doc from one month's ladder pool, and the wiki's own build-order page
 * is a stub. Collecting the references and tagging them is the useful work;
 * copying the content is not ours to do.
 *
 * Every link was opened in a browser and confirmed to load. The forum, the
 * wiki and Fandom all sit behind Cloudflare and 403 anything scripted, so a
 * dead link cannot be caught with curl — it has to be looked at.
 *
 * Signals are as read on 2026-08-27 and will drift.
 */
export type BoSource = 'YouTube' | 'FAF forum' | 'FAF wiki' | 'SupCom wiki' | 'Google Doc';
export type BoFocus = 'Opening' | 'Economy' | 'Land' | 'Air' | 'Naval' | 'Mixed';
export type BoLevel = 'New' | 'Improving' | 'Advanced';

export interface BuildOrder {
  title: string;
  url: string;
  author?: string;
  source: BoSource;
  /** "Generic" or the map it is written for. */
  scope: string;
  focus: BoFocus;
  level: BoLevel;
  year?: string;
  signal?: string;
  blurb: string;
  caveat?: string;
}

const YT = 'https://www.youtube.com/watch?v=';
const W = 'https://wiki.faforever.com/en/Play';

export const BUILD_ORDERS: BuildOrder[] = [
  // --- Generic openings -----------------------------------------------------
  {
    title: 'Generic Build Orders — FAF Tutorial 1',
    url: `${YT}_6uE1-xS2uk`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Opening',
    level: 'New',
    year: '2018',
    signal: '119k views',
    blurb: 'The most-watched build order video in the game. Openings that work anywhere, which is what you want before you start learning maps.',
    caveat: 'Eight years old. Openings have aged better than anything map-specific, but check costs against this site.',
  },
  {
    title: 'How to Eco — FAF Tutorial 6',
    url: `${YT}h-GzOhDQwA8`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Economy',
    level: 'New',
    year: '2017',
    signal: '100k views',
    blurb: 'The economy half of an opening: what to build when income, not the build order, is the constraint.',
  },
  {
    title: 'Power-Boosted Builds — FAF Tutorial 4',
    url: `${YT}x4qCcnS0TgQ`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Economy',
    level: 'Improving',
    year: '2018',
    signal: '13k views',
    blurb: 'Openings that lean on energy first. The counterpart to the mass-boosted set below.',
  },
  {
    title: 'Mass-Boosted Builds — FAF Tutorial 5',
    url: `${YT}vzmgmtBqkb8`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Economy',
    level: 'Improving',
    year: '2018',
    signal: '11k views',
    blurb: 'The mass-first openings, and when taking that side of the trade is right.',
  },
  {
    title: 'Modified Hydro Rush — FAF Tutorial 3',
    url: `${YT}FjWL8iXg6uM`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Maps with hydrocarbon',
    focus: 'Opening',
    level: 'Improving',
    year: '2018',
    signal: '10k views',
    blurb: 'Five minutes on the opening a hydrocarbon plant changes. Short, and only relevant where there is a hydro to take.',
  },
  {
    title: '3 Exotic yet Useful Build Orders — FAF Tutorial 6',
    url: `${YT}Sz5LoTgnT98`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Opening',
    level: 'Advanced',
    year: '2017',
    signal: '10k views',
    blurb: 'Openings outside the standard set, for when the standard one is being read and countered.',
  },
  {
    title: 'WTF is a Good Build Order',
    url: `${YT}OhxJvbxkPgA`,
    source: 'YouTube',
    scope: 'Generic',
    focus: 'Opening',
    level: 'New',
    blurb: 'What a build order is for, before which one to use. Start here if the concept itself is new.',
  },

  // --- Map specific ---------------------------------------------------------
  {
    title: '1v1 Seton’s Clutch Advanced Build Order',
    url: `${YT}n0roKHPk14I`,
    source: 'YouTube',
    scope: "Seton's Clutch",
    focus: 'Mixed',
    level: 'Advanced',
    year: '2026',
    blurb: 'The most recent map-specific build order I could find, on the game’s most played map.',
  },
  {
    title: 'Open Palms Build Order',
    url: `${YT}Qu4ei9ytAv8`,
    source: 'YouTube',
    scope: 'Open Palms',
    focus: 'Opening',
    level: 'Improving',
    blurb: 'A worked opening on one of the standard ladder maps.',
  },
  {
    title: 'Seton’s Clutch multiplayer strategy',
    url: "https://supcom.fandom.com/wiki/Seton's_Clutch_multiplayer_strategy",
    source: 'SupCom wiki',
    scope: "Seton's Clutch",
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'Per-slot strategy for Seton’s, which is the map where the slot decides your whole game.',
  },
  {
    title: 'Build orders for a ladder pool',
    url: 'https://forum.faforever.com/topic/2695/build-orders-for-the-may-ladder-pool',
    source: 'FAF forum',
    scope: 'Nine ladder maps',
    focus: 'Mixed',
    level: 'Advanced',
    year: '2022',
    blurb: 'Sandboxed build orders for nine maps with replay ids and cheat sheets, aimed above 1300 rating. Links out to a Google Doc.',
    caveat: 'Written for one month’s pool in 2022. Worked examples rather than a current list.',
  },

  // --- Naval ----------------------------------------------------------------
  {
    title: '5 Tips for Naval Gameplay — FAF Tutorial 12.1',
    url: `${YT}PO9UEE_XxrY`,
    author: 'Heaven aka. Penemue',
    source: 'YouTube',
    scope: 'Naval maps',
    focus: 'Naval',
    level: 'Improving',
    blurb: 'Opening and follow-up on water, where the land build orders stop applying.',
  },

  // --- Written, and maintained ---------------------------------------------
  {
    title: 'Beginner’s Guide to Forged Alliance',
    url: `${W}/Learning-SupCom/Beginners-Guide-to-Forged-Alliance`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Opening',
    level: 'New',
    blurb: 'Carries the basic build orders in writing, which is easier to follow along with than a video.',
  },
  {
    title: 'General 1v1 Guide',
    url: `${W}/Learning-SupCom/General-1v1-Guide`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'What to do after the opening: the part a build order stops telling you.',
  },
  {
    title: 'UEF 1v1 Guide',
    url: `${W}/Learning-SupCom/UEF-1v1-Guide`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'Openings by map size for UEF, which is why it keeps working when a map pool rotates.',
  },
  {
    title: 'Cybran 1v1 Guide',
    url: `${W}/Learning-SupCom/Cybran-1v1-Guide`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    year: '2025',
    blurb: 'The longest and most recently edited of the four. Openings for small, medium, naval and large maps, each with a summary.',
  },
  {
    title: 'Aeon 1v1 Guide',
    url: `${W}/Learning-SupCom/Aeon-1v1-Guide`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'Openings by map size for Aeon.',
  },
  {
    title: 'Seraphim 1v1 Guide',
    url: `${W}/Learning-SupCom/Seraphim-1v1-Guide`,
    source: 'FAF wiki',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'Openings by map size for Seraphim.',
  },
  {
    title: 'Build Orders',
    url: 'https://supcom.fandom.com/wiki/Build_Orders',
    source: 'SupCom wiki',
    scope: 'Generic',
    focus: 'Opening',
    level: 'New',
    blurb: 'Two written openings — a standard one and a Seraphim "Steamroller" — with the reasoning spelled out at beginner pace.',
  },
  {
    title: 'Ladder 1v1: beginner, intermediate and advanced topics',
    url: 'https://forum.faforever.com/topic/766/ladder-1v1-beginner-intermediate-and-advanced-topics-by-arma473',
    author: 'arma473',
    source: 'FAF forum',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Improving',
    blurb: 'A long thread organised by level, covering what to work on rather than one sequence to memorise.',
  },
  {
    title: 'Share your best build order',
    url: 'https://forums.faforever.com/viewtopic.php?f=2&t=4189',
    source: 'FAF forum',
    scope: 'Generic',
    focus: 'Opening',
    level: 'Improving',
    blurb: 'The old forum’s collection thread. Many openings, many authors, no curation.',
    caveat: 'On the read-only phpBB archive, so it is a snapshot rather than a live discussion.',
  },
  {
    title: 'Lessons from Zock',
    url: 'https://forums.faforever.com/viewtopic.php?f=62&t=17577',
    source: 'FAF forum',
    scope: 'Generic',
    focus: 'Mixed',
    level: 'Advanced',
    blurb: 'Notes taken from a top player’s games, on the old forum. Reasoning rather than sequences.',
    caveat: 'Marked a work in progress by its author, and on the read-only archive.',
  },
];
