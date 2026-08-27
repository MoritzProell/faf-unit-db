import type { MetadataRoute } from 'next';
import { getUnitData } from '@/lib/faf/data';
import { SITE_URL } from '@/lib/site';

/** Every unit page is static and indexable; this is how Google finds all 510. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { units } = await getUnitData();
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...units.map((u) => ({
      url: `${SITE_URL}/unit/${u.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
