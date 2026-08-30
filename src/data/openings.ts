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
 * UEF or Seraphim. So an order is written once and resolved against whichever
 * faction the reader picked, and it picks up a new patch's numbers for free.
 */

export type MapSize = '5x5' | '10x10' | '20x20';

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
  /** Which branch of the picker leads here. */
  secondFactory: 'land' | 'air';
  hydro: boolean;
  source: { label: string; url: string; edited?: string };
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
    id: 'second-land',
    title: 'Second land',
    summary:
      'Two land factories. The straightforward opening: everything the ACU builds goes toward putting more tanks on the ground sooner.',
    secondFactory: 'land',
    hydro: false,
    source: WIKI_BEGINNER,
    acu: [
      { unit: 'B0101', note: 'The first factory is always land or air, and land is the safe default.' },
      { unit: 'B1101', count: 2, note: 'Two power generators adjacent to the factory for the adjacency bonus.' },
      { unit: 'B1103', count: 4, note: 'The four mass points closest to your spawn.' },
      { unit: 'B1101', count: 3 },
      { unit: 'B0101' },
      {
        action: 'Move out',
        note: 'To the front line, or stay and help produce factories. The wiki prefers the front line.',
      },
    ],
    lanes: [
      {
        key: 'factory',
        label: 'First factory',
        timed: true,
        steps: [{ unit: 'L0105', count: 3, note: 'Engineers first, before any combat units.' }],
      },
      {
        key: 'engineers',
        label: 'The first three engineers',
        timed: false,
        steps: [],
        advice: [
          '1st: expands, reclaims, or assists the ACU.',
          '2nd: expands, reclaims.',
          '3rd: assists the ACU, then takes over base production so the ACU can move toward the front line.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
  },
  {
    id: 'second-air',
    title: 'Second air',
    summary:
      'Land factory, then air. Common at higher levels, because it buys bombers, interceptors and above all scouts to find out what your opponent is doing.',
    secondFactory: 'air',
    hydro: false,
    source: WIKI_BEGINNER,
    acu: [
      { unit: 'B0101' },
      { unit: 'B1101', count: 2, note: 'Adjacent to the factory.' },
      { unit: 'B1103', count: 4 },
      {
        unit: 'B1101',
        count: 5,
        note: 'The wiki says four to six here. Five is the middle; air costs energy rather than mass, so this is what pays for it.',
      },
      { unit: 'B0102' },
      { action: 'Move out', note: 'Front line, or help produce more factories.' },
    ],
    lanes: [
      {
        key: 'factory',
        label: 'First factory',
        timed: true,
        steps: [{ unit: 'L0105', count: 3 }],
      },
      {
        key: 'engineers',
        label: 'The first three engineers',
        timed: false,
        steps: [],
        advice: [
          '1st: expands, reclaims, or assists the ACU.',
          '2nd: expands, reclaims.',
          '3rd: assists the ACU, then takes over base production.',
        ],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
    caveat:
      'The source gives four to six power generators before the air factory. Five is simulated here; the picker cannot ask you how much energy your map wants.',
  },
  {
    id: 'second-air-hydro',
    title: 'Second air, hydrocarbon',
    summary:
      'Use this one whenever there is a hydrocarbon plant to take. It is far more energy per mass than power generators, so the ACU can skip them entirely and spend on mass instead.',
    secondFactory: 'air',
    hydro: true,
    source: WIKI_BEGINNER,
    acu: [
      { unit: 'B0101' },
      { unit: 'B1103', count: 4, note: 'No power generators at all: the hydro covers it.' },
      {
        action: 'Assist the first engineer',
        assist: 'engie1',
        note: 'On the hydrocarbon plant. One T1 engineer alone takes 80 seconds on it, which is why it gets help.',
      },
      { action: 'Move out' },
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
          { unit: 'B1102', note: 'The hydrocarbon plant, with the ACU and the 2nd engineer assisting.' },
          { unit: 'B1101', count: 2, note: 'The wiki says one to two.' },
          { unit: 'B0102', note: 'Placed next to the hydro for the adjacency bonus.' },
        ],
      },
      {
        key: 'engie2',
        label: '2nd engineer',
        timed: true,
        steps: [{ action: 'Assist the hydrocarbon plant', assist: 'engie1' }],
      },
      {
        key: 'engineers',
        label: '3rd engineer',
        timed: false,
        steps: [],
        advice: ['Expands, reclaims, or assists the ACU in factory production.'],
      },
    ],
    factoryQueue: FACTORY_QUEUE,
  },
];
