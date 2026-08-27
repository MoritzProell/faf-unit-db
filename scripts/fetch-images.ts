/**
 * Vendors the per-unit renders from FAForever/spooky-db into public/units/.
 *
 * They live at app/img/units/<UnitId>.png, keyed by the same Id the blueprints
 * use. We copy rather than hotlink: raw.githubusercontent is not a CDN and is
 * rate limited. They change only when units are added, so re-run this after a
 * FAF patch that adds units.
 */
import { mkdir, writeFile, readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://api.github.com/repos/FAForever/spooky-db/contents/app/img/units?ref=master';
const OUT = join(process.cwd(), 'public', 'units');
const CONCURRENCY = 8;

interface Entry { name: string; download_url: string; size: number }

async function main() {
  await mkdir(OUT, { recursive: true });
  const existing = new Set(await readdir(OUT).catch(() => [] as string[]));

  const headers: Record<string, string> = { 'User-Agent': 'faf-unit-db-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  // Only vendor renders for units we actually ship. Upstream's image set has
  // strays that correspond to no unit, including a literal `undefined.png` from
  // a bug in its own download script, and carrying those skews the manifest.
  const data = JSON.parse(await readFile(join(process.cwd(), 'src', 'data', 'units.json'), 'utf8'));
  const wanted = new Set<string>((data.units as Array<{ Id: string }>).map((u) => `${u.Id}.png`));

  const res = await fetch(API, { headers });
  if (!res.ok) throw new Error(`listing failed: ${res.status} ${await res.text()}`);
  const entries = (await res.json()) as Entry[];
  const usable = entries.filter((e) => e.name.endsWith('.png') && wanted.has(e.name));
  const skipped = entries.filter((e) => e.name.endsWith('.png') && !wanted.has(e.name));
  if (skipped.length) {
    console.log(`skipping ${skipped.length} upstream image(s) matching no unit: ${skipped.map((e) => e.name).join(', ')}`);
  }

  // Remove anything vendored previously that is no longer wanted.
  for (const name of existing) {
    if (name.endsWith('.png') && !wanted.has(name)) {
      await unlink(join(OUT, name));
      console.log(`removed stale ${name}`);
    }
  }

  const todo = usable.filter((e) => !existing.has(e.name));

  console.log(`${usable.length} usable upstream images, ${existing.size} already local, ${todo.length} to fetch`);
  if (!todo.length) {
    await writeManifest();
    return;
  }

  let done = 0;
  let bytes = 0;
  const queue = [...todo];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const e = queue.shift();
      if (!e) return;
      const r = await fetch(e.download_url, { headers });
      if (!r.ok) throw new Error(`${e.name}: ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(join(OUT, e.name), buf);
      bytes += buf.length;
      if (++done % 100 === 0) console.log(`  ${done}/${todo.length}`);
    }
  });
  await Promise.all(workers);
  console.log(`fetched ${done} images, ${(bytes / 1048576).toFixed(1)} MB -> public/units/`);
  await writeManifest();
}

/**
 * Not every unit has a render: spooky-db's set predates a few blueprints. The
 * manifest lets the UI show a deliberate placeholder instead of a broken image.
 */
async function writeManifest() {
  const files = await readdir(OUT);
  const ids = files.filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();
  await mkdir(join(process.cwd(), 'src', 'data'), { recursive: true });
  await writeFile(join(process.cwd(), 'src', 'data', 'unit-images.json'), JSON.stringify(ids));
  console.log(`manifest: ${ids.length} renders -> src/data/unit-images.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
