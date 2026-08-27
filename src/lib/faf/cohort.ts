import type { Unit } from './types';

export interface Cohort {
  label: string;
  size: number;
  healthRank: number;
  healthPercent: number;
  hpPerMassRank: number;
  hpPerMassPercent: number;
  peers: Unit[];
}

/**
 * Ranks a unit against the units it actually competes with: same domain, same
 * tier. A raw "best HP per mass in the game" number is meaningless when wall
 * sections are in the set.
 */
export function buildCohort(unit: Unit, all: Unit[]): Cohort {
  const cohort = all.filter(
    (u) => u.kind === unit.kind && u.tech === unit.tech && u.faction !== 'Nomads' && u.health > 0
  );

  const rankOf = (value: (u: Unit) => number) => {
    const sorted = [...cohort].sort((a, b) => value(b) - value(a));
    const rank = sorted.findIndex((u) => u.Id === unit.Id) + 1;
    const values = sorted.map(value);
    const min = values[values.length - 1] ?? 0;
    const max = values[0] ?? 0;
    const span = max - min;
    const percent = span > 0 ? ((value(unit) - min) / span) * 100 : 100;
    return { rank, percent: Math.max(2, Math.min(100, percent)) };
  };

  const health = rankOf((u) => u.health);
  const hpm = rankOf((u) => u.hpPerMass);

  // Nearest neighbours by build cost make the most useful "instead of this" list.
  const peers = cohort
    .filter((u) => u.Id !== unit.Id)
    .sort((a, b) => Math.abs(a.mass - unit.mass) - Math.abs(b.mass - unit.mass))
    .slice(0, 3);

  return {
    label: `${unit.techLabel} ${unit.kind === 'Base' ? 'Structures' : unit.kind}`,
    size: cohort.length,
    healthRank: health.rank,
    healthPercent: health.percent,
    hpPerMassRank: hpm.rank,
    hpPerMassPercent: hpm.percent,
    peers,
  };
}

export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
