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

const data = raw as unknown as UnitDefaults & {
  units: Blueprint[];
  descriptions?: Record<string, string>;
};

/** `cache` dedupes this across every component in a single render pass. */
export const getUnitData = cache(async (): Promise<UnitData> => {
  const defaults = data as UnitDefaults;

  const units = data.units
    .filter((b) => b.Id && b.General?.FactionName)
    // The Ythotha's death storm is scenery, not a unit: nothing builds it and
    // it exists only while the corpse burns. The satellites are UNTARGETABLE
    // too but are real things a player deploys and shoots with, so they stay —
    // which is why this is an explicit id rather than a category rule.
    .filter((b) => b.Id !== 'XSL0402')
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
