import type { Unit } from './types';

/**
 * The properties that decide a fight but never appear as a number on the page.
 *
 * A unit's mass, health and DPS are all visible; that it can shoot while being
 * carried, or that its AA is a token gun rather than a real defence, is not.
 * These are the things a player learns from being surprised by them, and every
 * one is read off the blueprint rather than asserted.
 */
export interface Notable {
  label: string;
  detail: string;
}

const cats = (u: Unit) => new Set(u.Categories ?? []);
const weapons = (u: Unit) => (u.Weapon ?? []).filter((w) => (w.Damage ?? 0) > 0);

export function notablesOf(unit: Unit): Notable[] {
  const c = cats(unit);
  const out: Notable[] = [];

  if (unit.Transport?.CanFireFromTransport) {
    out.push({
      label: 'Fires from transport',
      detail: 'Keeps shooting while being carried, so a loaded transport is an attack.',
    });
  }

  if (c.has('STEALTHFIELD')) {
    out.push({
      label: 'Stealth field',
      detail: 'Hides nearby units from radar, not from sight.',
    });
  } else if (c.has('STEALTH')) {
    out.push({ label: 'Radar stealth', detail: 'Does not appear on radar; still visible to sight.' });
  }

  if (c.has('COUNTERINTELLIGENCE') && !c.has('STEALTHFIELD')) {
    out.push({ label: 'Counter-intelligence', detail: 'Jams or blocks enemy sensors in an area.' });
  }

  if (c.has('ANTIMISSILE')) {
    out.push({
      label: 'Tactical missile defence',
      detail: 'Intercepts incoming tactical missiles within its radius.',
    });
  }

  if (c.has('ANTITORPEDO')) {
    out.push({ label: 'Torpedo defence', detail: 'Shoots down incoming torpedoes.' });
  }

  if (c.has('WEAKANTIAIR')) {
    out.push({
      label: 'Token anti-air only',
      detail: 'Carries an AA gun, but not enough of one to be an air defence.',
    });
  }

  // Several shots per trigger pull matters against point defence and against
  // tactical missile defence, which intercepts one projectile at a time.
  const salvo = weapons(unit).find((w) => (w.ProjectilesPerOnFire ?? 1) > 1);
  if (salvo) {
    out.push({
      label: `Fires ${salvo.ProjectilesPerOnFire} projectiles per shot`,
      detail: 'Interceptors and point defence handle one projectile at a time, so a split shot gets more through.',
    });
  }

  const antiShield = weapons(unit).find((w) => w.DamageToShields);
  if (antiShield) {
    out.push({
      label: 'Extra damage to shields',
      detail: `Deals ${antiShield.DamageToShields} to shields rather than its listed damage.`,
    });
  }

  if (unit.Defense?.Shield?.PersonalShield) {
    out.push({ label: 'Personal shield', detail: 'Carries its own shield bubble rather than relying on cover.' });
  }

  // A warship that walks ashore, or a destroyer that dives, is the kind of thing
  // players find out about by losing to it. Both are motion-type facts that no
  // stat on the page exposes.
  if (c.has('NAVAL') && c.has('AMPHIBIOUS')) {
    out.push({
      label: 'Comes ashore',
      detail: 'A warship that can climb out of the water and keep fighting on land.',
    });
  }

  // There is no SUBMARINE category — a submarine is just NAVAL + SUBMERSIBLE,
  // so diving is only worth remarking on for something with a surface ship's
  // class. Otherwise this fires on every submarine to announce it submerges.
  const SURFACE_CLASS = ['DESTROYER', 'FRIGATE', 'CRUISER', 'BATTLESHIP', 'BATTLECRUISER'];
  if (c.has('SUBMERSIBLE') && SURFACE_CLASS.some((k) => c.has(k))) {
    out.push({
      label: 'Submerges',
      detail: 'Dives like a submarine, so surface-only weapons lose the target.',
    });
  }

  if (c.has('AMPHIBIOUS') && c.has('LAND')) {
    out.push({ label: 'Amphibious', detail: 'Walks along the seabed, so water is not a wall.' });
  } else if (c.has('HOVER')) {
    out.push({ label: 'Hover', detail: 'Crosses water on the surface, and can be hit by torpedoes while doing it.' });
  }

  if (c.has('CAPTURE')) {
    out.push({ label: 'Can capture', detail: 'Takes enemy structures intact instead of destroying them.' });
  }

  return out;
}
