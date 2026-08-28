/**
 * Builds src/data/changelog.json: what changed between two generated datasets,
 * plus FAF's own written notes for the newer patch.
 *
 *   npm run changelog -- --from /tmp/units-3837.json --to src/data/units.json
 *
 * The daily workflow saves the committed dataset before regenerating and runs
 * this afterwards, so history accumulates one patch at a time. Historic patches
 * can be backfilled with `npm run generate -- --ref 3837 --out ...`.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { decorateUnit } from '../src/lib/faf/decorate';
import { diffPatches, type PatchDiff } from '../src/lib/faf/diff';
import type { Blueprint, UnitDefaults } from '../src/lib/faf/types';

const OUT = join(process.cwd(), 'src', 'data', 'changelog.json');

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function load(path: string) {
  const raw = JSON.parse(await readFile(path, 'utf8')) as UnitDefaults & { units: Blueprint[] };
  const units = raw.units
    .filter((b) => b.Id && b.General?.FactionName)
    .map((b) => decorateUnit(b, raw as UnitDefaults));
  return { version: raw.version, units };
}

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** FAF renders its notes per patch; there is no machine-readable source. */
async function fetchNotes(version: string) {
  const url = `https://faforever.github.io/fa/changelog/${version}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  no official notes for ${version} (${res.status})`);
      return { notes: undefined, notesUrl: undefined };
    }
    const html = await res.text();
    const body = html.split(/<h1[^>]*>/).slice(1).join('') || html;
    const sections: Array<{ heading: string; items: string[] }> = [];

    // Each <h2> starts a section; collect the list items until the next <h2>.
    const parts = body.split(/<h2[^>]*>/).slice(1);
    for (const part of parts) {
      const heading = strip(part.split('</h2>')[0]);
      const rest = part.slice(part.indexOf('</h2>'));
      const items = [...rest.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
        .map((m) => strip(m[1]))
        .filter((t) => t.length > 1);
      if (heading && items.length) sections.push({ heading, items });
    }
    console.log(`  official notes: ${sections.length} sections, ${sections.reduce((n, s) => n + s.items.length, 0)} items`);
    return { notes: sections.length ? sections : undefined, notesUrl: url };
  } catch (err) {
    console.log(`  could not fetch notes: ${(err as Error).message}`);
    return { notes: undefined, notesUrl: undefined };
  }
}

/**
 * When the patch actually shipped.
 *
 * FAF tags every patch on its game repository and cuts a GitHub release for
 * it, so the release date is the patch date, from FAF's own record rather than
 * a date this project made up. Missing is fine and common for old patches: the
 * page just omits the line.
 */
async function fetchReleaseDate(version: string): Promise<string | undefined> {
  const headers: Record<string, string> = { 'User-Agent': 'faf-unit-db-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(
      `https://api.github.com/repos/FAForever/fa/releases/tags/${version}`,
      { headers }
    );
    if (!res.ok) {
      console.log(`  no release date for ${version} (${res.status})`);
      return undefined;
    }
    const rel = (await res.json()) as { published_at?: string };
    if (rel.published_at) console.log(`  released ${rel.published_at.slice(0, 10)}`);
    return rel.published_at;
  } catch (err) {
    console.log(`  could not fetch release date: ${(err as Error).message}`);
    return undefined;
  }
}

async function main() {
  const from = flag('from');
  const to = flag('to') ?? join(process.cwd(), 'src', 'data', 'units.json');
  if (!from) throw new Error('usage: build-changelog --from <previous units.json> [--to <current>]');

  const [before, after] = await Promise.all([load(from), load(to)]);
  console.log(`Diffing ${before.version} -> ${after.version}`);

  if (before.version === after.version) {
    console.log('Same patch; nothing to record.');
    return;
  }

  const [{ notes, notesUrl }, releasedAt] = await Promise.all([
    fetchNotes(after.version),
    fetchReleaseDate(after.version),
  ]);
  const diff: PatchDiff = {
    version: after.version,
    previousVersion: before.version,
    ...diffPatches(before.units, after.units),
    notes,
    notesUrl,
    releasedAt,
  };

  let existing: PatchDiff[] = [];
  try {
    existing = JSON.parse(await readFile(OUT, 'utf8')) as PatchDiff[];
  } catch {
    // first run
  }
  const merged = [diff, ...existing.filter((p) => p.version !== diff.version)];
  // Newest first, numerically: patch numbers are strings but sort as integers.
  merged.sort((a, b) => Number(b.version) - Number(a.version));

  await mkdir(join(process.cwd(), 'src', 'data'), { recursive: true });
  await writeFile(OUT, JSON.stringify(merged));

  console.log(
    `\n✓ patch ${diff.version}: ${diff.changed.length} units changed, ` +
      `${diff.added.length} added, ${diff.removed.length} removed -> src/data/changelog.json`
  );
  for (const c of diff.changed.slice(0, 8)) {
    console.log(`   ${c.name}: ${c.fields.slice(0, 3).map((f) => `${f.label} ${f.from} → ${f.to}`).join(', ')}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
