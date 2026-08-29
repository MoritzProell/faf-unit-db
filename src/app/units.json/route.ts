import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPatches } from '@/lib/faf/changelog';

/**
 * The generated dataset, served as one file.
 *
 * This is the same `src/data/units.json` the site is built from: every
 * blueprint the generator keeps, with the constants it read out of FAF's Lua.
 * It is already public in the repository, so serving it discloses nothing new,
 * and it is worth serving for two reasons.
 *
 * The first is that anyone else can build on it without scraping these pages
 * or re-implementing the generator, which is the point of the project being
 * open.
 *
 * The second is that it lets the site describe itself honestly as a dataset in
 * its structured data, with a distribution that actually resolves. A Dataset
 * record whose downloadUrl 404s is worse than no record at all.
 */
export const revalidate = 21600;

export async function GET() {
  const [raw, patches] = await Promise.all([
    readFile(join(process.cwd(), 'src', 'data', 'units.json'), 'utf8'),
    getPatches(),
  ]);

  return new Response(raw, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Changes only when FAF ships a patch, so it can be cached hard and
      // revalidated in the background.
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      'access-control-allow-origin': '*',
      'x-faf-patch': patches[0]?.version ?? 'unknown',
    },
  });
}
