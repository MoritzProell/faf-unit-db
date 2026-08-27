import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /compare is a query-string permutation space; there is nothing to index
      // there and crawling it wastes budget that should go on unit pages.
      { userAgent: '*', allow: '/', disallow: '/compare' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
