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
import sharp from 'sharp';

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

  // The renders are the only step with an early exit; everything after it runs
  // either way. It used to be written out twice, once per branch, and a step
  // added to one copy silently never ran.
  if (todo.length) {
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
  }

  await writeUpscaled();
  await writeEnhancementIcons();
  await writeStrategicIcons();
  await writeManifest();
}

/**
 * Commander upgrade icons, from FAForever/UnitDB.
 *
 * The game does not ship these anywhere reachable, but UnitDB vendored them
 * and names each file after the same abbreviation the blueprint uses in its
 * enhancement `Icon` field (aes, hamc, pqt), so the mapping is exact rather
 * than guessed. Stored as public/enhancements/<Faction>/<icon>.png.
 */
async function writeEnhancementIcons() {
  const headers: Record<string, string> = { 'User-Agent': 'faf-unit-db-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const FACTIONS = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
  const base = join(process.cwd(), 'public', 'enhancements');
  let made = 0;
  let skipped = 0;

  for (const faction of FACTIONS) {
    const listUrl =
      `https://api.github.com/repos/FAForever/UnitDB/contents/www/res/img/enhancements/${faction}?ref=master`;
    const res = await fetch(listUrl, { headers });
    if (!res.ok) throw new Error(`enhancement icons ${faction} -> ${res.status}`);
    const entries = (await res.json()) as Array<{ name: string; download_url: string }>;

    const dir = join(base, faction);
    await mkdir(dir, { recursive: true });
    const have = new Set(await readdir(dir).catch(() => [] as string[]));

    for (const e of entries) {
      // "<icon>_btn_up.png" -> "<icon>.png"
      const m = e.name.match(/^(.+?)_btn_up\.png$/i);
      if (!m) continue;
      const out = `${m[1].toLowerCase()}.png`;
      if (have.has(out)) { skipped++; continue; }
      const img = await fetch(e.download_url, { headers });
      if (!img.ok) throw new Error(`${e.name} -> ${img.status}`);
      await writeFile(join(dir, out), Buffer.from(await img.arrayBuffer()));
      made++;
    }
  }
  console.log(`enhancement icons: ${made} fetched, ${skipped} already local`);
}

/**
 * Strategic icons, from FAForever/UnitDB.
 *
 * These are the symbols you actually read when the camera is out: a player
 * recognises a Percival by its icon long before they recognise the render.
 * The game ships them as DDS, which no browser draws; UnitDB vendored the
 * same set as PNG, named after the blueprint's own `StrategicIconName` plus
 * the `_rest` state suffix, so the mapping is exact rather than guessed.
 * Every one of the 119 names the dataset uses resolves.
 *
 * Stored as public/strategic/<StrategicIconName>.png.
 */
async function writeStrategicIcons() {
  const headers: Record<string, string> = { 'User-Agent': 'faf-unit-db-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  // Only the icons the dataset actually names, not all 295 in the repo.
  const units = JSON.parse(
    await readFile(join(process.cwd(), 'src', 'data', 'units.json'), 'utf8')
  ) as { units: Array<{ StrategicIconName?: string }> };
  const wanted = [
    ...new Set(units.units.map((u) => u.StrategicIconName).filter((n): n is string => !!n)),
  ].sort();

  const dir = join(process.cwd(), 'public', 'strategic');
  await mkdir(dir, { recursive: true });
  const have = new Set(await readdir(dir).catch(() => [] as string[]));

  let made = 0;
  let skipped = 0;
  const missing: string[] = [];
  const queue = [...wanted];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const name = queue.shift();
        if (!name) return;
        if (have.has(`${name}.png`)) { skipped++; continue; }
        const url =
          'https://raw.githubusercontent.com/FAForever/UnitDB/master/www/res/img/strategic/' +
          `${name}_rest.png`;
        const res = await fetch(url, { headers });
        if (!res.ok) { missing.push(name); continue; }
        await writeFile(join(dir, `${name}.png`), Buffer.from(await res.arrayBuffer()));
        made++;
      }
    })
  );
  // Loud, not silent: a missing icon means a new unit shipped with an icon
  // name UnitDB has not vendored, and the page would quietly show a gap.
  if (missing.length) {
    console.log(`  WARNING: ${missing.length} strategic icon(s) not found: ${missing.join(', ')}`);
  }
  console.log(`strategic icons: ${made} fetched, ${skipped} already local, ${wanted.length} in use`);
}

/**
 * Renders are only 64x64, which is all FAF publishes. Drawn large they go soft,
 * and the browser's and Satori's own scaling is poor. A Lanczos upscale to 256
 * does not invent detail but it does avoid the mush, and lets the unit page and
 * the social cards downscale into their slot rather than upscale out of it.
 */
async function writeUpscaled() {
  const dest = join(process.cwd(), 'public', 'units-lg');
  await mkdir(dest, { recursive: true });
  const files = (await readdir(OUT)).filter((f) => f.endsWith('.png'));
  const existing = new Set(await readdir(dest).catch(() => [] as string[]));

  let made = 0;
  for (const name of files) {
    if (existing.has(name)) continue;
    await sharp(join(OUT, name))
      .resize(256, 256, { kernel: 'lanczos3', fit: 'fill' })
      .png({ palette: true, quality: 90, effort: 10 })
      .toFile(join(dest, name));
    made++;
  }
  for (const name of existing) {
    if (!files.includes(name)) await unlink(join(dest, name));
  }
  console.log(`upscaled ${made} render(s) to 256px -> public/units-lg/`);
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
