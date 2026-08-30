import type { Unit } from './types';
import { matchesExpr } from './engagement';
import { buildsOf } from './builds';

/**
 * Build power, and the build times that fall out of it.
 *
 * The game's own unit view shows a build time in seconds, but that number is
 * only true for one particular builder: it divides the blueprint's BuildTime by
 * the build power of whatever is making the unit, and assumes nothing is
 * assisting. So "37 seconds" is not a property of the unit at all, and a player
 * reading it off a factory page has no way to know what it would be from an
 * engineer, or with four engineers helping.
 *
 * The blueprint has both halves. `Economy.BuildTime` is the unit's cost in
 * build points and `Economy.BuildRate` is a builder's points per second, so
 *
 *     seconds = BuildTime / (sum of the build power working on it)
 *
 * and the resource drain follows from the same division: a unit that costs
 * 2100 energy and takes 30 seconds is pulling 70 energy a second while it is
 * up, which is the number that decides whether the build stalls.
 *
 * Build power is per unit and not a per-tier constant. A player asked for this
 * and offered a table from memory with T2 engineers at 10; the blueprints have
 * them between 13 and 50, because the factions differ and the Cybran hives and
 * UEF stations are engineers too. That spread is the reason to read it off each
 * unit rather than publish a table.
 */

export type BuilderKind = 'ACU' | 'sACU' | 'Engineer' | 'Drone' | 'Factory' | 'Other';

export interface Builder {
  id: string;
  slug: string;
  name: string;
  techLabel: string;
  hasRender: boolean;
  kind: BuilderKind;
  /** Build points per second this unit contributes. */
  power: number;
  /** Seconds for this builder alone to finish the target. */
  seconds: number;
  /** Whether the target is reached by upgrading this builder rather than building. */
  upgrade: boolean;
}

/**
 * Whether this unit's build power is build power at all.
 *
 * A mass extractor carries `BuildRate: 10` and a `BuildableCategory` of exactly
 * one literal id: the T2 extractor it upgrades into. That rate is how fast it
 * upgrades itself, not power it can lend to anything, and calling it build
 * power on the page would invite a player to count it toward an assist. Every
 * upgradeable structure has the same shape.
 *
 * The four categories are the game's own answer for engineers, factories and
 * commanders. `buildsOf` covers the ones that are factories without the
 * category — the Fatboy, the CZAR, the carriers, the Megalith and its eggs —
 * and it already drops structures unless named outright, which is what makes
 * the extractor's self-upgrade fall out.
 */
export function isBuilder(u: Unit, all: Unit[]): boolean {
  if (!buildPowerOf(u)) return false;
  const cats = u.Categories ?? [];
  if (cats.some((c) => c === 'ENGINEER' || c === 'FACTORY' || c === 'COMMAND' || c === 'SUBCOMMANDER')) {
    return true;
  }
  return buildsOf(u, all).length > 0;
}

/** A unit's build power, or 0 if it cannot build. */
export function buildPowerOf(u: Unit): number {
  const rate = (u.Economy as { BuildRate?: number } | undefined)?.BuildRate ?? 0;
  return rate > 0 ? rate : 0;
}

/** The cost in build points. Divided by build power, this is the time. */
export function buildPointsOf(u: Unit): number {
  return (u.Economy as { BuildTime?: number } | undefined)?.BuildTime ?? 0;
}

/** Seconds to build this unit at a given total build power. */
export function buildSeconds(u: Unit, power: number): number {
  const points = buildPointsOf(u);
  if (!points || power <= 0) return 0;
  return points / power;
}

/**
 * What the build costs per second at a given build power.
 *
 * The total never changes; the rate does. Doubling the build power halves the
 * time and doubles the drain, which is the whole reason assisting a factory can
 * put you into a stall that the factory alone would not have caused.
 */
export function buildDrain(u: Unit, power: number): { mass: number; energy: number } {
  const seconds = buildSeconds(u, power);
  if (!seconds) return { mass: 0, energy: 0 };
  const e = u.Economy as { BuildCostMass?: number; BuildCostEnergy?: number } | undefined;
  return {
    mass: (e?.BuildCostMass ?? 0) / seconds,
    energy: (e?.BuildCostEnergy ?? 0) / seconds,
  };
}

function kindOf(cats: Set<string>): BuilderKind {
  if (cats.has('COMMAND')) return 'ACU';
  if (cats.has('SUBCOMMANDER')) return 'sACU';
  if (cats.has('FACTORY')) return 'Factory';
  // POD before ENGINEER: the UEF engineering drones carry both, and they are
  // not engineers you build. They come off an ACU enhancement or an engineering
  // station, so a row reading "T3 Engineer" would send a player looking for a
  // unit that is not in any factory's list.
  if (cats.has('POD')) return 'Drone';
  if (cats.has('ENGINEER')) return 'Engineer';
  return 'Other';
}

const KIND_ORDER: BuilderKind[] = ['ACU', 'Engineer', 'Drone', 'Factory', 'sACU', 'Other'];

/**
 * Everything that can build this unit, with what each one takes.
 *
 * The inverse of `buildsOf`, resolved the same way and against the same field,
 * so the two can never disagree. One difference: `buildsOf` drops structures
 * from a factory's list to keep its own upgrade out of "builds", but here the
 * target is fixed and a factory that upgrades into it is a real and useful
 * answer to "how do I get one of these". It is listed, and flagged as an
 * upgrade rather than a build.
 */
export function buildersOf(unit: Unit, all: Unit[]): Builder[] {
  const cats = new Set(unit.Categories ?? []);
  const id = unit.Id.toLowerCase();
  const points = buildPointsOf(unit);
  if (!points) return [];

  const out: Builder[] = [];
  for (const u of all) {
    if (u.Id === unit.Id) continue;
    const power = buildPowerOf(u);
    if (!power) continue;

    const exprs = (u.Economy as { BuildableCategory?: string[] } | undefined)?.BuildableCategory;
    if (!exprs?.length) continue;

    // Two shapes in one field, as in buildsOf: mostly category expressions,
    // but the Megalith names its crab eggs by literal blueprint id.
    const byId = exprs.some((e) => !e.includes(' ') && e.toLowerCase() === id);
    const hit = byId || exprs.some((e) => e.includes(' ') && matchesExpr(e, cats));
    if (!hit) continue;

    const uCats = new Set(u.Categories ?? []);
    out.push({
      id: u.Id,
      slug: u.slug,
      name: u.name,
      techLabel: u.techLabel,
      hasRender: u.hasRender,
      kind: kindOf(uCats),
      power,
      seconds: points / power,
      // A factory reaching a structure is the factory upgrading into it, not
      // producing one: the target is a building and factories do not build.
      upgrade: uCats.has('FACTORY') && cats.has('STRUCTURE'),
    });
  }

  // Fastest first within a kind, and the ACU first overall, because the
  // question behind the table is usually "what have I got right now". Plainest
  // name first among equals, so the row that survives the collapse below reads
  // "Land Factory" rather than "Support Land Factory".
  out.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      b.power - a.power ||
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name)
  );

  /**
   * Collapse the rows that say the same thing twice.
   *
   * A tank is buildable by the land factory, its HQ and its support version at
   * every tier, which is nine rows carrying three distinct answers: the HQ and
   * the support factory of a tier have the same build power as the plain one,
   * so the time is identical and only the name differs.
   *
   * The key has to carry which factory it is, not just the tier and the power.
   * Keyed on those two alone it also collapsed the T2 land factory into the T2
   * air factory, which happen to share a build power of 40 while building
   * completely different things, and the engineer's table lost half its rows.
   */
  const base = (n: string) => n.replace(/\s+HQ$/, '').replace(/^Support\s+/, '');
  const seen = new Set<string>();
  return out.filter((b) => {
    const key = `${b.kind}|${b.techLabel}|${b.power}|${base(b.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Seconds, at the precision the number deserves. */
export function fmtSeconds(s: number): string {
  if (!s) return '–';
  if (s < 10) return `${Math.round(s * 10) / 10}s`;
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m}m ${r}s` : `${m}m`;
}
