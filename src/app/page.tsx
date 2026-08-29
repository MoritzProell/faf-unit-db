import { BrowseClient } from '@/components/BrowseClient';
import { JsonLd } from '@/components/JsonLd';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { getUnitData } from '@/lib/faf/data';
import { toBrowseUnit, ROLE_KEYS, rolesOf } from '@/lib/faf/browse';
import type { Facets } from '@/components/FilterRail';

export default async function BrowsePage() {
  const { units, version } = await getUnitData();

  const facets: Facets = { faction: {}, tech: {}, kind: {}, role: {} };
  for (const u of units) {
    facets.faction[u.faction] = (facets.faction[u.faction] || 0) + 1;
    facets.tech[u.tech] = (facets.tech[u.tech] || 0) + 1;
    facets.kind[u.kind] = (facets.kind[u.kind] || 0) + 1;
    for (const r of rolesOf(u)) facets.role[r] = (facets.role[r] || 0) + 1;
  }
  for (const r of ROLE_KEYS) facets.role[r] = facets.role[r] || 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          // Every name this site is known by, so a search for any of them
          // resolves to it. "fafunits" is the one people actually type.
          alternateName: [
            'fafunits',
            'fafunits.com',
            'Supreme Commander unit database',
            'Forged Alliance unit database',
            'FAF Unit Database',
            'Supreme Commander Forged Alliance Forever Unit Database',
          ],
          url: SITE_URL,
          description: `Stats for all ${units.length} Forged Alliance Forever units, generated from the game files at patch ${version}.`,
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* The site is a derived dataset, so it says so. This is the record that
          lets a machine understand what it is looking at without inferring it
          from a grid of images: where the data came from, what it covers, how
          many records, and a distribution that actually resolves. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Forged Alliance Forever unit statistics',
          alternateName: `FAF unit data, patch ${version}`,
          description:
            `Costs, weapons, damage per second, armour, veterancy, wreckage and abilities for all ` +
            `${units.length} units in Supreme Commander: Forged Alliance Forever at patch ${version}. ` +
            `Generated directly from FAForever's game blueprints; the weapon maths is a transliteration ` +
            `of the game's own unit view code.`,
          url: SITE_URL,
          identifier: `faf-units-${version}`,
          version,
          keywords: [
            'Supreme Commander', 'Forged Alliance Forever', 'FAF',
            'unit statistics', 'game balance', 'real-time strategy',
          ],
          isBasedOn: 'https://github.com/FAForever/fa',
          creator: { '@type': 'Person', name: 'Moritz/RhyZ1ne' },
          license: 'https://github.com/FAForever/fa/blob/deploy/faf/LICENSE',
          codeRepository: 'https://github.com/MoritzProell/faf-unit-db',
          measurementTechnique:
            "Evaluated from FAForever's unit blueprints; derived stats follow lua/ui/game/unitviewDetail.lua",
          variableMeasured: [
            'mass cost', 'energy cost', 'build time', 'health', 'damage per second',
            'weapon range', 'shield strength', 'speed', 'wreckage reclaim',
          ],
          distribution: {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_URL}/units.json`,
          },
        }}
      />
      <BrowseClient units={units.map(toBrowseUnit)} facets={facets} version={version} />
    </>
  );
}
