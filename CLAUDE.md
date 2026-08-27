# FAF Unit DB

A FAF unit database frontend. The dataset is generated from FAForever's game
repository by `npm run generate`. Read `README.md` first.

## Hard rules

- **Never hand-roll DPS or derived weapon stats.** `src/lib/faf/dps.ts` implements
  the game's `unitviewDetail.lua`. Run `npm run verify` after touching anything in
  `src/lib/faf/`; if it fails, the numbers are wrong and you do not ship.
- **Never hardcode a game constant.** The generator reads all seven out of FAF's
  Lua and throws if it cannot find one. Fix the generator, do not paste a value.
- **Never hotlink assets at runtime.** `raw.githubusercontent.com` is not a CDN.
  Unit renders are vendored to `public/units/` by `npm run fetch-images`.
- **Attribution tracks what is actually used.** Everything currently derives from
  FAForever's own repositories, so `SiteFooter.tsx` credits FAForever and
  spooky-db only. If code or data from another community project is added back,
  credit it in the footer and the README in the same commit.

## Gotchas

- The tier the game calls `EXPERIMENTAL` is what players call T4. `techLabel`
  handles the display mapping; `tech` stays the raw value.
- `WeaponCategory: 'Anti Navy'` is split into `Torpedo` / `Depth charge` by the
  decorator, matching upstream. Match on the decorated category, not the raw one.
- Some abilities are synthesised (`Snipemode`, `Fires from transport`) rather than
  present in the blueprint. See `decorateAbilities`.
- The generator keeps blueprints that are SELECTABLE, belong to a faction, and
  are not CIVILIAN/OPERATION or a `Test*` harness unit. That yields 510, a few
  more than other FAF unit databases, mostly non-buildable real units (HARMS,
  Othuy, the Pulsar).
- Sections come from the game's `SORT*` categories for structures and the domain
  category for mobile units, so new units file themselves with no edit needed.
- Blueprint strings carry `<LOC key>` prefixes. Strip before matching on them;
  a filter that forgot this silently kept a test unit.
