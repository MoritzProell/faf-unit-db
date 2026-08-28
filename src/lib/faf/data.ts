import { cache } from 'react';
import { decorateUnit } from './decorate';
import raw from '@/data/units.json';
import type { Blueprint, Unit, UnitDefaults } from './types';

/**
 * The dataset is generated from FAForever's own game repository by
 * `npm run generate` and committed to src/data/units.json, so the site has no
 * runtime dependency on anyone else's server. Re-run the generator after a FAF
 * patch; `npm run verify` checks the derived stats before you ship it.
 */

export interface UnitData {
  version: string;
  defaults: UnitDefaults;
  units: Unit[];
  bySlug: Map<string, Unit>;
  byId: Map<string, Unit>;
  /**
   * Every description the game ships, keyed as it keys them: `uel0001` for the
   * unit, `uel0001-tm` for one of its enhancements.
   */
  descriptions: Record<string, string>;
}

const UNBUILDABLE = new Set([
  'XSL0402', // Ythotha death storm
  'XRL0002', // Crab Egg (Engineer)
  'XRL0003', // Crab Egg (Brick)
  'XRL0004', // Crab Egg (Flak)
  'XRL0005', // Crab Egg (Artillery)
  'DRLK005', // Crab Egg (Bouncer)
  'URB3103', // Scout-Deployed Land Sensor
  'UEA0001', // Engineering Drone (ACU pod)
  'UEA0003', // Engineering Drone (ACU pod)
  'XEA3204', // Engineering Drone (SACU pod)
  'XNA0107', // Transport Drone (Nomads pod)
  'SRL0310', // Mobile EMP Missile Launcher — no faction builds it, and no
             // player reports seeing it in game
  'XEA0002', // Novax Defense Satellite. You do not build it; you build the
             // Novax Center, which is already listed, and the satellite is
             // what the Center puts in orbit. Two entries for one decision,
             // and the satellite's 100 hp made every stat in the experimental
             // air slot meaningless next to a 75 000 hp Soul Ripper.
]);

const data = raw as unknown as UnitDefaults & {
  units: Blueprint[];
  descriptions?: Record<string, string>;
};

/** `cache` dedupes this across every component in a single render pass. */
export const getUnitData = cache(async (): Promise<UnitData> => {
  const defaults = data as UnitDefaults;

  const units = data.units
    .filter((b) => b.Id && b.General?.FactionName)
    // Things the game spawns rather than things you build. None of these has a
    // BUILTBY category, so nothing in the roster can construct one: the
    // Ythotha's death storm exists only while the corpse burns, the crab eggs
    // hatch out of a deploy action, and the land sensor is dropped by a scout.
    // They belong to no slot, no matchup and no comparison, and leaving them in
    // bought a "Structures - Other" box holding six oddities.
    //
    // Listed by id rather than by rule because the trait they share — nothing
    // builds them — is also true of the Novax and Nomads satellites, which are
    // real things a player deploys and shoots with, and which stay.
    .filter((b) => !UNBUILDABLE.has(b.Id))
    .map((b) => decorateUnit(b, defaults))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    version: data.version,
    defaults,
    units,
    bySlug: new Map(units.map((u) => [u.slug, u])),
    byId: new Map(units.map((u) => [u.Id, u])),
    descriptions: data.descriptions ?? {},
  };
});

export async function getUnitBySlug(slug: string): Promise<Unit | undefined> {
  return (await getUnitData()).bySlug.get(slug);
}

export async function getUnitsByIds(ids: string[]): Promise<Unit[]> {
  const { byId } = await getUnitData();
  return ids.map((id) => byId.get(id)).filter((u): u is Unit => !!u);
}
