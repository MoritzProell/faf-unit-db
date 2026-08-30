/**
 * Build orders, as sequences rather than links.
 *
 * Everything here is transcribed from a source that states the sequence
 * outright. That is a short list. The generic openings are written down on the
 * FAF wiki and have been stable for years; the map-specific ones that players
 * actually ask about — Seton's by slot, Dual Gap, team positions — live almost
 * entirely in YouTube guides, and a build order reconstructed from memory of a
 * video is a build order with invented steps in it. Those keep their links in
 * `build-orders.ts` until someone who plays them writes the sequence down.
 *
 * Units are named by the last four characters of their blueprint id, which is
 * the same across all four factions: B0101 is the land factory whether you are
 * UEF or Seraphim. So an order is written once and it picks up a new patch's
 * numbers for free.
 *
 * There is no faction to pick. Every building an opening touches — land, air
 * and naval factories, power generator, hydrocarbon plant, extractor, engineer,
 * ACU — is identical in all four factions down to the last build point, so a
 * faction selector was four buttons that changed the artwork and nothing else.
 * Checked, not assumed; if a patch ever splits them this needs revisiting.
 */

export type MapSize = '5x5' | '10x10' | '20x20';

/**
 * Reclaim, as three assumptions rather than three measurements.
 *
 * What a map's rocks and wrecks are worth is a property of the map, and map
 * props are not in the unit blueprints, so there is nothing here to derive a
 * figure from. Publishing "high reclaim is 15 mass a second" as a fact would be
 * inventing one. What the model can honestly do is take the number and show
 * what it buys, so these are round, labelled as assumptions on the page, and
 * the reader dials them to the map in front of them.
 *
 * Lives here rather than beside the component that draws the buttons because
 * the page runs the simulation on the server: exported from a 'use client'
 * module, the server import resolves to a client reference and the build fails
 * on trying to iterate it.
 */
export const RECLAIM_LEVELS = [
  { key: 'none', label: 'None', perSecond: 0 },
  { key: 'low', label: 'Low', perSecond: 5 },
  { key: 'high', label: 'High', perSecond: 15 },
] as const;

export interface OpeningStep {
  /** Blueprint id suffix, e.g. 'B0101'. Omitted for steps that build nothing. */
  unit?: string;
  count?: number;
  /** Shown instead of a unit name when there is nothing to build. */
  action?: string;
  /**
   * Lend this lane's build power to another lane's current job instead of
   * building. Held until that job finishes.
   */
  assist?: string;
  note?: string;
}

export interface OpeningLane {
  key: string;
  label: string;
  /**
   * Blueprint id suffix whose completion starts this lane.
   *
   * A factory cannot produce anything until it exists, and an air factory built
   * two minutes in starts two minutes in. Naming the building rather than
   * hardcoding "the first factory" is what lets an opening have more than one
   * production line.
   */
  after?: string;
  /**
   * Simulated against the shared economy when true. Only lanes whose source
   * gives an actual sequence are; the rest are guidance and say so.
   */
  timed: boolean;
  steps: OpeningStep[];
  /** Free text for lanes the source describes rather than specifies. */
  advice?: string[];
}

export interface Opening {
  id: string;
  title: string;
  summary: string;
  /** The map this is written for, or 'Generic'. Drives the first pick. */
  map: string;
  /** Only makes sense on the largest maps, and is only offered there. */
  only20x20?: boolean;
  /** Which branch of the picker leads here. */
  secondFactory: 'land' | 'air';
  /**
   * Only offered when reclaim is set to high.
   *
   * Heavy reclaim does not merely make the same build faster, it changes what
   * the build is: the mass pays for engineers to stand on the ACU instead of
   * walking off to expand, and for the extra generators that assist needs.
   */
  forReclaim?: 'high';
  hydro: boolean;
  source: { label: string; url: string; edited?: string };
  /** A second guide teaching the same opening, for a reader who wants it in prose. */
  alsoSee?: { label: string; url: string; edited?: string };
  acu: OpeningStep[];
  lanes: OpeningLane[];
  /** What the first factory should be making, by map size. */
  factoryQueue: Record<MapSize, string>;
  caveat?: string;
}

const WIKI_BEGINNER = {
  label: "FAF wiki, Beginner's Guide to Forged Alliance Forever",
  url: 'https://wiki.faforever.com/en/Play/Learning-SupCom/Beginners-Guide-to-Forged-Alliance',
  edited: '2025-04-24',
};

/**
 * Heaven's tutorials, transcribed from the videos themselves.
 *
 * These are the most-watched build order guides in the game and they give
 * sequences the wiki does not: where the wiki says "2 pgens, 4 mexes, 3 pgens",
 * the video interleaves them and says why. Only the sequence is taken — what to
 * build and in what order, which is a fact about the game — and every timing on
 * the page is computed here rather than repeated from the video.
 *
 * One of his claims is a direct check on this simulator. He says a land factory
 * takes one engineer 60 seconds and two engineers 30; the blueprint is 300
 * build points and a T1 engineer is 5 build power, so 60 and 30 is what the
 * arithmetic gives. A power generator at 25 seconds from one engineer is 125
 * over 5. The model and the guide agree without either being fitted to the
 * other.
 */
const HEAVEN_GENERIC = {
  label: 'Heaven, Generic Build Orders (FAF Tutorial 1)',
  url: 'https://www.youtube.com/watch?v=_6uE1-xS2uk',
  edited: '2018',
};

/**
 * A guide that walks through a top player's game on one slot of one map.
 *
 * Most Seton's material is live commentary, which cannot be transcribed into a
 * sequence without inventing the parts the player never says out loud. This one
 * states its build outright and tells you to memorise it, which is the bar for
 * appearing here.
 */
/**
 * The reclaim-heavy builds, where engineers assist rather than expand.
 *
 * The map-specific build in this one is not transcribed — it is written for a
 * single map by a single player — but the principle it states is general and is
 * what the high-reclaim variants below are built on: two engineers assisting
 * the ACU is a dual assist, and a dual assist wants one extra power generator
 * for each engineer doing the assisting, which the reclaim is what pays for.
 */
const HEAVEN_MASS = {
  label: 'Heaven, Mass-Boosted Builds (FAF Tutorial 5)',
  url: 'https://www.youtube.com/watch?v=vzmgmtBqkb8',
  edited: '2018',
};

const SETONS_BEACH = {
  label: 'Supcom FA: how to play Setons, beach spot build order',
  url: 'https://www.youtube.com/watch?v=_gxnEqorJ94',
};

const HEAVEN_HYDRO = {
  label: 'Heaven, Modified Hydro Rush (FAF Tutorial 3)',
  url: 'https://www.youtube.com/watch?v=FjWL8iXg6uM',
  edited: '2018',
};

/**
 * The opening every non-hydro build in the video shares.
 *
 * One land factory, four power generators and four extractors, but interleaved
 * rather than grouped: two generators, two extractors, a generator, two
 * extractors, a generator. The video is explicit that the order matters,
 * because it keeps the economy balanced and spends the starting resources well
 * rather than sinking them into one kind of thing first. The reserve column on
 * the page is where you can watch that happen.
 */
const HEAVEN_OPENING: OpeningStep[] = [
  { unit: 'B0101', note: 'The first factory. Land or air; land is the default.' },
  { unit: 'B1101', count: 2, note: 'Adjacent to the factory for the adjacency bonus.' },
  { unit: 'B1103', count: 2 },
  { unit: 'B1101' },
  { unit: 'B1103', count: 2, note: 'Four extractors in total, on the mass points closest to your spawn.' },
  { unit: 'B1101', note: 'Four generators in total. This is what runs the factory and the first engineers.' },
];

/**
 * What comes off the air factory, and when.
 *
 * Worth simulating precisely because T1 air is the one part of the roster where
 * all four factions cost exactly the same: scout 40 mass, interceptor 50,
 * bomber 90, and 500 build points for either of the last two. T1 land is not —
 * scouts and tanks differ by faction — so the land factory's combat output is
 * given as guidance rather than a clock.
 */
const AIR_OUTPUT: OpeningLane = {
  key: 'airfactory',
  label: 'Air factory',
  timed: true,
  after: 'B0102',
  steps: [
    {
      unit: 'A0101',
      note: 'The scout first. Knowing what your opponent is building is most of what an early air factory is for.',
    },
    {
      unit: 'A0102',
      note: 'An interceptor if you expect enemy air, a bomber if you would rather be the one attacking. Both are 500 build points, so whichever you pick arrives at this same moment; only the cost differs, 50 mass against 90.',
    },
  ],
};

/** Engineer roles the video gives for the generic builds. */
const LAND_OUTPUT =
  'One scout, then tanks. This is the one place the factions genuinely differ: T1 land scouts and tanks are not the same cost in each, so the factory has no single clock the way the air factory does.';

const HEAVEN_ENGINEERS = [
  LAND_OUTPUT,
  'Two engineers on factories, one on power generators. A land factory is 60 seconds for one engineer and 30 for two; a generator is 25 seconds for one. So the pair finishing a factory and the single finishing a generator land together, and the economy stays balanced on its own.',
  'Expand along linear routes rather than jumping between mass points, picking up reclaim on the way, and queue something for the engineer to do when it runs out of expansion.',
];

/**
 * What the first factory builds, by map size.
 *
 * From the FAF wiki's General 1v1 Guide, which ties the queue to the map rather
 * than to the opening: the bigger the map, the more of the first factory goes
 * on engineers, because there is more ground to take and the fighting starts
 * later. The same three lines apply to all three openings below.
 */
const FACTORY_QUEUE: Record<MapSize, string> = {
  '5x5':
    'Some early engineers and units, then mostly tanks. Every mex matters and map control decides it, so the factory keeps making army.',
  '10x10':
    'More early engineers plus a few units, then the factory can go over to engineers once later factories cover the army.',
  '20x20':
    'Engineers only. Combat units come from the factories you build later; this one is here to take ground.',
};

export const OPENINGS: Opening[] = [
  {
    id: 'triple-land',
    title: 'Triple land',
    map: 'Generic',
    summary:
      'Three land factories before the ACU leaves the base. The straightforward opening: everything goes into putting tanks on the ground and taking your half of the map.',
    secondFactory: 'land',
    hydro: false,
    source: HEAVEN_GENERIC,
    alsoSee: WIKI_BEGINNER,
    acu: [
      ...HEAVEN_OPENING,
      { unit: 'B1101', note: 'One extra generator for each extra land factory. A land factory draws about 25 energy a second and a T1 generator makes 20, so it is close to one for one.' },
      { unit: 'B0101' },
      { unit: 'B1101' },
      { unit: 'B0101' },
      {
        action: 'Leave the base',
        note: 'The ACU is worth about twenty T1 tanks in the field and about two engineers in the base. That is not really a choice.',
      },
    ],
    lanes: [
      {
        key: 'factory',
        label: 'First factory',
        timed: true,
        steps: [{ unit: 'L0105', count: 3, note: 'Engineers before any combat units.' }],
      },
      { key: 'engineers', label: 'What the engineers do', timed: false, steps: [], advice: HEAVEN_ENGINEERS },
    ],
    factoryQueue: FACTORY_QUEUE,
    caveat:
      'The wiki teaches a two-factory version of the same shape, which is a gentler place to start. Everything below the second factory is identical.',
  },
  {
    id: 'third-air',
    title: 'Third air',
    map: 'Generic',
    summary:
      'Land, land, then air. The air factory is the third factory, which buys bombers, interceptors and above all the scouts that tell you what your opponent is doing.',
    secondFactory: 'air',
    hydro: false,
    source: HEAVEN_GENERIC,
    alsoSee: WIKI_BEGINNER,
    acu: [
      ...HEAVEN_OPENING,
      { unit: 'B1101', note: 'The generator that runs the second land factory.' },
      { unit: 'B0101' },
      { unit: 'B0102' },
      {
        unit: 'B1101',
        count: 4,
        note: 'Four generators per air factory. Three is enough if it will only ever make bombers, but scouts and interceptors need the fourth.',
      },
      { action: 'Leave the base' },
    ],
    lanes: [
      {
        key: 'factory',
        label: 'First factory',
        timed: true,
        steps: [{ unit: 'L0105', count: 3 }],
      },
      AIR_OUTPUT,
      { key: 'engineers', label: 'What the engineers do', timed: false, steps: [], advice: HEAVEN_ENGINEERS },
    ],
    factoryQueue: FACTORY_QUEUE,
  },
  {
    id: 'hydro-rush',
    title: 'Hydro rush',
    map: 'Generic',
    summary:
      'Take the hydrocarbon plant whenever there is one. It is far more energy per mass than generators, so the ACU can skip them almost entirely and spend on extractors instead.',
    secondFactory: 'air',
    hydro: true,
    source: HEAVEN_HYDRO,
    alsoSee: WIKI_BEGINNER,
    acu: [
      { unit: 'B0101' },
      { unit: 'B1103', count: 4, note: 'No power generators at all. The hydro covers it.' },
      {
        action: 'Assist the hydrocarbon plant',
        assist: 'engie1',
        note: 'One T1 engineer alone is 80 seconds on a hydro. This is why it gets help, and it is the whole reason the opening works.',
      },
      { action: 'Leave the base' },
    ],
    lanes: [
      {
        key: 'factory',
        label: 'First factory',
        timed: true,
        steps: [{ unit: 'L0105', count: 3 }],
      },
      {
        key: 'engie1',
        label: '1st engineer',
        timed: true,
        steps: [
          { unit: 'B1102', note: 'Straight to the hydrocarbon plant.' },
          { unit: 'B1101', count: 2 },
          { unit: 'B0102', note: 'Air factory, placed against the hydro for the adjacency bonus.' },
        ],
      },
      {
        key: 'engie2',
        label: '2nd engineer',
        timed: true,
        steps: [{ action: 'Assist the hydrocarbon plant', assist: 'engie1' }],
      },
      AIR_OUTPUT,
      {
        key: 'engineers',
        label: 'If the hydro is far away',
        timed: false,
        steps: [],
        advice: [
          'The standard version power stalls when the deposit is a long walk. Build one generator and three extractors with the ACU instead, and let the first engineer take the fourth extractor on its way to the hydro.',
          'If the ACU has to leave early, it can build the four extractors and go: the first engineer starts the hydro alone and the second and third assist it immediately.',
          'A hydro near your spawn is not always worth rushing. On an exposed spot it dies, and heavy nearby reclaim can be the better thing to build around.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
  },
  {
    id: 'triple-land-assist',
    title: 'Triple land, dual assist',
    map: 'Generic',
    forReclaim: 'high',
    summary:
      'The same three factories, but two engineers stand on the ACU instead of walking off to expand. Reclaim is what makes it work: the mass has to come from somewhere, and rocks and wrecks near your spawn are it.',
    secondFactory: 'land',
    hydro: false,
    source: HEAVEN_MASS,
    acu: [
      ...HEAVEN_OPENING,
      { unit: 'B1101', note: 'One generator per extra land factory, as usual.' },
      { unit: 'B0101' },
      { unit: 'B1101' },
      { unit: 'B0101' },
      {
        unit: 'B1101',
        count: 2,
        note: 'And one more for each engineer assisting. Two assistants means two extra generators: build power you have added has to be paid for in energy as well as mass.',
      },
      { action: 'Leave the base' },
    ],
    lanes: [
      { key: 'factory', label: 'First factory', timed: true, steps: [{ unit: 'L0105', count: 4 }] },
      {
        key: 'engie2',
        label: '2nd engineer',
        timed: true,
        steps: [{ action: 'Assist the ACU', assist: 'acu' }],
      },
      {
        key: 'engie4',
        label: '4th engineer',
        timed: true,
        steps: [{ action: 'Assist the ACU', assist: 'acu' }],
      },
      {
        key: 'engineers',
        label: 'The other engineers',
        timed: false,
        steps: [],
        advice: [
          LAND_OUTPUT,
          '1st and 3rd: out to the reclaim. Rocks and any wreckage near your spawn, picked up on the way to a mass point rather than as a trip of its own.',
          'The pattern is alternating: one engineer reclaims, the next assists, and so on. The reclaimers pay for the assistants.',
          'Everything after that expands, escorted. An unescorted engineer on an expansion is a gift.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
    caveat:
      'The source builds this on one map where the reclaim is unusually safe to take. The dual-assist principle is stated generally; how much reclaim your map actually has is the thing to check before committing to it.',
  },
  {
    id: 'third-air-assist',
    title: 'Third air, dual assist',
    map: 'Generic',
    forReclaim: 'high',
    summary:
      'Land, land, air, with two engineers assisting the ACU throughout. The air factory lands considerably earlier than it does off the standard build, which is the point.',
    secondFactory: 'air',
    hydro: false,
    source: HEAVEN_MASS,
    acu: [
      ...HEAVEN_OPENING,
      { unit: 'B1101' },
      { unit: 'B0101' },
      { unit: 'B0102' },
      {
        unit: 'B1101',
        count: 6,
        note: 'Four for the air factory, and one each for the two assisting engineers.',
      },
      { action: 'Leave the base' },
    ],
    lanes: [
      { key: 'factory', label: 'First factory', timed: true, steps: [{ unit: 'L0105', count: 4 }] },
      { key: 'engie2', label: '2nd engineer', timed: true, steps: [{ action: 'Assist the ACU', assist: 'acu' }] },
      { key: 'engie4', label: '4th engineer', timed: true, steps: [{ action: 'Assist the ACU', assist: 'acu' }] },
      AIR_OUTPUT,
      {
        key: 'engineers',
        label: 'The other engineers',
        timed: false,
        steps: [],
        advice: [
          LAND_OUTPUT,
          '1st and 3rd: out to the reclaim, picked up on the way to a mass point.',
          'One reclaims, the next assists, alternating. The reclaimers pay for the assistants.',
          'Everything after that expands, escorted.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
  },
  {
    id: 'transport',
    title: 'Assisted second air transport',
    map: 'Generic',
    only20x20: true,
    summary:
      'The 20x20 opening. On a big or water-heavy map you cannot walk to enough mass in time, so the whole build is bent toward getting a transport up and dropping engineers onto the ground you could not otherwise reach.',
    secondFactory: 'air',
    hydro: false,
    source: HEAVEN_GENERIC,
    acu: [
      { unit: 'B0101' },
      {
        unit: 'B1101',
        count: 3,
        note: 'Three rather than two. The first engineer is off building extractors instead of waiting, so it starts drawing power sooner than usual and the third generator has to be there before it does.',
      },
      { unit: 'B1103', count: 2, note: 'Only two from the ACU. On a map with the core mass spread out, walking to all four costs more than it returns.' },
      { unit: 'B1101' },
      { unit: 'B0102' },
      {
        unit: 'B1101',
        count: 8,
        note: 'Twelve generators in total. A transport draws more power than any other T1 air unit, and it is slow enough that you want engineers assisting it, which costs power again. Nine to twelve is the range; the exact figure depends on how much assist you put on it.',
      },
      { action: 'Leave the base' },
    ],
    lanes: [
      { key: 'factory', label: 'First factory', timed: true, steps: [{ unit: 'L0105', count: 6 }] },
      {
        key: 'engie1',
        label: '1st engineer',
        timed: true,
        steps: [{ unit: 'B1103', count: 2, note: 'The other two core extractors, the ones the ACU would have had to walk to.' }],
      },
      {
        key: 'airfactory',
        label: 'Air factory',
        timed: true,
        after: 'B0102',
        steps: [{ unit: 'A0107', note: 'The transport. 800 build points, so it is slow on its own, which is what the assisting engineers are for.' }],
      },
      { key: 'engie5', label: '5th engineer', timed: true, steps: [{ action: 'Assist the air factory', assist: 'airfactory' }] },
      { key: 'engie6', label: '6th engineer', timed: true, steps: [{ action: 'Assist the air factory', assist: 'airfactory' }] },
      {
        key: 'engineers',
        label: 'Where the engineers go',
        timed: false,
        steps: [],
        advice: [
          'The first four expand. Spread them across separate routes and keep each route linear rather than criss-crossing, so no engineer spends its early minutes walking; pick up reclaim along the way and queue something for them to do when the expansion runs out.',
          'Every engineer after the fourth assists the air factory. Two are simulated above; more is faster, and more is also why the generator count is what it is.',
          'If you start to power stall, take engineers off the factory until it is stable rather than letting everything slow down at once. Park them where the transport can pick them up.',
          'The transport drops its engineers in separate places so several extractors go up at once. The ACU stays behind and keeps building generators.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
    caveat:
      'Written for a 20x20 naval map, where an island is the expansion. It is the same idea on a big land map, and the pgen count is the part to adjust: more assist on the transport means more power.',
  },
  {
    id: 'setons-beach',
    title: "Seton's Clutch, beach",
    map: "Seton's Clutch",
    summary:
      'The beach slot, second air off the hydro. An exposed spot that gets its navy going earlier than the rock does, so the build is about being up and running before anyone can punish you for standing there.',
    secondFactory: 'air',
    hydro: true,
    source: SETONS_BEACH,
    acu: [
      { unit: 'B0101', note: 'Factory first, always.' },
      {
        unit: 'B1101',
        count: 3,
        note: 'Three, or four if you want the air factory sooner. The guide gives both.',
      },
      { unit: 'B1103', count: 2 },
      {
        action: 'Walk to the hydro and assist',
        assist: 'engie1',
        note: 'The ACU goes over and helps rather than building it itself.',
      },
      { unit: 'B0102', note: 'The air factory, once the hydro is up.' },
      { unit: 'B1101', count: 4 },
    ],
    lanes: [
      { key: 'factory', label: 'First factory', timed: true, steps: [{ unit: 'L0105', count: 4 }] },
      {
        key: 'engie1',
        label: '1st engineer',
        timed: true,
        steps: [
          { action: 'Assist the ACU', assist: 'acu', note: 'On the generators, until they are done.' },
          { unit: 'B1102', note: 'Then straight to the hydrocarbon plant.' },
        ],
      },
      AIR_OUTPUT,
      {
        key: 'engineers',
        label: 'Where the other engineers go',
        timed: false,
        steps: [],
        advice: [
          '2nd: up to the three exposed mass points, then a factory and a radar there. Getting a factory into that spot is most of what makes the slot safe; arriving late without one is what makes it dangerous.',
          '3rd and 4th: the remaining extractors.',
          'The rest: patrol on the trees. Tree reclaim is what pays for this slot, which is why the generator count stays low.',
          'Place your fourth, fifth and sixth buildings near where the first engineer comes out of the factory, so it can start helping the moment it appears instead of walking across the base.',
        ],
      },
    ],
    factoryQueue: {
      '5x5': 'Not a 5x5 build.',
      '10x10': 'Not a 10x10 build.',
      '20x20':
        'Engineers, and plenty of them. The beach wants bodies on the mass points and on the trees before it wants an army.',
    },
    caveat:
      'Transcribed from a guide analysing one top player\u2019s game, so it is one player\u2019s build rather than a canonical one. The generator count in particular is given as three or four depending on how fast you want air.',
  },
];
