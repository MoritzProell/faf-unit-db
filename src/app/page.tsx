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
          alternateName: 'Supreme Commander Forged Alliance Forever Unit Database',
          url: SITE_URL,
          description: `Stats for all ${units.length} Forged Alliance Forever units, generated from the game files at patch ${version}.`,
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <BrowseClient units={units.map(toBrowseUnit)} facets={facets} version={version} />
    </>
  );
}
