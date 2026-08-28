import { roleOf } from './roles';
import { primaryWeapon } from './dps';
import type { Tech, Unit } from './types';

export interface Superlative {
  /** Short claim, e.g. "Toughest T3 tank". */
  label: string;
  /** The figure that backs it, e.g. "9 000 hp". */
  value: string;
}

export interface Cohort {
  label: string;
  size: number;
  healthRank: number;
  healthPercent: number;
  hpPerMassRank: number;
  hpPerMassPercent: number;
  /** Damage rank, counted only among units in the cohort that are armed. */
  dpsRank: number;
  dpsPercent: number;
  dpsCohortSize: number;
  /** The same job, done by the other factions. */
  peers: Unit[];
  /** True when no other faction fields anything in this slot at all. */
  unique: boolean;
  /** How the slot is named, e.g. "T3 point defence". */
  slotLabel: string;
  /** Set when the peers come from a neighbouring tier because this slot is unique. */
  peerTech: Tech | null;
  superlatives: Superlative[];
}

const num = (v: number): string => v.toLocaleString('en-GB').replace(/,/g, ' ');

/** Longest reach of any of the unit's weapons. */
const maxRange = (u: Unit): number =>
  (u.Weapon ?? []).reduce((m, w) => Math.max(m, (w.Damage ?? 0) > 0 ? (w.MaxRadius ?? 0) : 0), 0);

const shieldHealth = (u: Unit): number => u.Defense?.Shield?.ShieldMaxHealth ?? 0;

/**
 * Ranks a unit against the units it actually competes with, and against the
 * other factions' answer to the same job.
 *
 * Peers used to be nearest-by-build-cost within a domain and tier, which put a
 * missile submarine next to a battleship because they cost about the same. What
 * a player actually wants is the cross-faction comparison: this is the UEF one,
 * here is what Cybran, Aeon and Seraphim field in the same slot. So peers are
 * now one unit per other faction, matched on role and tier.
 */
export function buildCohort(unit: Unit, all: Unit[]): Cohort {
  const role = roleOf(unit);

  // Ranking cohort: same domain and tier. Broad on purpose — "7th of 27 in T1
  // Land" is a more useful sense of scale than a rank out of four.
  // Nomads is a mod faction, so it stays out of the core factions' rankings —
  // but a Nomads unit still needs a cohort of its own, and excluding it
  // unconditionally left every Nomads page reading "0th of 27".
  const cohort = all.filter(
    (u) =>
      u.kind === unit.kind &&
      u.tech === unit.tech &&
      u.health > 0 &&
      (u.faction !== 'Nomads' || unit.faction === 'Nomads')
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

  // Damage is ranked among the armed only. "12th of 41 in T2 Naval" counted
  // against sonar platforms and shield boats, which is not a ranking of
  // anything. The measure is the unit's primary weapon, the same figure the
  // card above it shows.
  const primaryDps = (u: Unit): number => primaryWeapon(u.weapons)?.dps ?? 0;
  const armed = cohort.filter((u) => primaryDps(u) > 0);
  const armedSorted = [...armed].sort((a, b) => primaryDps(b) - primaryDps(a));
  const dpsRank = armedSorted.findIndex((u) => u.Id === unit.Id) + 1;
  const dpsValues = armedSorted.map(primaryDps);
  const dpsMin = dpsValues[dpsValues.length - 1] ?? 0;
  const dpsMax = dpsValues[0] ?? 0;
  const dpsSpan = dpsMax - dpsMin;
  const dpsPercent =
    dpsSpan > 0
      ? Math.max(2, Math.min(100, ((primaryDps(unit) - dpsMin) / dpsSpan) * 100))
      : 100;

  // Slot cohort: the same job at the same tier, across every faction. This is
  // what "the only T3 point defence" and "the best T2 shield" are claims about,
  // so Nomads counts — leaving it out would let the site state a false only.
  const slot = all.filter(
    (u) => roleOf(u) === role && u.tech === unit.tech && u.kind === unit.kind
  );

  // "Other" is a bucket, not a job. Comparing a quantum gateway against a
  // resource generator because both landed in it is worse than saying nothing.
  const isSlot = role !== 'Other';

  const FACTION_ORDER = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
  const pickPeers = (pool: Unit[]) =>
    FACTION_ORDER.filter((f) => f !== unit.faction)
      .map((f) => {
        const inFaction = pool.filter((u) => u.faction === f && u.Id !== unit.Id);
        // More than one candidate happens (two T3 gunships, say); take the
        // nearest in cost, which is the closest thing to "the equivalent".
        return inFaction.sort(
          (a, b) => Math.abs(a.mass - unit.mass) - Math.abs(b.mass - unit.mass)
        )[0];
      })
      .filter((u): u is Unit => Boolean(u));

  let peers = isSlot ? pickPeers(slot) : [];

  /**
   * When a unit is the only one of its kind at its tier, the cross-faction
   * comparison is empty and the panel says nothing. The nearest tier that
   * fields the same job is the honest substitute: the Seraphim Athanah is the
   * only T3 mobile shield in the game, and what a player wants to know is how
   * it measures against the T2 mobile shields they would otherwise build.
   */
  const TIERS: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
  let peerTech: Tech | null = null;
  if (isSlot && peers.length === 0) {
    const here = TIERS.indexOf(unit.tech);
    for (const step of [-1, 1, -2, 2]) {
      const t = TIERS[here + step];
      if (!t) continue;
      const pool = all.filter(
        (u) => roleOf(u) === role && u.kind === unit.kind && u.tech === t
      );
      const found = pickPeers(pool);
      if (found.length > 0) {
        peers = found;
        peerTech = t;
        break;
      }
    }
  }

  // Structures are named for what players call them, not for the category the
  // engine files them under: a Ravager is a point defence, not a "direct fire".
  const STRUCTURE_SLOT: Record<string, string> = {
    'Direct fire': 'point defence',
    Artillery: 'artillery installation',
    'Anti-air': 'anti-air installation',
    'Anti-navy': 'torpedo launcher',
    Missile: 'missile installation',
    Shield: 'shield generator',
    Intel: 'sensor',
  };
  // "Special" is a bucket, not a description. Say which kind of special.
  const cats = new Set(unit.Categories ?? []);
  const specialLabel =
    role === 'Special' ? (cats.has('BOMB') ? 'one-shot unit' : 'sniper') : undefined;
  const roleLabel =
    specialLabel ?? (unit.kind === 'Base' ? STRUCTURE_SLOT[role] : undefined) ?? role.toLowerCase();
  // Name the domain when the same job exists in more than one of them,
  // otherwise a land one-shot unit and an air one-shot unit each announce
  // themselves as "the only T2 one-shot unit in the game".
  const sameJobElsewhere = all.some(
    (u) => roleOf(u) === role && u.tech === unit.tech && u.kind !== unit.kind
  );
  const domain = sameJobElsewhere && unit.kind !== 'Base' ? `${unit.kind.toLowerCase()} ` : '';
  const slotLabel = `${unit.techLabel} ${domain}${roleLabel}`;

  // Only claim a superlative when there is a field to lead. Two units make a
  // pair, not a ranking.
  const superlatives: Superlative[] = [];
  if (isSlot && slot.length >= 3) {
    const best = (
      value: (u: Unit) => number,
      label: string,
      fmt: (v: number) => string
    ) => {
      const v = value(unit);
      if (v <= 0) return;
      const top = Math.max(...slot.map(value));
      const ties = slot.filter((u) => value(u) === top).length;
      if (v === top && ties === 1) superlatives.push({ label, value: fmt(v) });
    };
    best((u) => u.health, `Toughest ${slotLabel}`, (v) => `${num(v)} hp`);
    best((u) => u.hpPerMass, `Best health per mass of any ${slotLabel}`, (v) => v.toFixed(2));
    best((u) => u.directDps ?? 0, `Most damage of any ${slotLabel}`, (v) => `${v.toFixed(0)} dps`);
    best((u) => maxRange(u), `Longest reach of any ${slotLabel}`, (v) => `${num(v)} range`);
    best((u) => shieldHealth(u), `Strongest shield of any ${slotLabel}`, (v) => `${num(v)} hp`);
    // What a shield costs per point of protection, which is the comparison that
    // decides which one you actually build.
    best(
      (u) => (shieldHealth(u) > 0 && u.mass > 0 ? (shieldHealth(u) / u.mass) * 100 : 0),
      `Most shield per mass of any ${slotLabel}`,
      (v) => `${v.toFixed(0)} hp per 100 mass`
    );
    best(
      (u) => (shieldHealth(u) > 0 && u.energy > 0 ? (shieldHealth(u) / u.energy) * 1000 : 0),
      `Most shield per energy of any ${slotLabel}`,
      (v) => `${v.toFixed(0)} hp per 1000 energy`
    );
    best((u) => u.Physics?.MaxSpeed ?? 0, `Fastest ${slotLabel}`, (v) => String(v));
    // Splash is what separates two units with the same damage: a gunship that
    // hits an area is a different unit from one that hits a target.
    best(
      (u) => primaryWeapon(u.weapons)?.DamageRadius ?? 0,
      `Widest splash of any ${slotLabel}`,
      (v) => `${v} radius`
    );
  }

  return {
    label: `${unit.techLabel} ${unit.kind === 'Base' ? 'Structures' : unit.kind}`,
    size: cohort.length,
    healthRank: health.rank,
    healthPercent: health.percent,
    hpPerMassRank: hpm.rank,
    hpPerMassPercent: hpm.percent,
    dpsRank,
    dpsPercent,
    dpsCohortSize: armed.length,
    peers,
    unique: isSlot && slot.length === 1,
    peerTech,
    slotLabel,
    superlatives,
  };
}

export const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
