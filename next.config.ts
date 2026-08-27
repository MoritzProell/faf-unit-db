import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo sits under ~/Projects; without this Turbopack walks up to the home
  // directory looking for a lockfile and warns.
  turbopack: { root: __dirname },
};

export default nextConfig;
