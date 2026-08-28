import type { NextConfig } from 'next';

/**
 * The site is static and reads nothing from the user, so the headers below are
 * defence in depth rather than fixes for a live hole. They are cheap, and a
 * public site without them looks unfinished to anyone who checks.
 *
 * No Content-Security-Policy: everything is same-origin and there is no
 * third-party script, so a CSP here would be a strict policy guarding nothing,
 * and the first mistake in it would break the site silently. Worth adding if
 * analytics or embeds ever arrive.
 */
const SECURITY_HEADERS = [
  // Nothing here is worth embedding in someone else's page, and the compare
  // flow has buttons a clickjacker could borrow.
  { key: 'X-Frame-Options', value: 'DENY' },
  // The unit renders are user-supplied only in the sense that they come from a
  // third-party repo; do not let a browser sniff one into something executable.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Do not leak which unit page someone came from to an outbound link.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The site asks for none of these, so refuse them all up front.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  // The repo sits under ~/Projects; without this Turbopack walks up to the home
  // directory looking for a lockfile and warns.
  turbopack: { root: __dirname },

  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
