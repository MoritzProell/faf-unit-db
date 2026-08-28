import { roleOf } from './roles';
import type { Faction, Kind, Tech, Unit } from './types';

/**
 * Faction-by-faction comparison of the same job at the same tier.
 *
 * "Who has the best T2 shield" is a question the per-unit pages cannot answer,
 * because answering it means holding all five factions' versions side by side.
 * A slot is one (domain, tier, role) triple; its rows are what each faction
 * fields for it, and the best value in every column is marked.
 *
 * Which columns appear depends on the role: comparing shields on DPS would be
 * noise, and comparing tanks on shield radius would be blank.
 */
export interface SlotMetric {
  key: string;
  label: string;
  value: (u: Unit) => number | null;
  format: (v: number) => string;
  /** Cost and upkeep are better when lower. */
  higherIsBetter: boolean;
}

const num = (v: number): string => Math.round(v).toLocaleString('en-GB').replace(/,/g, ' ');
const one = (v: number): string => v.toFixed(1);

const MASS: SlotMetric = {
  key: 'mass', label: 'Mass', value: (u) => u.mass || null, format: num, higherIsBetter: false,
};
const HEALTH: SlotMetric = {
  key: 'health', label: 'Health', value: (u) => u.health || null, format: num, higherIsBetter: true,
};
const DPS: SlotMetric = {
  key: 'dps', label: 'DPS', value: (u) => u.directDps, format: one, higherIsBetter: true,
};
const RANGE: SlotMetric = {
  key: 'range',
  label: 'Range',
  value: (u) =>
    (u.Weapon ?? []).reduce((m, w) => Math.max(m, (w.Damage ?? 0) > 0 ? (w.MaxRadius ?? 0) : 0), 0) || null,
  format: num,
  higherIsBetter: true,
};
const SPEED: SlotMetric = {
  key: 'speed', label: 'Speed', value: (u) => u.Physics?.MaxSpeed ?? null, format: (v) => v.toFixed(1), higherIsBetter: true,
};
const SHIELD_HP: SlotMetric = {
  key: 'shieldHp', label: 'Shield', value: (u) => u.Defense?.Shield?.ShieldMaxHealth ?? null, format: num, higherIsBetter: true,
};
const SHIELD_RADIUS: SlotMetric = {
  key: 'shieldRadius', label: 'Radius', value: (u) => u.Defense?.Shield?.ShieldSize ?? null, format: num, higherIsBetter: true,
};
const SHIELD_REGEN: SlotMetric = {
  key: 'shieldRegen', label: 'Regen', value: (u) => u.Defense?.Shield?.ShieldRegenRate ?? null, format: num, higherIsBetter: true,
};
/**
 * What a shield actually costs you. Raw shield HP says the Atha is the best T2
 * shield, but you do not buy one shield — you buy shield coverage, and the
 * question is what a thousand points of it costs in mass and in energy. On
 * that measure the answer is a different unit entirely.
 */
const shieldHp = (u: Unit): number => u.Defense?.Shield?.ShieldMaxHealth ?? 0;

const SHIELD_MASS_EFF: SlotMetric = {
  key: 'shieldMassEff',
  label: 'Mass / 1k',
  value: (u) => {
    const hp = shieldHp(u);
    return hp > 0 && u.mass > 0 ? (u.mass / hp) * 1000 : null;
  },
  format: (v) => v.toFixed(0),
  higherIsBetter: false,
};

const SHIELD_ENERGY_EFF: SlotMetric = {
  key: 'shieldEnergyEff',
  label: 'Energy / 1k',
  value: (u) => {
    const hp = shieldHp(u);
    return hp > 0 && u.energy > 0 ? (u.energy / hp) * 1000 : null;
  },
  format: num,
  higherIsBetter: false,
};

const UPKEEP: SlotMetric = {
  key: 'upkeep',
  label: 'Upkeep',
  value: (u) => (u.Economy as { MaintenanceConsumptionPerSecondEnergy?: number })?.MaintenanceConsumptionPerSecondEnergy ?? null,
  format: (v) => `${num(v)}/s`,
  higherIsBetter: false,
};
const HP_PER_MASS: SlotMetric = {
  key: 'hpm', label: 'HP / mass', value: (u) => u.hpPerMass || null, format: (v) => v.toFixed(2), higherIsBetter: true,
};

function metricsFor(role: string): SlotMetric[] {
  if (role === 'Shield') {
    return [SHIELD_HP, SHIELD_RADIUS, SHIELD_REGEN, SHIELD_MASS_EFF, SHIELD_ENERGY_EFF, UPKEEP];
  }
  if (role === 'Intel') return [MASS, HEALTH, RANGE, UPKEEP];
  if (role === 'Engineer' || role === 'Transport') return [MASS, HEALTH, SPEED];
  if (role === 'Artillery' || role === 'Missile') return [MASS, HEALTH, DPS, RANGE];
  return [MASS, HEALTH, HP_PER_MASS, DPS, RANGE];
}

export interface SlotRow {
  unit: Unit;
  values: Array<{ key: string; text: string; best: boolean }>;
}

export interface Slot {
  id: string;
  role: string;
  tech: Tech;
  techLabel: string;
  kind: Kind;
  label: string;
  metrics: SlotMetric[];
  rows: SlotRow[];
  /** One faction fields this and nobody else does. */
  unique: boolean;
  /** Factions with nothing in this slot at all. */
  missing: Faction[];
}

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];

const STRUCTURE_SLOT: Record<string, string> = {
  'Direct fire': 'point defence',
  Artillery: 'artillery installation',
  'Anti-air': 'anti-air installation',
  'Anti-navy': 'torpedo launcher',
  Missile: 'missile installation',
  Shield: 'shield generator',
  Intel: 'sensor',
};

export function buildSlots(all: Unit[]): Slot[] {
  const groups = new Map<string, Unit[]>();
  for (const u of all) {
    if (u.kind === 'Unknown') continue;
    const role = roleOf(u);
    if (role === 'Other') continue;
    const id = `${u.kind}|${u.tech}|${role}`;
    const list = groups.get(id);
    if (list) list.push(u);
    else groups.set(id, [u]);
  }

  const slots: Slot[] = [];
  for (const [id, list] of groups) {
    const [kind, tech, role] = id.split('|') as [Kind, Tech, string];
    const metrics = metricsFor(role);

    // Best value per column, computed before rows so ties can be left unmarked.
    const bests = new Map<string, number | null>();
    for (const m of metrics) {
      const vals = list.map(m.value).filter((v): v is number => v !== null && v > 0);
      if (vals.length < 2) { bests.set(m.key, null); continue; }
      const best = m.higherIsBetter ? Math.max(...vals) : Math.min(...vals);
      // A value shared by everything is not a distinction worth marking.
      bests.set(m.key, vals.filter((v) => v === best).length === vals.length ? null : best);
    }

    const rows: SlotRow[] = list
      .sort((a, b) => {
        const lead = metrics.find((m) => m.higherIsBetter) ?? metrics[0];
        return (lead.value(b) ?? 0) - (lead.value(a) ?? 0);
      })
      .map((unit) => ({
        unit,
        values: metrics.map((m) => {
          const v = m.value(unit);
          return {
            key: m.key,
            text: v === null || v <= 0 ? '—' : m.format(v),
            best: v !== null && bests.get(m.key) === v,
          };
        }),
      }));

    const present = new Set(list.map((u) => u.faction));
    // Match the unit pages: a "Special" slot says which kind it is.
    const specialLabel =
      role === 'Special'
        ? list.every((u) => (u.Categories ?? []).includes('BOMB'))
          ? 'one-shot unit'
          : list.every((u) => (u.Categories ?? []).includes('SNIPER'))
            ? 'sniper'
            : 'special unit'
        : undefined;
    const roleLabel =
      specialLabel ?? (kind === 'Base' ? STRUCTURE_SLOT[role] : undefined) ?? role.toLowerCase();
    const techLabel = tech === 'EXP' ? 'T4' : tech;

    slots.push({
      id,
      role,
      tech,
      techLabel,
      kind,
      label: `${techLabel} ${kind === 'Base' ? '' : `${kind.toLowerCase()} `}${roleLabel}`.replace(/\s+/g, ' '),
      metrics,
      rows,
      unique: present.size === 1,
      missing: FACTIONS.filter((f) => !present.has(f)),
    });
  }

  const KIND_ORDER: Kind[] = ['Land', 'Air', 'Naval', 'Base'];
  const TECH_ORDER: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
  return slots.sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      TECH_ORDER.indexOf(a.tech) - TECH_ORDER.indexOf(b.tech) ||
      a.role.localeCompare(b.role)
  );
}
