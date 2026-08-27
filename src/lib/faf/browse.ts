import { roleOf } from './roles';
import { enhancementsOf } from './enhancements';
import type { Faction, Kind, Tech, Unit } from './types';

export const ROLE_CATEGORY: Record<string, string> = {
  direct: 'DIRECTFIRE',
  artillery: 'ARTILLERY',
  antiair: 'ANTIAIR',
  antinavy: 'ANTINAVY',
  shield: 'SHIELD',
  intel: 'INTELLIGENCE',
  engineer: 'ENGINEER',
};

export const ROLE_LABEL: Record<string, string> = {
  direct: 'Direct fire',
  artillery: 'Artillery',
  antiair: 'Anti-air',
  antinavy: 'Anti-navy',
  shield: 'Shield',
  intel: 'Intel',
  engineer: 'Engineer',
  commander: 'Commander',
};

export const ROLE_KEYS = Object.keys(ROLE_LABEL);

/** Everything the browse screen needs, and nothing else. ~11 kB gzipped. */
export interface BrowseUnit {
  id: string;
  slug: string;
  name: string;
  faction: Faction;
  kind: Kind;
  tech: Tech;
  techLabel: string;
  role: string;
  type: string;
  section: string;
  /** Battlefield function, used to line units up across factions. */
  roleKey: string;
  abilities: string[];
  roles: string[];
  /** Commander upgrade names, so a search for "Nano-Repair" finds its commander. */
  upgrades: string[];
  health: number;
  mass: number;
  energy: number;
  buildTime: number;
  hpPerMass: number;
  hasRender: boolean;
  directDps: number | null;
  dpsPerMass: number | null;
  speed: number | null;
}

export function rolesOf(unit: Unit): string[] {
  const cats = unit.Categories || [];
  const out = Object.entries(ROLE_CATEGORY)
    .filter(([, cat]) => cats.includes(cat))
    .map(([key]) => key);
  if (unit.isCommand || unit.isSub) out.push('commander');
  return out;
}

export function toBrowseUnit(u: Unit): BrowseUnit {
  return {
    id: u.Id,
    slug: u.slug,
    name: u.name,
    faction: u.faction,
    kind: u.kind,
    tech: u.tech,
    techLabel: u.techLabel,
    role: u.role,
    type: u.type,
    section: u.section,
    roleKey: roleOf(u.Categories),
    abilities: u.abilities,
    roles: rolesOf(u),
    upgrades: enhancementsOf(u).map((e) => e.name),
    health: u.health,
    mass: u.mass,
    energy: u.energy,
    buildTime: u.buildTime,
    hpPerMass: u.hpPerMass,
    hasRender: u.hasRender,
    directDps: u.directDps,
    dpsPerMass: u.directDps && u.mass ? u.directDps / u.mass : null,
    speed: u.Physics?.MaxSpeed ?? null,
  };
}

export type SortKey = 'hpPerMass' | 'dpsPerMass' | 'directDps' | 'health' | 'mass' | 'speed';

export interface SortDef {
  key: SortKey;
  label: string;
  /** Shown as the third figure on each tile so the sort is visible, not implied. */
  tileLabel: string;
  direction: 'asc' | 'desc';
  format: (u: BrowseUnit) => string;
  value: (u: BrowseUnit) => number | null;
}

const ratio = (val: number, dp = 3): string => {
  const m = 10 ** dp;
  return (Math.floor(Math.abs(val) * m + 0.5) / m).toString();
};

export const SORTS: Record<SortKey, SortDef> = {
  hpPerMass: {
    key: 'hpPerMass', label: 'HP per mass', tileLabel: 'HP / mass', direction: 'desc',
    value: (u) => u.hpPerMass, format: (u) => ratio(u.hpPerMass),
  },
  dpsPerMass: {
    key: 'dpsPerMass', label: 'DPS per mass', tileLabel: 'DPS / mass', direction: 'desc',
    value: (u) => u.dpsPerMass, format: (u) => (u.dpsPerMass === null ? '–' : ratio(u.dpsPerMass)),
  },
  directDps: {
    key: 'directDps', label: 'Direct-fire DPS', tileLabel: 'DPS', direction: 'desc',
    value: (u) => u.directDps, format: (u) => (u.directDps === null ? '–' : ratio(u.directDps, 1)),
  },
  health: {
    key: 'health', label: 'Health', tileLabel: 'Health', direction: 'desc',
    value: (u) => u.health, format: (u) => fmt(u.health),
  },
  mass: {
    key: 'mass', label: 'Mass cost', tileLabel: 'Mass', direction: 'asc',
    value: (u) => u.mass, format: (u) => fmt(u.mass),
  },
  speed: {
    key: 'speed', label: 'Speed', tileLabel: 'Speed', direction: 'desc',
    value: (u) => u.speed, format: (u) => (u.speed === null ? '–' : ratio(u.speed, 2)),
  },
};

export const SORT_ORDER: SortKey[] = ['hpPerMass', 'dpsPerMass', 'directDps', 'health', 'mass', 'speed'];

export function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '–';
  const parts = val.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

export { ratio };
