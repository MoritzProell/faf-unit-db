/**
 * Checks our derived stats against known-good values for patch 3838, read off
 * the in-game unit view. Run: npm run verify
 *
 * This exists because the naive damage x rate-of-fire formula silently disagrees
 * with the game on salvo and damage-over-time weapons. If this fails, do not ship.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decorateUnit, fmtRatio } from '../src/lib/faf/decorate';
import type { Blueprint, UnitDefaults } from '../src/lib/faf/types';

const LOCAL = join(process.cwd(), 'src', 'data', 'units.json');

// (unitId, weapon category -> dps) as displayed by the reference site
const DPS_CASES: Array<[string, string, Record<string, number>]> = [
  ['UEL0101', 'Snoop',      { 'Direct Fire': 2 }],
  ['XEL0305', 'Percival',   { 'Direct Fire': 337.2 }],
  ['XRL0305', 'The Brick',  { 'Direct Fire': 295, Torpedo: 37.5, Defense: 0.15 }],
  ['XSL0303', 'Othuum',     { 'Direct Fire': 411.8, Torpedo: 30 }],
  ['UAL0303', 'Harbinger',  { 'Direct Fire': 320 }],
  ['UEL0303', 'Titan',      { 'Direct Fire': 150 }],
  ['URL0303', 'Loyalist',   { 'Direct Fire': 206.4 }],
];

// (unitId, hp/mass, wreckage mass/water/health, vet hp/regen/mass)
const UNIT_CASES: Array<[string, string, [number, number, number] | null, [number, number, number] | null]> = [
  ['XEL0305', '5.625', [806, 484, 6480], [720, 6, 1600]],
  ['XRL0305', '5.859', [806, 484, 6750], [750, 6, 1600]],
  ['XSL0303', '5.595', [529, 318, 4230], [470, 6, 1050]],
  ['UEL0303', '5',     null,              null],
  ['URL0303', '6.25',  null,              null],
  ['UAL0303', '4.286', null,              null],
  ['UEL0304', '1.188', null,              null],
  ['URL0304', '1.063', null,              null],
  ['XSL0304', '1.156', null,              null],
];

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

async function main() {
  const raw = JSON.parse(await readFile(LOCAL, 'utf8')) as UnitDefaults & { units: Blueprint[] };
  const defaults = raw as UnitDefaults;
  const byId = new Map(raw.units.filter((u) => u.Id).map((u) => [u.Id, decorateUnit(u, defaults)]));

  let fail = 0;
  const bad = (msg: string) => { console.log('  FAIL ' + msg); fail++; };

  console.log(`patch ${raw.version} · ${raw.units.length} units\n`);

  console.log('DPS by weapon category');
  for (const [id, label, expected] of DPS_CASES) {
    const u = byId.get(id);
    if (!u) { bad(`${label}: not found`); continue; }
    const parts: string[] = [];
    for (const [cat, want] of Object.entries(expected)) {
      const got = u.dpsByCategory[cat];
      const ok = got !== undefined && near(got, want);
      if (!ok) bad(`${label} ${cat}: expected ${want}, got ${got ?? 'none'}`);
      parts.push(`${cat} ${got === undefined ? 'none' : got.toFixed(1)}${ok ? '' : ` (want ${want})`}`);
    }
    console.log(`  ${label.padEnd(11)} ${parts.join(' · ')}`);
  }

  console.log('\nHP per mass, wreckage, veterancy');
  for (const [id, hpm, wreck, vet] of UNIT_CASES) {
    const u = byId.get(id);
    if (!u) { bad(`${id}: not found`); continue; }
    const gotHpm = fmtRatio(u.hpPerMass);
    if (gotHpm !== hpm) bad(`${u.name} hp/mass: expected ${hpm}, got ${gotHpm}`);
    if (wreck) {
      const w = u.wreckage;
      if (!w || w.mass !== wreck[0] || w.massInWater !== wreck[1] || w.health !== wreck[2]) {
        bad(`${u.name} wreckage: expected ${wreck.join('/')}, got ${w ? [w.mass, w.massInWater, w.health].join('/') : 'none'}`);
      }
    }
    if (vet) {
      const v = u.veterancy;
      if (!v || v.healthPerLevel !== vet[0] || v.regenPerLevel !== vet[1] || v.massToKillPerLevel !== vet[2]) {
        bad(`${u.name} veterancy: expected ${vet.join('/')}, got ${v ? [v.healthPerLevel, v.regenPerLevel, v.massToKillPerLevel].join('/') : 'none'}`);
      }
    }
    console.log(`  ${u.name.padEnd(18)} hp/mass ${gotHpm.padEnd(6)} wreck ${u.wreckage ? [u.wreckage.mass, u.wreckage.massInWater, u.wreckage.health].join('/') : '-'}`);
  }

  // Deploy artillery. The reference site's compare view renders an empty Offense
  // box for these, but the DPS is well defined; Serenity's shell carries
  // DoTPulses: 15, so it does 95 x 15 = 1425 damage per shot, not 95.
  console.log('\nDeploy artillery (damage-over-time shells)');
  const ARTY: Array<[string, number]> = [
    ['UEL0304', 75], ['URL0304', 67.2], ['XSL0304', 70], ['UAL0304', 71.3],
  ];
  for (const [id, want] of ARTY) {
    const u = byId.get(id)!;
    const got = u.dpsByCategory['Artillery'];
    if (got === undefined || !near(got, want, 0.06)) bad(`${u.name} artillery: expected ${want}, got ${got ?? 'none'}`);
    console.log(`  ${u.name.padEnd(12)} Artillery ${got?.toFixed(1)}`);
  }

  const withDps = [...byId.values()].filter((u) => u.directDps !== null).length;
  console.log(`\n${withDps} of ${byId.size} units have a direct-fire DPS.`);
  console.log(fail === 0 ? '\nAll checks passed.' : `\n${fail} CHECK(S) FAILED.`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
