/**
 * A unit's battlefield role, derived from the game's own categories.
 *
 * This exists so the roster can line units up by function across factions.
 * The blueprint `Description` cannot do that job, because the same role is
 * named differently per faction, and the chassis categories cannot do it alone
 * either: the Mantis is a BOT and the Striker is a TANK, but they are the same
 * T1 slot and a player picking one over the other is choosing between
 * equivalents. So land direct-fire is grouped by what a unit is *for* rather
 * than what it runs on, and the navy uses the ship classes the game already
 * ships (FRIGATE, DESTROYER, CRUISER, BATTLESHIP, CARRIER, NUKESUB).
 *
 * Order matters: the first rule that matches wins, and the order below is also
 * the display order of the columns.
 */
export interface RoleInput {
  Id?: string;
  Categories?: string[];
  Description?: string;
  Economy?: { BuildCostMass?: number };
  Weapon?: Array<{ DamageToShields?: number }>;
  /**
   * The decorated weapons, which carry computed dps. The raw `Weapon` array
   * does not, so picking a primary from it silently found nothing.
   */
  weapons?: Array<{
    MaxRadius?: number;
    WeaponCategory?: string;
    dps?: number | null;
    fullDamage?: number;
    DamageToShields?: number;
    DamageType?: string;
    EnabledByEnhancement?: string;
  }>;
}

/**
 * Where T3 land direct-fire splits. The light end is 480 (Titan, Loyalist) and
 * the heavy end 840 (Harbinger, Othuum) and 1280 (Percival, Brick), so the line
 * belongs in the gap between them. It sits at 600 rather than mid-gap because
 * the Nomads Nova costs 660: the game calls it a "Heavy Hover Tank" and it
 * carries 4 000 hp, more than the Harbinger, so grouping it with the 2 400 hp
 * Titan would compare it against the wrong units. Revisit if a patch puts a
 * genuinely light T3 assault unit above 600.
 */
const T3_HEAVY_MASS = 600;

/** T1 light bots are 30-42 mass, T1 tanks 54-56. */
const T1_TANK_MASS = 50;

/** Where a T1/T2 land bot counts as outranging the tanks rather than fighting them. */
const SKIRMISHER_RANGE = 30;

/**
 * Where an experimental stops being a unit you move and starts being a gun you
 * site. The Mavor, Salvation and Scathis reach 4000; the next longest-reaching
 * experimental is the Nomads Jericho at 200, and the Fatboy at 100.
 */
const STRATEGIC_RANGE = 1000;

/**
 * Where an experimental counts as long range, measured on its PRIMARY weapon.
 *
 * Max range across all weapons is the wrong measure and says the opposite of
 * the truth: the Monkeylord's 64-range weapons are 214 dps secondary laser
 * turrets, while the microwave laser it is actually built around does 4000 dps
 * at range 30. On primary range the field is Megalith 64, Ythotha 47, Colossus
 * 40, Monkeylord 30, and the Megalith is plainly the outlier.
 */
const LONG_RANGE_PRIMARY = 60;

/** The weapon a unit is built around: the one doing the most damage per second. */
function primaryRange(u: RoleInput): number {
  // Same definition of "primary" as everywhere else: excludes death
  // explosions, Overcharge and upgrade-gated weapons.
  const live = (u.weapons ?? []).filter(
    (w) =>
      (w.dps ?? 0) > 0 &&
      w.WeaponCategory !== 'Death' &&
      w.DamageType !== 'Overcharge' &&
      !w.EnabledByEnhancement
  );
  if (live.length === 0) return 0;
  const best = live.reduce((a, b) => ((b.dps ?? 0) > (a.dps ?? 0) ? b : a));
  return best.MaxRadius ?? 0;
}

const has = (c: Set<string>, ...names: string[]) => names.some((n) => c.has(n));

export const ROLE_RULES: Array<[string, (c: Set<string>, u: RoleInput) => boolean]> = [
  ['Commander', (c) => has(c, 'COMMAND', 'SUBCOMMANDER')],
  ['Engineer', (c) => has(c, 'ENGINEER', 'FIELDENGINEER', 'ENGINEERSTATION')],
  // Experimentals are grouped the way players talk about them rather than by the
  // same rules as everything else, because at T4 the domain is the plan. These
  // run before every general rule: the Fatboy carries a shield and the Megalith
  // carries SNIPER, so either would otherwise be filed as a shield unit or a
  // sniper rather than as the experimental it is.
  // Strategic artillery is its own thing, and it was the widest slot in the
  // database: the Mavor, the Salvation and the Scathis reach 4000, and they
  // sat beside the Fatboy at 100 and the Megalith at 64. A 62x range spread
  // inside one column is not a comparison. These three shell the other side of
  // the map from home; the rest are units you walk somewhere.
  [
    'Experimental artillery',
    (c, u) =>
      c.has('EXPERIMENTAL') && !c.has('AIR') && primaryRange(u) >= STRATEGIC_RANGE,
  ],
  [
    'Long range',
    (c, u) =>
      c.has('EXPERIMENTAL') &&
      // Never an aircraft. The Nomads Deadline is an orbital gun carrying
      // ARTILLERY, which put a satellite in a column of siege artillery while
      // the UEF Defense Satellite — the same thing — sat under experimental
      // air. A satellite is an air unit first.
      !c.has('AIR') &&
      // Artillery anywhere, plus land units whose primary outranges a brawler.
      // Scoped to land on purpose: a bomber and a carrier both have long reach
      // and neither is what anyone means by a long-range experimental.
      (c.has('ARTILLERY') || (c.has('LAND') && primaryRange(u) >= LONG_RANGE_PRIMARY)),
  ],
  ['Experimental special', (c) => c.has('EXPERIMENTAL') && c.has('STRUCTURE')],
  ['Experimental air', (c) => c.has('EXPERIMENTAL') && c.has('AIR')],
  ['Experimental navy', (c) => c.has('EXPERIMENTAL') && c.has('NAVAL')],
  ['Experimental assault', (c) => c.has('EXPERIMENTAL')],

  // The Nomads Beholder is the game's fifth spy plane and the only one whose
  // blueprint omits SCOUT, so it fell through to Intel and sat in a column of
  // radar buildings as the only aircraft there. The other four carry the same
  // "Spy Plane" description, so the name is the reliable handle.
  ['Scout', (c, u) => c.has('SCOUT') || (c.has('AIR') && /spy plane/i.test(u.Description ?? ''))],
  // Before Transport and Direct fire, both of which were claiming gunships
  // first: the UEF Stinger carries a one-unit transport clamp, and the Nomads
  // Hornet and Vangard carry DIRECTFIRE. All three are gunships and were
  // filed as a transport and as direct fire respectively.
  ['Gunship', (c, u) => c.has('AIR') && /gunship/i.test(u.Description ?? '')],
  ['Transport', (c) => c.has('TRANSPORTATION')],
  // A shield disruptor belongs with shields: it is the unit you build because
  // of them, and nobody looking for it looks under "tank".
  // A shield stripper is not a shield. Filing both under one role put the
  // Athanah — the only T3 mobile shield in the game — next to the Absolver,
  // which exists to delete shields, and called it a comparison. They share a
  // subject and nothing else.
  //
  // A stripper is a unit whose ONLY gun does more to shields than to units:
  // the Absolver and the Nomads Dominator each carry a single 5-damage weapon
  // doing 1295 and 500 to shields. Requiring it to be the only weapon keeps
  // the Nomads battleships, which carry one alongside their main armament,
  // with the other battleships.
  [
    'Shield disruptor',
    (c, u) => {
      if (c.has('SHIELD')) return false;
      const live = (u.weapons ?? []).filter(
        (w) => (w.fullDamage ?? 0) > 0 && w.WeaponCategory !== 'Death'
      );
      return live.length === 1 && ((live[0] as { DamageToShields?: number }).DamageToShields ?? 0) > 0;
    },
  ],
  ['Shield', (c) => c.has('SHIELD')],
  // A sniper bot and a mobile bomb shared one role and share nothing else. The
  // Sprite Striker and the Usha-Ah are a clean Aeon/Seraphim parallel — the
  // only two units in the game built to kill from outside return fire — and
  // comparing either against the Mercy told the reader nothing.
  ['Sniper', (c) => c.has('SNIPER')],
  ['Special', (c) => c.has('BOMB')],

  // Before the ship classes: a sonar buoy carries NAVAL and SUBMERSIBLE, so
  // the Seraphim one was being filed as a submarine.
  ['Intel', (c) => c.has('MOBILESONAR')],

  // Ship classes, before the generic weapon rules, so a cruiser is a cruiser
  // rather than "anti-air" and a destroyer is not filed under "direct fire".
  ['Frigate', (c) => c.has('FRIGATE')],
  // The Battlecruiser carries the BATTLESHIP category, so only the name
  // separates it. Same for the Aeon Missile Ship.
  ['Battlecruiser', (c, u) => c.has('BATTLESHIP') && /battlecruiser/i.test(u.Description ?? '')],
  ['Missile ship', (c, u) => c.has('BATTLESHIP') && /missile/i.test(u.Description ?? '')],
  // Battleship before Destroyer: the Nomads Juggernaut carries both, and it is
  // a battleship — 44 000 hp and 9 000 mass, squarely in the T3 battleship band
  // with the Summit and the Hauthuum. It is the only unit carrying the pair.
  ['Battleship', (c) => c.has('BATTLESHIP')],
  // Likewise the Whaler, which carries DESTROYER but is an "Anti-Submersible
  // Boat" — a torpedo boat, not a destroyer. Real destroyers carry ANTISUB too
  // (the Exodus, the Nightstorm), so the category cannot separate them and the
  // name has to, exactly as it does for the Battlecruiser above.
  ['Anti-navy', (c, u) => c.has('ANTISUB') && /anti-sub/i.test(u.Description ?? '')],
  ['Destroyer', (c) => c.has('DESTROYER')],
  ['Cruiser', (c) => c.has('CRUISER')],
  // NAVAL required: the Nomads air staging platform carries a stray CARRIER
  // category and was the only structure in the game filed as a carrier.
  ['Carrier', (c) => c.has('NAVAL') && has(c, 'CARRIER', 'NAVALCARRIER')],
  ['Missile submarine', (c) => c.has('NUKESUB')],
  ['Submarine', (c) => c.has('NAVAL') && c.has('SUBMERSIBLE')],

  // Land direct-fire. Chassis is ignored: a Mantis and a Striker are the same
  // slot, and so are an Ilshavoh and a Heavy Tank.
  // A bot that outranges the tanks is a different unit from one that closes
  // with them: at T2 the tanks sit at 18-24 range and the Mongoose and Hoplite
  // at 34 and 37. Scoped to T1 and T2 because at T3 the long reach belongs to
  // the heaviest units — a Percival reaches 34 and is nobody's skirmisher.
  [
    'Skirmisher',
    (c, u) =>
      c.has('DIRECTFIRE') && c.has('LAND') && c.has('BOT') &&
      (c.has('TECH1') || c.has('TECH2')) &&
      primaryRange(u) >= SKIRMISHER_RANGE,
  ],
  // Crossing water is the unit's purpose at T1 and T2 — the Blaze, Yenzyne,
  // Riptide and Wagner are bought for it. At T3 it is incidental: the
  // Percival, Brick and Othuum are amphibious and are still heavy tanks.
  [
    'Hover',
    (c) =>
      c.has('DIRECTFIRE') && c.has('LAND') &&
      (c.has('HOVER') || c.has('AMPHIBIOUS')) &&
      (c.has('TECH1') || c.has('TECH2')),
  ],
  [
    'Light tank',
    (c, u) =>
      c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH3') &&
      (u.Economy?.BuildCostMass ?? 0) < T3_HEAVY_MASS,
  ],
  ['Heavy tank', (c) => c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH3')],
  // T1 splits by cost too: the light assault bots sit at 30-42 mass and the
  // tanks at 54-56, and they are not bought for the same reason.
  [
    'Light bot',
    (c, u) =>
      c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH1') &&
      (u.Economy?.BuildCostMass ?? 0) < T1_TANK_MASS,
  ],
  ['Heavy tank', (c) => c.has('DIRECTFIRE') && c.has('LAND') && c.has('TECH2')],
  ['Tank', (c) => c.has('DIRECTFIRE') && c.has('LAND')],

  // Named for what it is, not for its damage type. Every member is a point
  // defence turret and every "Point Defense" unit in the game is a member,
  // 11 for 11 both ways — but "Direct fire" also happens to be the value 78
  // other units carry as their primary weapon category, ACUs and experimentals
  // among them, so the old name named two completely different populations.
  ['Point defence', (c) => c.has('DIRECTFIRE')],

  // Air. Gunships carry no category of their own at all — not DIRECTFIRE, not
  // anything — so the only handle on them is the name the game gives them.
  // Without this they fell through to "Other", which is why a Broadsword used
  // to be listed as an unclassified threat.
  ['Torpedo bomber', (c) => c.has('AIR') && c.has('BOMBER') && c.has('ANTINAVY')],
  ['Bomber', (c) => c.has('BOMBER')],
  ['Artillery', (c) => c.has('ARTILLERY')],
  // Before Missile, not after. An SMD carries SILO because it stockpiles
  // interceptors, so the silo rule was claiming all five of them and filing
  // strategic missile DEFENCE in the same bucket as the nuke it exists to
  // stop. SILO describes what a building holds; ANTIMISSILE describes what it
  // does, and what it does is the role. Naval units carrying ANTIMISSILE stay
  // ships via MOBILE.
  ['Missile defence', (c) => c.has('ANTIMISSILE') && !c.has('MOBILE')],
  ['Missile', (c) => has(c, 'SILO', 'TACTICALMISSILEPLATFORM')],
  ['Anti-air', (c) => c.has('ANTIAIR')],
  ['Anti-navy', (c) => c.has('ANTINAVY')],
  // Economy and production. These were the whole of the "Other" bucket: 154
  // units with no role, so a quantum gateway and a mass fabricator sat in the
  // same undifferentiated pile. The categories to split them by were there all
  // along. Factories need no domain of their own — a slot is already keyed on
  // one, so land, air and naval factories separate by themselves.
  // Tactical missile defence: a defensive structure with no gun, so it matched
  // nothing and sat in Other.
  ['Missile defence', (c) => c.has('ANTIMISSILE') && !c.has('MOBILE')],
  // Gateways carry FACTORY as well as GATE, so they must be claimed first or a
  // quantum gateway is filed as a land factory.
  ['Gateway', (c) => c.has('GATE')],
  ['Factory', (c) => c.has('FACTORY')],
  ['Mass extraction', (c) => c.has('MASSEXTRACTION')],
  ['Mass fabrication', (c) => c.has('MASSFABRICATION')],
  ['Power', (c) => c.has('ENERGYPRODUCTION')],
  ['Storage', (c) => has(c, 'MASSSTORAGE', 'ENERGYSTORAGE')],
  ['Air staging', (c) => c.has('AIRSTAGINGPLATFORM')],
  ['Wall', (c) => c.has('WALL')],

  // Quantum optics is its own thing: two factions have one, nobody else does,
  // and lumping it in with radar hides that. Without this it fell through to
  // "Other" and was compared against quantum gateways.
  ['Optics', (c) => c.has('OPTICS')],
  [
    'Intel',
    (c) => has(c, 'RADAR', 'SONAR', 'OMNI', 'MOBILESONAR', 'COUNTERINTELLIGENCE', 'STEALTHFIELD'),
  ],
];

/**
 * Display order for the role columns. Deduplicated: a role can be reached by
 * more than one rule — Intel matches both the sonar buoys and the radar
 * structures — and without this the roster drew two identical columns for it,
 * one of them always empty.
 */
export const ROLE_ORDER: string[] = [
  ...new Set([...ROLE_RULES.map(([name]) => name), 'Other']),
];

/** Column headings. A 44px column fits about seven characters. */
export const ROLE_SHORT: Record<string, string> = {
  Commander: 'CMDR',
  Engineer: 'ENG',
  Scout: 'SCOUT',
  Transport: 'TRANS',
  'Experimental artillery': 'ARTY',
  Sniper: 'SNIPER',
  Special: 'SPECIAL',
  'Experimental air': 'T4 AIR',
  'Experimental navy': 'T4 NAVY',
  'Long range': 'LONG',
  'Experimental assault': 'ASSAULT',
  'Experimental special': 'T4 SPEC',
  Frigate: 'FRIG',
  Destroyer: 'DESTR',
  Cruiser: 'CRUIS',
  Battlecruiser: 'BCRUIS',
  'Missile ship': 'MSHIP',
  Battleship: 'BSHIP',
  Carrier: 'CARR',
  'Missile submarine': 'M-SUB',
  Submarine: 'SUB',
  Skirmisher: 'SKIRM',
  Hover: 'HOVER',
  'Light bot': 'LT BOT',
  'Light tank': 'LIGHT',
  'Heavy tank': 'HEAVY',
  Tank: 'TANK',
  'Point defence': 'PD',
  Gunship: 'GUNSHIP',
  'Torpedo bomber': 'TORP',
  Bomber: 'BOMB',
  Artillery: 'ARTY',
  Missile: 'MISSILE',
  'Anti-air': 'AA',
  'Anti-navy': 'A-NAVY',
  Shield: 'SHIELD',
  'Shield disruptor': 'DISRUPT',
  Factory: 'FACTORY',
  'Mass extraction': 'MEX',
  'Mass fabrication': 'MASSFAB',
  Power: 'POWER',
  Storage: 'STORAGE',
  Gateway: 'GATE',
  'Missile defence': 'TMD',
  'Air staging': 'AIRPAD',
  Wall: 'WALL',
  Optics: 'OPTICS',
  Intel: 'INTEL',
  Other: 'OTHER',
};

export function roleOf(unit: RoleInput | string[] = {}): string {
  // Tolerates the old categories-array call shape.
  const u: RoleInput = Array.isArray(unit) ? { Categories: unit } : unit;
  const c = new Set(u.Categories ?? []);
  for (const [name, test] of ROLE_RULES) {
    if (test(c, u)) return name;
  }
  return 'Other';
}
