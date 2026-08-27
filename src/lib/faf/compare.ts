import { fmtNum, fmtRatio, round } from './decorate';
import type { Unit } from './types';

export interface CompareCell {
  display: string;
  value: number | null;
}

export interface CompareRow {
  label: string;
  cells: CompareCell[];
  /** Index set of the winning column(s). Empty when a row is not ranked. */
  best: number[];
  lowerBetter: boolean;
  ranked: boolean;
  /** True when every column reads the same. */
  identical: boolean;
}

export interface CompareGroup {
  label: string;
  note: string;
  rows: CompareRow[];
}

const NONE: CompareCell = { display: 'None', value: null };
const cell = (display: string, value: number | null): CompareCell => ({ display, value });

function makeRow(
  label: string,
  cells: CompareCell[],
  { lowerBetter = false, ranked = true }: { lowerBetter?: boolean; ranked?: boolean } = {}
): CompareRow {
  const values = cells.map((c) => c.value).filter((v): v is number => v !== null);
  let best: number[] = [];
  if (ranked && values.length > 1) {
    const target = lowerBetter ? Math.min(...values) : Math.max(...values);
    best = cells.map((c, i) => (c.value === target ? i : -1)).filter((i) => i >= 0);
    // Everyone winning is nobody winning.
    if (best.length === cells.length) best = [];
  }
  const first = cells[0]?.display;
  return {
    label,
    cells,
    best,
    lowerBetter,
    ranked,
    identical: cells.every((c) => c.display === first),
  };
}

/** Weapon in a category that actually defines the unit's performance there. */
const leadWeapon = (u: Unit, category: string) =>
  u.weapons
    .filter((w) => w.category === category && w.dps !== null)
    .sort((a, b) => (b.dps ?? 0) - (a.dps ?? 0))[0];

export function buildCompare(units: Unit[]): CompareGroup[] {
  const groups: CompareGroup[] = [];

  groups.push({
    label: 'Cost',
    note: 'lower is better',
    rows: [
      makeRow('Mass', units.map((u) => cell(fmtNum(u.mass), u.mass)), { lowerBetter: true }),
      makeRow('Energy', units.map((u) => cell(fmtNum(u.energy), u.energy)), { lowerBetter: true }),
      makeRow('Build time', units.map((u) => cell(fmtNum(u.buildTime), u.buildTime)), { lowerBetter: true }),
    ],
  });

  const survivability: CompareRow[] = [
    makeRow('Health', units.map((u) => cell(fmtNum(u.health), u.health))),
    makeRow('HP per mass', units.map((u) => cell(fmtRatio(u.hpPerMass), u.hpPerMass))),
  ];
  if (units.some((u) => u.Defense?.Shield?.ShieldMaxHealth)) {
    survivability.push(
      makeRow(
        'Shield health',
        units.map((u) => {
          const s = u.Defense?.Shield?.ShieldMaxHealth;
          return s ? cell(fmtNum(s), s) : NONE;
        })
      )
    );
  }
  if (units.some((u) => u.wreckage)) {
    survivability.push(
      makeRow('Wreckage mass', units.map((u) => (u.wreckage ? cell(fmtNum(u.wreckage.mass), u.wreckage.mass) : NONE)))
    );
  }
  if (units.some((u) => u.veterancy)) {
    survivability.push(
      makeRow(
        'Health per vet level',
        units.map((u) => (u.veterancy ? cell(fmtNum(u.veterancy.healthPerLevel), u.veterancy.healthPerLevel) : NONE))
      )
    );
  }
  groups.push({ label: 'Survivability', note: 'higher is better', rows: survivability });

  // Weapon groups, strongest category first, capped so the table stays readable.
  const categories = new Map<string, number>();
  for (const u of units) {
    for (const [cat, dps] of Object.entries(u.dpsByCategory)) {
      if (dps <= 0) continue;
      categories.set(cat, Math.max(categories.get(cat) ?? 0, dps));
    }
  }
  const ordered = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);

  for (const cat of ordered) {
    const rows: CompareRow[] = [
      makeRow(
        'DPS',
        units.map((u) => {
          const dps = u.dpsByCategory[cat];
          return dps ? cell(fmtRatio(dps, 1), dps) : NONE;
        })
      ),
      makeRow(
        'DPS per mass',
        units.map((u) => {
          const dps = u.dpsByCategory[cat];
          if (!dps || !u.mass) return NONE;
          return cell(fmtRatio(dps / u.mass, 2), dps / u.mass);
        })
      ),
      makeRow(
        'Range',
        units.map((u) => {
          const w = leadWeapon(u, cat);
          return w?.MaxRadius ? cell(fmtNum(w.MaxRadius), w.MaxRadius) : NONE;
        })
      ),
      makeRow(
        'Damage per shot',
        units.map((u) => {
          const w = leadWeapon(u, cat);
          return w ? cell(fmtNum(round(w.fullDamage, 1)), w.fullDamage) : NONE;
        })
      ),
      makeRow(
        'Reload',
        units.map((u) => {
          const t = leadWeapon(u, cat)?.firingCycle?.cycleTime;
          return t ? cell(`${t.toFixed(1)} s`, t) : NONE;
        }),
        { lowerBetter: true }
      ),
    ];
    groups.push({ label: cat, note: 'higher is better', rows });
  }

  groups.push({
    label: 'Mobility & intel',
    note: 'higher is better',
    rows: [
      makeRow('Speed', units.map((u) => {
        const v = u.Physics?.MaxSpeed;
        return v === undefined ? NONE : cell(String(v), v);
      })),
      makeRow('Turn rate', units.map((u) => {
        const v = u.Physics?.TurnRate;
        return v === undefined ? NONE : cell(String(v), v);
      })),
      makeRow('Vision radius', units.map((u) => {
        const v = u.Intel?.VisionRadius;
        return v === undefined ? NONE : cell(String(v), v);
      })),
    ],
  });

  return groups.map((g) => ({ ...g, rows: g.rows.filter((r) => r.cells.some((c) => c.value !== null)) }))
    .filter((g) => g.rows.length > 0);
}
