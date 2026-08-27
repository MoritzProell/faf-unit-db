/**
 * Builds the unit dataset directly from FAForever's game repository.
 *
 * FA unit blueprints are Lua source that calls `UnitBlueprint{...}`. Rather than
 * parse them, we evaluate them with the constructors defined as identity
 * functions, which is how FAForever/spooky-db's own tooling works. That gives
 * the complete blueprint with no field whitelist and no parser to keep in step
 * with the game.
 *
 * Evaluation happens in scripts/lua/blueprints2json.lua under a real Lua
 * interpreter. A WASM Lua was tried first and its fixed heap cannot survive 700
 * blueprints in one state.
 *
 *   brew install lua            # or apt install lua5.4
 *   npm run generate            # writes src/data/units.json
 *   GITHUB_TOKEN=... npm run generate            # avoids API rate limits
 *   npm run generate -- --ref 3837 --out /tmp/3837.json    # a historic patch
 *
 * Sources (all FAForever/fa @ deploy/faf unless noted):
 *   units/<ID>/<ID>_unit.bp        the blueprints
 *   lua/version.lua                game version
 *   lua/system/blueprints-units.lua  TechToVetMultipliers
 *   lua/defaultcomponents.lua      VeterancyRegenBuffs
 *   lua/shared/overcharge.lua      overcharge energy ratio
 *   lua/shield.lua                 shield spill/recharge defaults
 *   lua/sim/Unit.lua               wreckage tech + water multipliers
 *   FAForever/nomads @ master      the Nomads faction
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

/**
 * `--ref` builds a historic patch (any tag on FAForever/fa, e.g. 3837), which is
 * how the changelog gets real history rather than starting empty.
 */
const REF = flag('ref') ?? 'deploy/faf';
const REPOS = [
  { owner: 'FAForever', name: 'fa', branch: REF },
  // Nomads has no per-patch tags, so it tracks master regardless.
  { owner: 'FAForever', name: 'nomads', branch: 'master' },
];
const FA = REPOS[0];
const OUT = flag('out') ?? join(process.cwd(), 'src', 'data', 'units.json');
const CONCURRENCY = 12;

const headers: Record<string, string> = { 'User-Agent': 'faf-unit-db-generator' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const raw = (r: typeof FA, path: string) =>
  `https://raw.githubusercontent.com/${r.owner}/${r.name}/${r.branch}/${path}`;

async function text(url: string): Promise<string> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

/** Two API calls per repo: branch tree, then the named subtree recursively. */
async function listBlueprints(r: typeof FA, dir: string, suffix: RegExp): Promise<string[]> {
  const base = `https://api.github.com/repos/${r.owner}/${r.name}/git/trees`;
  const top = await fetch(`${base}/${encodeURIComponent(r.branch)}`, { headers }).then((x) => x.json());
  const entry = (top.tree ?? []).find((t: { path: string }) => t.path === dir);
  if (!entry) return [];
  const sub = await fetch(`${base}/${entry.sha}?recursive=1`, { headers }).then((x) => x.json());
  if (sub.truncated) throw new Error(`${r.name}/${dir}: tree truncated; needs paging`);
  return (sub.tree ?? [])
    .map((t: { path: string }) => t.path)
    .filter((p: string) => suffix.test(p))
    .map((p: string) => `${dir}/${p}`);
}

/**
 * Fetches a set of blueprints into `work` and evaluates them with Lua.
 * `mode` 'projectiles' keeps every blueprint and returns only its Categories.
 */
async function evaluate(
  work: string,
  files: Array<{ id: string; repo: typeof FA; path: string }>,
  failures: string[],
  mode?: 'projectiles'
): Promise<Bp[]> {
  const manifest: string[] = [];
  const queue = [...files];
  let fetched = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const item = queue.shift();
        if (!item) return;
        try {
          // The manifest key can be a full path (projectiles are keyed by the
          // path a weapon's ProjectileId refers to), so the filename is derived
          // separately rather than from the key.
          const safe = `${mode ?? 'unit'}-${item.repo.name}-${item.id.replace(/[^A-Za-z0-9._-]/g, '_')}.bp`;
          const file = join(work, safe);
          await writeFile(file, await text(raw(item.repo, item.path)));
          manifest.push(`${item.id}\t${file}`);
        } catch (err) {
          failures.push(`${item.path}: ${(err as Error).message}`);
        }
        if (++fetched % 250 === 0) console.log(`  fetched ${fetched}/${files.length}`);
      }
    })
  );

  const manifestPath = join(work, `${mode ?? 'unit'}-manifest.tsv`);
  await writeFile(manifestPath, manifest.join('\n'));
  const args = [join(process.cwd(), 'scripts', 'lua', 'blueprints2json.lua'), manifestPath];
  if (mode) args.push(mode);

  let stdout: string;
  try {
    ({ stdout } = await run('lua', args, { maxBuffer: 512 * 1024 * 1024 }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('No `lua` on PATH. Install it: brew install lua (or apt install lua5.4)');
    }
    throw err;
  }
  const parsed = JSON.parse(stdout) as { units: Bp[]; errors: string[] };
  failures.push(...parsed.errors);
  return parsed.units;
}

/** Values that live in FAF's Lua rather than in any blueprint. */
function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Could not read ${what} from FAF source. The game code moved; fix the generator rather than hardcoding.`);
  }
  return value;
}

async function readConstants() {
  const [version, bpUnits, defaults, overcharge, shield, unit] = await Promise.all([
    text(raw(FA, 'lua/version.lua')),
    text(raw(FA, 'lua/system/blueprints-units.lua')),
    text(raw(FA, 'lua/defaultcomponents.lua')),
    text(raw(FA, 'lua/shared/overcharge.lua')),
    text(raw(FA, 'lua/shield.lua')),
    text(raw(FA, 'lua/sim/Unit.lua')),
  ]);

  const num = (src: string, re: RegExp, what: string): number =>
    must(src.match(re)?.[1] ? Number(src.match(re)![1]) : null, what);

  // TechToVetMultipliers { TECH1 = 2, ... }  (blueprints-units.lua)
  const vetBlock = must(bpUnits.match(/TechToVetMultipliers\s*=\s*\{([^}]*)\}/)?.[1], 'TechToVetMultipliers');
  const techToVetMultipliers: Record<string, number> = {};
  for (const m of vetBlock.matchAll(/(\w+)\s*=\s*([\d.]+)/g)) techToVetMultipliers[m[1]] = Number(m[2]);

  // VeterancyRegenBuffs { {1,2,3,4,5}, ... }  (defaultcomponents.lua)
  const regenBlock = must(
    defaults.match(/VeterancyRegenBuffs\s*=\s*\{([\s\S]*?)\n\}/)?.[1],
    'VeterancyRegenBuffs'
  );
  const veterancyRegenBuffs = [...regenBlock.matchAll(/\{([^}]*)\}/g)].map((m) =>
    m[1].split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
  );

  // Wreckage tech multipliers are an if/elseif chain in Unit.lua's CreateWreckageProp.
  const wreck = must(unit.match(/Reduce the mass value based on the tech tier[\s\S]{0,900}/)?.[0], 'wreckage multipliers');
  const wreckageTechMassMults: Record<string, number> = {};
  for (const m of wreck.matchAll(/tech_category == '(\w+)' then\s*\n\s*mass_tech_mult = ([\d.]+)/g)) {
    wreckageTechMassMults[m[1]] = Number(m[2]);
  }

  const constants = {
    version: must(version.match(/local Version = "([^"]+)"/)?.[1], 'game version'),
    shieldDefaultOverspill: num(shield, /ShieldSpillOverDamageMod or ([\d.]+)/, 'shieldDefaultOverspill'),
    shieldDefaultRechargeTime: num(shield, /self\.ShieldRechargeTime = spec\.ShieldRechargeTime or ([\d.]+)/, 'shieldDefaultRechargeTime'),
    overchargeEnergyRatio: num(overcharge, /local energyRatio = ([\d.]+)/, 'overchargeEnergyRatio'),
    techToVetMultipliers,
    veterancyRegenBuffs,
    wreckageTechMassMults,
    wreckageWaterMult: num(wreck, /layer == 'Water'[\s\S]{0,120}?mass = mass \* ([\d.]+)/, 'wreckageWaterMult'),
  };

  // Fail loud if the game code moved rather than shipping a half-read constant.
  if (Object.keys(constants.techToVetMultipliers).length < 4) throw new Error('TechToVetMultipliers looks wrong');
  if (constants.veterancyRegenBuffs.length !== 5) throw new Error('VeterancyRegenBuffs should have 5 tiers');
  if (Object.keys(constants.wreckageTechMassMults).length < 4) throw new Error('wreckage multipliers look wrong');
  return constants;
}

type Bp = Record<string, unknown> & { Id?: string; Categories?: string[] };

/**
 * The game ships a written description for nearly every unit and commander
 * upgrade in lua/ui/help/unitdescription.lua — the text the in-game rollover
 * shows. Nomads keeps its own copy in the same path under nomadhook/. Between
 * them they cover 507 of 510 units, so the site does not have to invent prose
 * it cannot stand behind.
 *
 * Entries look like:
 *   ['uel0001'] = "<LOC Unit_Description_0303> Armored Commander is a ...",
 *   ['uel0001-tm'] = "<LOC Unit_Description_0004> Mounts a tactical ...",
 * where the suffixed keys are enhancements. The <LOC ...> tag is the
 * localisation id and is stripped.
 */
async function readDescriptions(): Promise<Record<string, string>> {
  const sources: Array<[typeof FA, string]> = [
    [FA, 'lua/ui/help/unitdescription.lua'],
    [REPOS[1], 'nomadhook/lua/ui/help/unitdescription.lua'],
  ];
  const out: Record<string, string> = {};
  for (const [repo, path] of sources) {
    const src = await text(raw(repo, path));
    const re = /\['([a-z0-9-]+)'\]\s*=\s*"(?:<LOC [^>]*>)?\s*([\s\S]*?)"\s*,/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(src)) !== null) {
      const body = m[2].replace(/\s+/g, ' ').trim();
      if (body) { out[m[1]] = body; n++; }
    }
    console.log(`  ${n} descriptions from ${repo.name}`);
    // A silent zero here would ship a site with every blurb missing.
    if (n === 0) throw new Error(`no descriptions parsed from ${path}`);
  }
  return out;
}

async function main() {
  console.log('=== FAF unit data generator ===\n');
  console.log('Reading constants from FAForever/fa...');
  const constants = await readConstants();
  console.log(`  game version ${constants.version}`);

  const work = await mkdtemp(join(tmpdir(), 'faf-bp-'));
  const units: Bp[] = [];
  const failures: string[] = [];

  try {
    const unitFiles: Array<{ id: string; repo: typeof FA; path: string }> = [];
    const projFiles: Array<{ id: string; repo: typeof FA; path: string }> = [];

    for (const repo of REPOS) {
      for (const path of await listBlueprints(repo, 'units', /_unit\.bp$/i)) {
        const id = path.match(/([^/]+?)_unit\.bp$/i)?.[1]?.toUpperCase();
        if (id) unitFiles.push({ id, repo, path });
      }
      for (const path of await listBlueprints(repo, 'projectiles', /_proj\.bp$/i)) {
        // Keyed by the path a weapon's ProjectileId refers to.
        projFiles.push({ id: `/${path}`, repo, path });
      }
    }

    console.log(`\nProjectiles: ${projFiles.length}`);
    const projectiles = await evaluate(work, projFiles, failures, 'projectiles');
    const torpedoes = new Set(
      projectiles
        .filter((p) => (p.Categories as string[] | undefined)?.includes('TORPEDO'))
        .map((p) => String(p.Id).toLowerCase())
    );
    console.log(`  ${torpedoes.size} are torpedoes`);

    console.log(`\nUnits: ${unitFiles.length}`);
    units.push(...(await evaluate(work, unitFiles, failures)));
    console.log(`  kept ${units.length}`);

    // A weapon's Anti Navy role splits into torpedo vs depth charge, and only the
    // projectile blueprint says which. The app reads this to label and group them.
    let marked = 0;
    for (const u of units) {
      for (const w of (u.Weapon as Array<Record<string, unknown>> | undefined) ?? []) {
        if (w.WeaponCategory !== 'Anti Navy') continue;
        const pid = String(w.ProjectileId ?? '').toLowerCase();
        if (pid && torpedoes.has(pid)) {
          w.isTorpedo = true;
          marked++;
        }
      }
    }
    console.log(`  marked ${marked} torpedo weapons`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  if (failures.length) {
    console.log(`\n${failures.length} blueprint(s) failed to evaluate:`);
    failures.slice(0, 10).forEach((f) => console.log('  ' + f));
    if (failures.length > units.length * 0.02) {
      throw new Error('too many blueprint failures; refusing to write a partial dataset');
    }
  }

  const descriptions = await readDescriptions();
  let described = 0;
  for (const u of units) {
    const key = String(u.Id ?? '').toLowerCase();
    const blurb = descriptions[key];
    if (blurb) { u.blurb = blurb; described++; }
  }
  console.log(`  ${described}/${units.length} units carry a description`);

  units.sort((a, b) => (a.Id ?? '').localeCompare(b.Id ?? ''));
  await mkdir(dirname(OUT), { recursive: true });
  // Enhancement blurbs stay keyed as the game writes them (<unit>-<enh>), so
  // the upgrade UI can look one up without a second pass over the units.
  await writeFile(OUT, JSON.stringify({ ...constants, descriptions, units }));
  console.log(`\n✓ ${units.length} units, patch ${constants.version} -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
