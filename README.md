# FAF Unit DB

A frontend for the Supreme Commander: Forged Alliance Forever unit database.

**Live:** https://faf-unit-db.vercel.app
**Built by:** Moritz/RhyZ1ne · **Game data and weapon maths:** [FAForever/fa](https://github.com/FAForever/fa) · **Unit renders:** [FAForever/spooky-db](https://github.com/FAForever/spooky-db)

The dataset is **generated here from FAForever's own game repository**, so the
site has no runtime dependency on anyone else's server.

## What it adds over the reference site

- **Unit names on the grid.** The reference browses 507 unlabelled 40px silhouettes.
- **A labelled filter rail with live facet counts**, instead of unlabelled icon buttons.
- **A compare table with the winner marked per row**, instead of three stacked cards.
- **A page per unit** (`/unit/percival-xel0305`), so units are linkable and indexable.
  The reference is hash-routed, which search engines cannot index.
- **Compact mode** preserves the veteran icon wall the reference is built around.

## Data

Everything is generated and committed, so a deploy fetches nothing at runtime.

```bash
brew install lua                 # or apt install lua5.4
GITHUB_TOKEN=$(gh auth token) npm run generate   # -> src/data/units.json
npm run verify                   # stats must still pass before you ship
npm run fetch-images             # only when FAF adds units
```

| What | Source |
| --- | --- |
| Blueprints | `FAForever/fa @ deploy/faf` → `units/**/*_unit.bp` |
| Nomads | `FAForever/nomads @ master` |
| Projectiles | same repos, `projectiles/**/*_proj.bp` (identifies torpedoes) |
| Constants | FAF Lua: `version.lua`, `blueprints-units.lua`, `defaultcomponents.lua`, `shared/overcharge.lua`, `shield.lua`, `sim/Unit.lua` |
| Descriptions | `lua/ui/help/unitdescription.lua` in both repos — the game's own rollover text, for units and commander upgrades |
| Unit renders | `FAForever/spooky-db @ master` → `app/img/units/<Id>.png` |

Unit descriptions are the game's own. `lua/ui/help/unitdescription.lua` is the
text the in-game rollover shows, and Nomads ships its own copy of the same file;
between them they describe 507 of 510 units and all 97 commander upgrades. The
site does not write prose about units, because prose about units is the part it
could not stand behind. Upgrade entries are keyed `<unitId>-<icon>`, where
`icon` is the abbreviation in the enhancement's own blueprint (`aes`, `hamc`),
which is how the game resolves them too.

### How the generator works

FA blueprints are Lua source that calls `UnitBlueprint{...}`. Rather than parse
them, `scripts/lua/blueprints2json.lua` evaluates each one in a sandboxed Lua
environment with the constructors defined as identity functions, then emits JSON.
That is how FAForever/spooky-db's own tooling works, and it means there is no
parser to keep in step with the game.

The seven global constants (veterancy multipliers, regen buffs, wreckage
multipliers, shield and overcharge defaults) are read out of FAF's Lua source
rather than hardcoded, and the generator **fails loudly** if the game code moves
rather than shipping a half-read constant.

## Stat accuracy

`src/lib/faf/dps.ts` is transliterated from the game's own weapon readout,
`FAForever/fa` `lua/ui/game/unitviewDetail.lua` lines 596-700, with the game's
own names (`MATH_IRound`, `CycleProjs`, `CycleTime`) and cited line numbers.

**Do not replace it with damage × rate-of-fire.** That agrees with the game only
for single-rack, single-muzzle weapons and is silently wrong for salvos, multi-rack
sequences, beams and damage-over-time. For example Serenity's artillery shell
carries `DoTPulses: 15`, so it does 95 × 15 = 1425 damage per shot, not 95.

```bash
npm run verify   # checks derived stats against values read off the reference site
```

If `verify` fails, the numbers are wrong. Do not ship.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (prerenders a page per unit)
npm run verify         # stat accuracy checks against the reference site
npm run fetch-images   # re-vendor unit renders (only needed when FAF adds units)
npm run lint
```

## Staying current

`.github/workflows/update-data.yml` runs daily. It regenerates from
`FAForever/fa`, re-fetches any new unit renders, and commits only if something
actually changed.

**`npm run verify` gates the commit.** If a FAF balance patch changes a unit's
DPS, verification fails, nothing is committed, and the workflow opens an issue.
That is deliberate: only a person can tell "FAF rebalanced Percival" from "our
maths broke". Check the failing units against the in-game unit view, update the
expected values in `scripts/verify-stats.ts`, and say which patch changed them.

That commit deploys on its own: the Vercel project is connected to this
repository and builds every push to `main`.

## Deploying

Pushing to `main` is the deploy. Vercel is connected to the repo and builds
production from that branch, with preview deploys on pull requests.

The connection is worth knowing about because it is easy to lose. This project
was first created by running `vercel deploy` from the CLI, and a project made
that way has no Git connection at all: pushes did nothing and every release had
to be deployed by hand. Only importing the repo in the dashboard, or running
`vercel git connect`, creates the link. If pushes ever stop deploying, that is
the first thing to check:

```bash
vercel git connect          # re-links this repo to the project
vercel deploy --prod        # a manual deploy, if you need one now
```

To tell the two apart, look at what triggered the last deployments: a
`source` of `git` means the connection is live, `cli` means someone deployed by
hand.

The project lives on the personal Vercel account (`moritzfromsweden-9316`).
Check `vercel whoami` before any manual deploy: the CLI signs in through
whichever Vercel session the browser has open, which is how an earlier deploy
landed on a work team by mistake.

Traffic is negligible: a few thousand visits a month sits far inside the free
tier, and the site fetches nothing at runtime because the dataset is committed.

## Credit and standing

Everything this app derives comes from FAForever's own repositories:

- **Unit data** is generated from `FAForever/fa` game blueprints by the generator
  in `scripts/`.
- **Weapon maths** is transliterated from the game's `unitviewDetail.lua`, with
  line citations in `src/lib/faf/dps.ts`.
- **Section taxonomy** reads the game's own build-menu categories
  (`SORTCONSTRUCTION`, `SORTDEFENSE`, …) rather than a hand-written list.
- **Unit renders** are vendored from `FAForever/spooky-db`, whose own tooling
  (`tools/blueprint2json.lua`) is where the evaluate-the-blueprint-as-Lua
  technique comes from.

Supreme Commander unit statistics and renders originate from the game and belong
to its rights holders. This is an unofficial community project.

If any code or data from another community project is ever added back, credit it
here **and** in `SiteFooter.tsx`.
