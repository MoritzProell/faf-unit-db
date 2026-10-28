/**
 * Canonical origin. Every canonical link, sitemap entry and social card points
 * at whatever this resolves to, so it must match where the site actually lives.
 *
 * Set NEXT_PUBLIC_SITE_URL in Vercel when a custom domain is attached; a
 * vercel.app subdomain carries far less search authority.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://faf-unit-db.vercel.app')
).replace(/\/$/, '');

export const SITE_NAME = 'FAF Unit DB';

/**
 * The owner's FAF replay viewer: watch a match in the browser, no game install.
 * It links its unit names back here by blueprint id (`/unit/uel0201`), which
 * the unit route redirects to the canonical page.
 */
export const REPLAY_VIEWER_URL = 'https://faf-replay-debrief.vercel.app';
