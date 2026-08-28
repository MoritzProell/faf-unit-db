import type { MetadataRoute } from 'next';
import { getUnitData } from '@/lib/faf/data';
import { getPatches } from '@/lib/faf/changelog';
import { SITE_URL } from '@/lib/site';

/**
 * Every indexable page, with an honest last-modified date.
 *
 * Two things this gets right that the obvious version does not.
 *
 * It lists the guide pages. The first version enumerated the units and then
 * the two routes whoever wrote it happened to remember, which left /learn,
 * /build-orders, /factions and /upgrades out of the sitemap entirely: four
 * real pages Google was never told about. Routes are named once, below.
 *
 * And it dates a unit page by the patch, not by the build. Stamping
 * `new Date()` on all 499 URLs claims the whole site changed every time it
 * deploys, which on a busy day is twenty times, and Google discounts a
 * lastmod that obviously cannot be true. A unit page changes when FAF changes
 * the unit, so the patch's release date is the truthful answer and the one
 * that keeps the signal worth reading.
 *
 * /compare is deliberately absent: it is a tool keyed on a query string, it is
 * disallowed in robots.txt, and there is nothing there to index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { units } = await getUnitData();
  const patches = await getPatches();

  // When the data itself last changed, which is what every unit page reflects.
  const latest = patches[0];
  const patchDate = latest?.releasedAt ? new Date(latest.releasedAt) : new Date();
  // The site's own pages change when the site is deployed, so build time is
  // the honest answer for those.
  const built = new Date();

  const pages: Array<[path: string, lastModified: Date, priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']]> = [
    ['', built, 1, 'weekly'],
    ['/changelog', patchDate, 0.8, 'weekly'],
    ['/learn', built, 0.8, 'monthly'],
    ['/build-orders', built, 0.8, 'monthly'],
    ['/factions', patchDate, 0.8, 'monthly'],
    ['/upgrades', patchDate, 0.8, 'monthly'],
  ];

  return [
    ...pages.map(([path, lastModified, priority, changeFrequency]) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...units.map((u) => ({
      url: `${SITE_URL}/unit/${u.slug}`,
      lastModified: patchDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
