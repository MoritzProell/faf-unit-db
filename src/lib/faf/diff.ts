/**
 * Computes what actually changed between two patches, from the blueprints
 * themselves rather than from prose.
 *
 * FAF's written notes are the "why". This is the "exactly what": every unit
 * whose cost, survivability, mobility, intel or weapons moved, including changes
 * the notes summarise or leave out.
 */
import type { Unit } from './types';

export interface FieldChange {
  label: string;
  from: number | string | null;
  to: number | string | null;
  /** True when a bigger number is better, for colouring. Omitted when neutral. */
  higherIsBetter?: boolean;
}

export interface UnitChange {
  id: string;
  slug: string;
  name: string;
  faction: string;
  techLabel: string;
  role: string;
  fields: FieldChange[];
}

export interface PatchDiff {
  version: string;
  previousVersion: string;
  added: Array<{ id: string; slug: string; name: string; faction: string; role: string }>;
  removed: Array<{ id: string; name: string; faction: string }>;
  changed: UnitChange[];
  /** FAF's own notes for this patch, as markdown-ish sections. */
  notes?: Array<{ heading: string; items: string[] }>;
  notesUrl?: string;
}

type Probe = { label: string; get: (u: Unit) => number | null | undefined; higherIsBetter?: boolean };

const round = (v: number, dp = 2) => Math.round(v * 10 ** dp) / 10 ** dp;

const UNIT_PROBES: Probe[] = [
  { label: 'Mass', get: (u) => u.mass, higherIsBetter: false },
  { label: 'Energy', get: (u) => u.energy, higherIsBetter: false },
  { label: 'Build time', get: (u) => u.buildTime, higherIsBetter: false },
  { label: 'Health', get: (u) => u.health, higherIsBetter: true },
  { label: 'Regen', get: (u) => u.Defense?.RegenRate, higherIsBetter: true },
  { label: 'Shield health', get: (u) => u.Defense?.Shield?.ShieldMaxHealth, higherIsBetter: true },
  { label: 'Shield regen', get: (u) => u.Defense?.Shield?.ShieldRegenRate, higherIsBetter: true },
  { label: 'Speed', get: (u) => u.Physics?.MaxSpeed, higherIsBetter: true },
  { label: 'Turn rate', get: (u) => u.Physics?.TurnRate, higherIsBetter: true },
  { label: 'Vision radius', get: (u) => u.Intel?.VisionRadius, higherIsBetter: true },
  { label: 'Radar radius', get: (u) => u.Intel?.RadarRadius, higherIsBetter: true },
  { label: 'Sonar radius', get: (u) => u.Intel?.SonarRadius, higherIsBetter: true },
];

/** Per-weapon probes, matched between patches by display name. */
const WEAPON_PROBES: Array<{ label: string; get: (w: Unit['weapons'][number]) => number | null | undefined; higherIsBetter?: boolean }> = [
  { label: 'DPS', get: (w) => w.dps, higherIsBetter: true },
  { label: 'damage', get: (w) => w.fullDamage, higherIsBetter: true },
  { label: 'range', get: (w) => w.MaxRadius, higherIsBetter: true },
  { label: 'rate of fire', get: (w) => w.RateOfFire, higherIsBetter: true },
  { label: 'damage radius', get: (w) => w.DamageRadius, higherIsBetter: true },
];

const num = (v: number | null | undefined): number | null =>
  v === null || v === undefined || Number.isNaN(v) ? null : round(v);

function listDiff(before: string[], after: string[]): { added: string[]; removed: string[] } {
  const b = new Set(before);
  const a = new Set(after);
  return {
    added: [...a].filter((x) => !b.has(x)).sort(),
    removed: [...b].filter((x) => !a.has(x)).sort(),
  };
}

function unitFieldChanges(before: Unit, after: Unit): FieldChange[] {
  const out: FieldChange[] = [];

  for (const p of UNIT_PROBES) {
    const from = num(p.get(before));
    const to = num(p.get(after));
    if (from === to) continue;
    out.push({ label: p.label, from, to, higherIsBetter: p.higherIsBetter });
  }

  // Weapons are matched by display name; a renamed weapon reads as one removed
  // and one added, which is the honest result rather than a guessed pairing.
  const bw = new Map(before.weapons.map((w) => [w.DisplayName ?? w.Label ?? '?', w]));
  const aw = new Map(after.weapons.map((w) => [w.DisplayName ?? w.Label ?? '?', w]));
  for (const [name, w] of aw) {
    const prev = bw.get(name);
    if (!prev) {
      out.push({ label: `Weapon added: ${name}`, from: null, to: 'new' });
      continue;
    }
    for (const p of WEAPON_PROBES) {
      const from = num(p.get(prev));
      const to = num(p.get(w));
      if (from === to) continue;
      out.push({ label: `${name} ${p.label}`, from, to, higherIsBetter: p.higherIsBetter });
    }
  }
  for (const name of bw.keys()) {
    if (!aw.has(name)) out.push({ label: `Weapon removed: ${name}`, from: 'present', to: null });
  }

  const ab = listDiff(before.abilities, after.abilities);
  for (const x of ab.added) out.push({ label: 'Ability gained', from: null, to: x });
  for (const x of ab.removed) out.push({ label: 'Ability lost', from: x, to: null });

  const cat = listDiff(before.Categories ?? [], after.Categories ?? []);
  for (const x of cat.added) out.push({ label: 'Category added', from: null, to: x });
  for (const x of cat.removed) out.push({ label: 'Category removed', from: x, to: null });

  return out;
}

export function diffPatches(before: Unit[], after: Unit[]): Omit<PatchDiff, 'version' | 'previousVersion'> {
  const b = new Map(before.map((u) => [u.Id, u]));
  const a = new Map(after.map((u) => [u.Id, u]));

  const added = [...a.values()]
    .filter((u) => !b.has(u.Id))
    .map((u) => ({ id: u.Id, slug: u.slug, name: u.name, faction: u.faction, role: u.role }));

  const removed = [...b.values()]
    .filter((u) => !a.has(u.Id))
    .map((u) => ({ id: u.Id, name: u.name, faction: u.faction }));

  const changed: UnitChange[] = [];
  for (const [id, after_] of a) {
    const before_ = b.get(id);
    if (!before_) continue;
    const fields = unitFieldChanges(before_, after_);
    if (!fields.length) continue;
    changed.push({
      id,
      slug: after_.slug,
      name: after_.name,
      faction: after_.faction,
      techLabel: after_.techLabel,
      role: after_.role,
      fields,
    });
  }
  changed.sort((x, y) => y.fields.length - x.fields.length || x.name.localeCompare(y.name));

  return { added, removed, changed };
}
