import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Crawler policy, including the AI ones by name.
 *
 * `User-agent: *` already allowed them, but silence is a bad way to decide
 * something: naming them makes the choice visible and gives one place to
 * reverse it. The choice here is to allow, because this site exists to answer
 * questions about FAF units and an answer engine quoting it with a link is
 * that happening at a larger scale. The data is FAF's own, published under
 * their terms, and the site is open source.
 *
 * Google-Extended is the one that matters most: it is not a crawler at all but
 * the switch that controls whether Google may use already-indexed pages to
 * ground AI Overviews and Gemini. Disallowing it removes the site from those
 * answers without affecting normal search ranking, so it is worth knowing that
 * the two are separable.
 */
const AI_AGENTS = [
  'Google-Extended',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'Applebot-Extended',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /compare is a query-string permutation space; there is nothing to index
      // there and crawling it wastes budget that should go on unit pages.
      { userAgent: '*', allow: '/', disallow: '/compare' },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: '/compare' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
