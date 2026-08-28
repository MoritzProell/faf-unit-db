import type { Unit } from './types';
import { matchesExpr } from './engagement';

/**
 * What a unit can build.
 *
 * A factory page said what the factory costs and nothing about what it is for.
 * The blueprint knows: `Economy.BuildableCategory` is a list of category
 * expressions, and a unit is buildable if it matches any of them. Same field
 * answers the same question for the things that are factories without being
 * called one — the Fatboy, the Atlantis, the CZAR, the naval carriers, and the
 * Megalith, whose list is five literal blueprint ids rather than expressions.
 *
 * Resolved against the roster rather than described in prose, so it moves with
 * the patch: a unit added to a tier appears in its factory's list unprompted.
 */
export interface Buildable {
  id: string;
  slug: string;
  name: string;
  role: string;
  tech: string;
  techLabel: string;
  hasRender: boolean;
}

/** Units this one can produce, or an empty list if it produces nothing. */
export function buildsOf(unit: Unit, all: Unit[]): Buildable[] {
  const exprs = (unit.Economy as { BuildableCategory?: string[] } | undefined)?.BuildableCategory;
  if (!exprs?.length) return [];

  // Two shapes in one field. Most entries are category expressions; the
  // Megalith's are literal blueprint ids, lowercased.
  const ids = new Set(
    exprs.filter((e) => !e.includes(' ')).map((e) => e.toLowerCase())
  );
  const patterns = exprs.filter((e) => e.includes(' '));

  const out: Buildable[] = [];
  for (const u of all) {
    if (u.Id === unit.Id) continue;
    const cats = new Set(u.Categories ?? []);
    // A factory's expression list also matches the factory upgrade it turns
    // into. That is a real thing it can build and a confusing thing to list
    // under "builds", so structures are left out unless named outright.
    const byId = ids.has(u.Id.toLowerCase());
    if (!byId && cats.has('STRUCTURE')) continue;
    const hit = byId || patterns.some((p) => matchesExpr(p, cats));
    if (!hit) continue;
    out.push({
      id: u.Id,
      slug: u.slug,
      name: u.name,
      role: u.role,
      tech: u.tech,
      techLabel: u.techLabel,
      hasRender: u.hasRender,
    });
  }

  // Cheapest first: a factory's list reads as a build order, not an inventory.
  return out.sort(
    (a, b) =>
      (all.find((u) => u.Id === a.id)?.mass ?? 0) - (all.find((u) => u.Id === b.id)?.mass ?? 0) ||
      a.name.localeCompare(b.name)
  );
}
