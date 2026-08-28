import { isAirCrash } from './dps';
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

  // The units that do something the stat table has no row for at all.
  if (c.has('BOMB')) {
    // The payload never shows as DPS: the Fire Beetle carries a 1-damage
    // Kamikaze trigger and a separate 1100-damage Death weapon, and the Mercy
    // puts everything on the Kamikaze itself. Take the largest of the two, or
    // the page reports a one-way attack that does 1 damage.
    // fullDamage, not raw Damage: the Mercy releases six projectiles of 350,
    // so the raw field understates its payload by a factor of six.
    const payload = Math.max(
      0,
      ...(unit.weapons ?? [])
        .filter((w) => w.WeaponCategory === 'Kamikaze' || w.WeaponCategory === 'Death' || (w.Label ?? '') === 'DeathWeapon')
        .map((w) => w.fullDamage ?? w.Damage ?? 0)
    );
    if (payload > 0) {
      out.push({
        label: 'One-way trip',
        detail: `${payload.toLocaleString('en-GB').replace(/,/g, ' ')} damage, delivered once, by dying. It carries no ordinary weapon, so it shows no DPS.`,
      });
    }
  }

  if ((unit.Weapon ?? []).some((w) => /tractor/i.test(String(w.Label ?? '')))) {
    out.push({
      label: 'Tractor beam',
      detail: 'Drags mobile units in and crushes them, which no amount of health prevents.',
    });
  }

  // A transport with real guns, or a gunship that happens to carry a unit.
  const carries = unit.Transport?.Class1Capacity ?? 0;
  const armed = weapons(unit).some((w) => w.WeaponCategory !== 'Death');
  if (c.has('TRANSPORTATION') && carries > 0 && armed) {
    out.push(
      carries === 1
        ? {
            label: 'Carries one unit',
            detail: 'A gunship with a transport clamp: it can lift a single unit and still fight.',
          }
        : {
            label: `Armed transport, carries ${carries}`,
            detail: 'Shoots back rather than relying on an escort, and can support what it drops.',
          }
    );
  }

  // Three units are filed as bombers but attack the ground with a forward-firing
  // missile rather than a dropped bomb: the Cybran Corsair and the Nomads
  // Phoenix and Spitfire. The game itself puts that weapon under Direct Fire,
  // which is why their pages show a Direct Fire block and an empty Bomb one —
  // it reads as an error and is not.
  if (c.has('BOMBER') && c.has('AIR')) {
    const ground = weapons(unit).find(
      (w) => w.WeaponCategory === 'Direct Fire' && !isAirCrash(w)
    );
    const bomb = (unit.Weapon ?? []).some((w) => w.WeaponCategory === 'Bomb');
    if (ground && !bomb) {
      out.push({
        label: 'Fires rockets, does not drop bombs',
        detail: `Its ground attack is a missile at range ${ground.MaxRadius ?? 0}, which the game files under direct fire rather than as a bomb.`,
      });
    }
  }

  if (c.has('CAPTURE')) {
    out.push({ label: 'Can capture', detail: 'Takes enemy structures intact instead of destroying them.' });
  }

  return out;
}
