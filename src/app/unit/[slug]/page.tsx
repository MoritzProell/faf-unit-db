import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { UnitWell } from '@/components/UnitWell';
import { FactionMark } from '@/components/FactionMark';
import { Icon, type IconName } from '@/components/Icon';
import { AbilityChips } from '@/components/AbilityChips';
import { AddToCompareButton, DensityToggle } from '@/components/UnitActions';
import { MassMark, EnergyMark, TimeMark } from '@/components/Marks';
import { getUnitData } from '@/lib/faf/data';
import { engagementOf } from '@/lib/faf/engagement';
import { notablesOf } from '@/lib/faf/notable';
import { UNIT_NOTES } from '@/data/unit-notes';
import { fmtNum, fmtRatio, round } from '@/lib/faf/decorate';
import { buildCohort, ordinal } from '@/lib/faf/cohort';
import { enhancementsOf, groupBySlot, SLOT_LABEL, type Enhancement } from '@/lib/faf/enhancements';
import { getUnitHistory } from '@/lib/faf/changelog';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { JsonLd } from '@/components/JsonLd';
import { FieldPill } from '@/app/changelog/page';
import type { DecoratedWeapon, Unit } from '@/lib/faf/types';
import styles from './detail.module.css';

export const revalidate = 21600;

export async function generateStaticParams() {
  const { units } = await getUnitData();
  return units.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { bySlug, version } = await getUnitData();
  const unit = bySlug.get(slug);
  if (!unit) return { title: 'Unit not found' };
  const dps = unit.directDps ? `, ${fmtRatio(unit.directDps, 1)} DPS` : '';
  // Lead with the unit name and the words people type: "percival stats faf".
  const title = `${unit.name} stats · ${unit.techLabel} ${unit.faction} ${unit.role}`;
  // The game's own rollover text describes what the unit is for far better than
  // a stat recital, so it leads when there is one.
  const description =
    (unit.blurb
      ? `${unit.blurb} `
      : `${unit.name} is a ${unit.techLabel} ${unit.faction} ${unit.role} in Supreme Commander: Forged Alliance Forever. `) +
    `${fmtNum(unit.mass)} mass, ${fmtNum(unit.energy)} energy, ` +
    `${fmtNum(unit.health)} health${dps}. Full weapon, veterancy and wreckage stats for patch ${version}.`;
  const url = `${SITE_URL}/unit/${unit.slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/unit/${unit.slug}` },
    // No `images` here on purpose: setting it overrides the generated card in
    // opengraph-image.tsx, which is what actually gets shown in Discord.
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      url,
      title: `${unit.name} · ${SITE_NAME}`,
      description,
    },
    twitter: { card: 'summary_large_image', title: `${unit.name} · ${SITE_NAME}`, description },
  };
}

export default async function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { bySlug, units, version, descriptions } = await getUnitData();
  const unit = bySlug.get(slug);
  if (!unit) notFound();

  const cohort = buildCohort(unit, units);
  const history = await getUnitHistory(unit.Id);
  // The most recent patch that touched this unit, surfaced in the hero so you
  // do not have to notice a panel in the sidebar to learn it was rebalanced.
  const lastChange = history[0];
  const enhancements = groupBySlot(enhancementsOf(unit));
  const enhancementCount = enhancements.reduce((n, [, l]) => n + l.length, 0);
  const engagement = engagementOf(unit, units);
  const note = UNIT_NOTES[unit.Id];
  const notables = notablesOf(unit);
  const primary = unit.weapons.find((w) => w.dps !== null && w.dps > 0) ?? null;
  // A one-shot unit carries all its damage on a suicide or death weapon, which
  // has no rate of fire and so no DPS. Without this the glance calls a Fire
  // Beetle unarmed while the weapon block below it shows 1100 damage.
  const payload = primary
    ? null
    : unit.weapons
        .filter((w) => (w.fullDamage ?? 0) > 0)
        .sort((a, b) => (b.fullDamage ?? 0) - (a.fullDamage ?? 0))[0] ?? null;
  const shownWeapons = unit.weapons.filter((w) => (w.dps !== null && w.dps > 0) || w.fullDamage > 0);
  const kindLabel = unit.kind === 'Base' ? 'Structures' : unit.kind;

  const stat = (name: string, value: number | string | null | undefined, unitCode?: string) =>
    value === null || value === undefined
      ? null
      : { '@type': 'PropertyValue', name, value, ...(unitCode ? { unitText: unitCode } : {}) };

  return (
    <div className={styles.shell} data-faction={unit.faction}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemPage',
          url: `${SITE_URL}/unit/${unit.slug}`,
          name: `${unit.name} stats`,
          isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'All units', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: kindLabel, item: SITE_URL },
              { '@type': 'ListItem', position: 3, name: unit.name },
            ],
          },
          about: {
            '@type': 'Thing',
            name: unit.name,
            alternateName: unit.Id,
            description: unit.blurb ?? `${unit.techLabel} ${unit.faction} ${unit.role} in Supreme Commander: Forged Alliance Forever.`,
            image: `${SITE_URL}/units/${unit.Id}.png`,
            additionalProperty: [
              stat('Faction', unit.faction),
              stat('Tech level', unit.techLabel),
              stat('Mass cost', unit.mass),
              stat('Energy cost', unit.energy),
              stat('Build time', unit.buildTime),
              stat('Health', unit.health),
              stat('Health per mass', Number(fmtRatio(unit.hpPerMass))),
              unit.directDps ? stat('Direct-fire DPS', Number(fmtRatio(unit.directDps, 1))) : null,
              stat('Speed', unit.Physics?.MaxSpeed),
              stat('Vision radius', unit.Intel?.VisionRadius),
            ].filter(Boolean),
          },
        }}
      />
      <TopBar version={version} totalUnits={units.length} />

      <div className={styles.contextBar}>
        <Link href="/" className={styles.back}>
          <Icon name="chevronLeft" size={14} strokeWidth={2} /> All units
        </Link>
        <span className={styles.divider} />
        <nav className={styles.crumbs}>
          <span>{kindLabel}</span>
          <span className={styles.crumbSep}>/</span>
          <span>{unit.techLabel}</span>
          <span className={styles.crumbSep}>/</span>
          <span>{unit.faction}</span>
        </nav>
        <span className={styles.spacer} />
        <DensityToggle />
        <AddToCompareButton id={unit.Id} name={unit.name} />
      </div>

      <header className={styles.hero}>
        <div className={styles.heroMark} aria-hidden="true">
          <FactionMark faction={unit.faction} size={192} opacity={0.055} />
        </div>
        <UnitWell id={unit.Id} faction={unit.faction} techLabel={unit.techLabel} size={132} imageSize={124} pip={false} priority hires hasRender={unit.hasRender} className={styles.heroWell} />
        <div className={styles.heroBody}>
          <div className={styles.heroTitleRow}>
            <h1 className={`t ${styles.heroName}`}>{unit.name}</h1>
            <span className={`${styles.badge} ${styles.badgeFaction}`}>
              <FactionMark faction={unit.faction} size={12} /> {unit.faction}
            </span>
            <span className={styles.badge}>{unit.techLabel === 'T4' ? 'T4 EXPERIMENTAL' : unit.techLabel}</span>
            <span className={`m ${styles.badge}`}>{unit.Id}</span>
            {lastChange && (
              <Link href={`/changelog#patch-${lastChange.version}`} className={styles.changedBadge}>
                <Icon name="up" size={11} strokeWidth={2.2} />
                Changed in {lastChange.version}
              </Link>
            )}
          </div>
          {unit.name !== unit.role && <div className={styles.heroRole}>{unit.role}</div>}
          {unit.blurb && <p className={styles.blurb}>{unit.blurb}</p>}
          <AbilityChips abilities={unit.abilities} cap={4} avail={420} />
        </div>

        <div className={styles.costs}>
          <Cost label="Mass" value={fmtNum(unit.mass)} mark={<MassMark size={15} />} />
          <span className={styles.costDivider} />
          <Cost label="Energy" value={fmtNum(unit.energy)} mark={<EnergyMark size={15} />} />
          <span className={styles.costDivider} />
          <Cost label="Build time" value={fmtNum(unit.buildTime)} mark={<TimeMark size={15} />} />
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <section className={styles.secGlance}>
            <SectionHead label="At a glance" />
            <div className={styles.glanceGrid}>
              <Glance
                label="Health"
                icon="health"
                figure={fmtNum(unit.health)}
                unit="hp"
                foot={
                  <Rank
                    percent={cohort.healthPercent}
                    text={`${ordinal(cohort.healthRank)} of ${cohort.size} in ${cohort.label}`}
                  />
                }
              />
              <Glance
                label="HP per mass"
                icon="shield"
                figure={fmtRatio(unit.hpPerMass)}
                foot={
                  <Rank
                    percent={cohort.hpPerMassPercent}
                    text={`${ordinal(cohort.hpPerMassRank)} of ${cohort.size} in ${cohort.label}`}
                  />
                }
              />
              <Glance
                label={primary ? `${primary.category} DPS` : payload ? 'Payload' : 'Weapons'}
                icon="damage"
                figure={
                  primary?.dps
                    ? fmtRatio(primary.dps, 1)
                    : payload
                      ? fmtNum(payload.fullDamage)
                      : 'None'
                }
                foot={
                  primary && cohort.dpsRank > 0 ? (
                    <Rank
                      percent={cohort.dpsPercent}
                      text={`${ordinal(cohort.dpsRank)} of ${cohort.dpsCohortSize} armed in ${cohort.label}`}
                    />
                  ) : (
                    <span className={styles.glanceFoot}>
                      {primary?.cycleText ??
                        (payload
                          ? 'Delivered once, on detonation. It has no rate of fire, so no DPS.'
                          : 'This unit is unarmed.')}
                    </span>
                  )
                }
              />
              <Glance
                label={payload && !primary ? 'Blast radius' : 'Range'}
                icon="range"
                figure={
                  primary?.MaxRadius
                    ? fmtNum(primary.MaxRadius)
                    : payload?.DamageRadius
                      ? fmtNum(payload.DamageRadius)
                      : '–'
                }
                foot={
                  <span className={styles.glanceFoot}>
                    {primary?.MuzzleVelocity
                      ? `Muzzle velocity ${primary.MuzzleVelocity}`
                      : payload
                        ? 'Everything inside the radius takes it'
                        : 'No ranged weapon'}
                  </span>
                }
              />
            </div>
          </section>

          {shownWeapons.length > 0 && (
            <section className={styles.secWeapons} data-multi={shownWeapons.length > 1}>
              <SectionHead label="Weapons" note={String(shownWeapons.length)} />
              <div className={styles.weaponList}>
                {shownWeapons.map((w, i) => (
                  <WeaponCard key={`${w.Label ?? w.DisplayName ?? 'w'}-${i}`} weapon={w} />
                ))}
              </div>
            </section>
          )}

          {enhancementCount > 0 && (
            <section className={styles.secEnhance}>
              <SectionHead label="Upgrades" note={String(enhancementCount)} />
              <div className={styles.panel}>
                {enhancements.map(([slot, list]) => (
                  <div key={slot}>
                    <div className={styles.subHead}>
                      <span className="lbl" style={{ fontSize: 9 }}>{SLOT_LABEL[slot]}</span>
                      <span className={`m ${styles.sectionNote}`}>{list.length}</span>
                      <span className="rule" />
                    </div>
                    {list.map((e) => (
                      <EnhancementRow
                        key={`${slot}-${e.key}`}
                        enhancement={e}
                        blurb={descriptions[`${unit.Id.toLowerCase()}-${(e.icon ?? e.key).toLowerCase()}`]}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={styles.secSurvive}>
            <SectionHead label="Survivability" />
            <div className={styles.panel}>
              <div className={styles.hpBarRow}>
                <div className={styles.hpBar}>
                  <div className={styles.hpFill} />
                  <span className={`t ${styles.hpLabel}`}>{fmtNum(unit.health)} HP</span>
                </div>
                <span className={styles.hpRatio}>
                  <span className="m" style={{ color: 'var(--text)' }}>{fmtRatio(unit.hpPerMass)}</span> / mass
                </span>
              </div>
              {unit.Defense?.Shield?.ShieldMaxHealth ? (
                <>
                  <div className={styles.subHead}>
                    <span className="lbl" style={{ fontSize: 9 }}>Shield</span>
                    <span className="rule" />
                  </div>
                  <div className={styles.fieldGrid}>
                    <Field label="Shield health" value={fmtNum(unit.Defense.Shield.ShieldMaxHealth)} icon="shield" />
                    <Field label="Regen" value={`+${fmtNum(unit.Defense.Shield.ShieldRegenRate ?? 0)}`} sub="hp/s" icon="regen" />
                    <Field label="Recharge" value={fmtNum(unit.Defense.Shield.ShieldRechargeTime ?? 0)} sub="s" icon="clock" />
                    {unit.Defense.Shield.ShieldSize ? (
                      <Field label="Radius" value={fmtNum(unit.Defense.Shield.ShieldSize)} icon="radius" />
                    ) : null}
                    {/* What the protection costs, which is the comparison that
                        decides which shield you build. Raw shield health picks
                        a different winner from either of these. */}
                    {unit.mass > 0 && (
                      <Field
                        label="Shield per mass"
                        value={fmtRatio((unit.Defense.Shield.ShieldMaxHealth / unit.mass), 2)}
                        icon="shield"
                      />
                    )}
                    {unit.energy > 0 && (
                      <Field
                        label="Shield per 1k energy"
                        value={fmtNum(Math.round((unit.Defense.Shield.ShieldMaxHealth / unit.energy) * 1000))}
                        icon="bolt"
                      />
                    )}
                    {(unit.Economy as { MaintenanceConsumptionPerSecondEnergy?: number })
                      ?.MaintenanceConsumptionPerSecondEnergy ? (
                      <Field
                        label="Upkeep"
                        value={fmtNum(
                          (unit.Economy as { MaintenanceConsumptionPerSecondEnergy?: number })
                            ?.MaintenanceConsumptionPerSecondEnergy ?? 0
                        )}
                        sub="e/s"
                        icon="bolt"
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
              {unit.wreckage && (
                <>
                  <div className={styles.subHead}>
                    <span className="lbl" style={{ fontSize: 9 }}>Wreckage</span>
                    <span className="rule" />
                  </div>
                  <div className={styles.fieldGrid}>
                    <Field label="Mass" value={fmtNum(unit.wreckage.mass)} icon="wreck" />
                    <Field label="Mass in water" value={fmtNum(unit.wreckage.massInWater)} icon="wreck" />
                    <Field label="Health" value={fmtNum(unit.wreckage.health)} icon="health" />
                  </div>
                </>
              )}
              {unit.veterancy && (
                <>
                  <div className={styles.subHead}>
                    <span className="lbl" style={{ fontSize: 9 }}>Per veterancy level</span>
                    <span className="rule" />
                  </div>
                  <div className={styles.fieldGrid}>
                    <Field label="Health" value={`+${fmtNum(unit.veterancy.healthPerLevel)}`} icon="health" />
                    <Field label="Regen" value={`+${unit.veterancy.regenPerLevel}`} sub="hp/s" icon="regen" />
                    <Field label="Mass to kill" value={fmtNum(unit.veterancy.massToKillPerLevel)} icon="veterancy" />
                  </div>
                </>
              )}
            </div>
          </section>

          <section className={styles.secMobility}>
            <SectionHead label="Mobility & intel" />
            <div className={styles.panel}>
              <div className={styles.fieldGrid}>
                {unit.Physics?.MaxSpeed !== undefined && <Field label="Speed" value={String(unit.Physics.MaxSpeed)} icon="speed" />}
                {unit.Physics?.TurnRate !== undefined && <Field label="Turn rate" value={String(unit.Physics.TurnRate)} icon="yaw" />}
                {unit.Intel?.VisionRadius !== undefined && <Field label="Vision radius" value={String(unit.Intel.VisionRadius)} icon="vision" />}
                {unit.Intel?.WaterVisionRadius !== undefined && <Field label="Water vision" value={String(unit.Intel.WaterVisionRadius)} icon="vision" />}
                {unit.Intel?.RadarRadius !== undefined && <Field label="Radar radius" value={String(unit.Intel.RadarRadius)} icon="radar" />}
                {unit.Intel?.SonarRadius !== undefined && <Field label="Sonar radius" value={String(unit.Intel.SonarRadius)} icon="sonar" />}
                {unit.Transport?.TransportClass !== undefined && <Field label="Transport class" value={String(unit.Transport.TransportClass)} icon="transport" />}
                {unit.Transport?.CanFireFromTransport !== undefined && (
                  <Field label="Fire from transport" value={unit.Transport.CanFireFromTransport ? 'Yes' : 'No'} />
                )}
              </div>
            </div>
          </section>

          {(cohort.unique || cohort.superlatives.length > 0 || notables.length > 0 || !engagement.reaches.includes('Air')) && (
            <section className={styles.secStandout}>
              <SectionHead label="Worth knowing" note="from blueprints" />
              <div className={styles.panel}>
                {cohort.unique && (
                  <div className={styles.standoutRow} data-kind="unique">
                    <Icon name="target" size={13} />
                    <span className={styles.standoutLabel}>
                      The only {cohort.slotLabel} in the game
                    </span>
                    <span className={styles.standoutValue}>no faction fields an equivalent</span>
                  </div>
                )}

                {cohort.superlatives.map((sup) => (
                  <div key={sup.label} className={styles.standoutRow} data-kind="best">
                    <Icon name="up" size={13} strokeWidth={2.2} />
                    <span className={styles.standoutLabel}>{sup.label}</span>
                    <span className={`m ${styles.standoutValue}`}>{sup.value}</span>
                  </div>
                ))}

                {engagement.armed && !engagement.reaches.includes('Air') && (
                  <div className={styles.standoutRow} data-kind="warn">
                    <Icon name="close" size={12} strokeWidth={2.4} />
                    <span className={styles.standoutLabel}>Cannot target air</span>
                    <span className={styles.standoutValue}>
                      reaches {engagement.reaches.join(', ').toLowerCase() || 'nothing'} only
                    </span>
                  </div>
                )}

                {notables.map((n) => (
                  <div key={n.label} className={styles.standoutRow}>
                    <Icon name="check" size={13} strokeWidth={2.2} />
                    <span className={styles.standoutLabel}>{n.label}</span>
                    <span className={styles.standoutValue}>{n.detail}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {note && (
            <section className={styles.secPlay}>
              <SectionHead label="How it plays" />
              <div className={`${styles.panel} ${styles.playPanel}`}>
                <p className={styles.playText}>{note.text}</p>
                <div className={styles.playMeta}>
                  {note.source?.url ? (
                    <a href={note.source.url} target="_blank" rel="noopener noreferrer">{note.source.label}</a>
                  ) : (
                    note.source?.label ?? note.by
                  )}
                  {(note.source || note.by) && ' · '}
                  Written for patch {note.patch}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className={styles.aside}>
          {history.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={`lbl ${styles.panelTitle}`}>Patch history</span>
                <span className={`m ${styles.sectionNote}`}>{history.length}</span>
                <span style={{ flex: 1 }} />
                <Link href="/changelog" className={`m ${styles.sectionNote}`}>all patches</Link>
              </div>
              {history.slice(0, 4).map((h) => (
                <div key={h.version} className={styles.historyRow}>
                  <Link href={`/changelog#patch-${h.version}`} className={`m ${styles.historyVersion}`}>
                    Patch {h.version}
                  </Link>
                  <div className={styles.historyFields}>
                    {h.change.fields.map((f, i) => (
                      <FieldPill key={i} field={f} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {cohort.peers.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={`lbl ${styles.panelTitle}`}>Other factions</span>
                <span className={`m ${styles.sectionNote}`}>same {cohort.slotLabel}</span>
              </div>
              {cohort.peers.map((p) => (
                <PeerRow key={p.Id} peer={p} base={unit} />
              ))}
            </div>
          )}

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={`lbl ${styles.panelTitle}`}>Categories</span>
              <span className={`m ${styles.sectionNote}`}>{unit.Categories?.length ?? 0}</span>
            </div>
            <div className={styles.cats}>
              {(unit.Categories ?? []).map((c) => (
                <span key={c} className={`m ${styles.cat}`}>{c}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <SiteFooter version={version} />
    </div>
  );
}

function Cost({ label, value, mark }: { label: string; value: string; mark: React.ReactNode }) {
  return (
    <div className={styles.costCell}>
      <span className="lbl" style={{ fontSize: 9 }}>{label}</span>
      <span className={styles.costValue}>
        {mark}
        <span className={`m ${styles.costFigure}`}>{value}</span>
      </span>
    </div>
  );
}

function SectionHead({ label, note }: { label: string; note?: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={`lbl ${styles.sectionLabel}`}>{label}</span>
      {note && <span className={`m ${styles.sectionNote}`}>{note}</span>}
      <span className="rule" />
    </div>
  );
}

function Glance({
  label, figure, unit, foot, icon,
}: { label: string; figure: string; unit?: string; foot: React.ReactNode; icon?: IconName }) {
  return (
    <div className={styles.glance}>
      <span className={`lbl ${styles.fieldLabel}`}>
        {icon && <Icon name={icon} size={11} strokeWidth={1.7} />}
        {label}
      </span>
      <div className={styles.glanceValue}>
        <span className={`m ${styles.glanceFigure}`}>{figure}</span>
        {unit && <span className={styles.glanceUnit}>{unit}</span>}
      </div>
      {foot}
    </div>
  );
}

function Rank({ percent, text }: { percent: number; text: string }) {
  return (
    <div className={styles.rankRow}>
      <div className={styles.track}><div className={styles.trackFill} style={{ width: `${percent}%` }} /></div>
      <span className={styles.glanceFoot}>{text}</span>
    </div>
  );
}

function Field({
  label, value, sub, icon,
}: { label: string; value: string; sub?: string; icon?: IconName }) {
  return (
    <div className={styles.field}>
      <span className={`lbl ${styles.fieldLabel}`} style={{ fontSize: 9 }}>
        {icon && <Icon name={icon} size={10} strokeWidth={1.7} />}
        {label}
      </span>
      <span>
        <span className={`m ${styles.fieldValue}`}>{value}</span>
        {sub && <span className={styles.fieldSub}>{sub}</span>}
      </span>
    </div>
  );
}

function EnhancementRow({ enhancement: e, blurb }: { enhancement: Enhancement; blurb?: string }) {
  return (
    // Anchored so a single upgrade can be linked to on its own.
    <div className={styles.enhRow} id={`upgrade-${e.key.toLowerCase()}`}>
      <div className={styles.enhTop}>
        <span className={`t ${styles.enhName}`}>{e.name}</span>
        <span className={styles.enhCosts}>
          <span className={styles.enhCost}><MassMark size={11} /><span className="m">{fmtNum(e.mass)}</span></span>
          <span className={styles.enhCost}><EnergyMark size={11} /><span className="m">{fmtNum(e.energy)}</span></span>
          <span className={styles.enhCost}><TimeMark size={11} /><span className="m">{fmtNum(e.buildTime)}</span></span>
        </span>
      </div>
      {blurb && <p className={styles.enhBlurb}>{blurb}</p>}
      {(e.effects.length > 0 || e.unlocks) && (
        <div className={styles.enhEffects}>
          {e.effects.map((f) => (
            <span key={f.label} className={styles.enhPill}>
              <span className={styles.enhPillLabel}>{f.label}</span>
              <span className="m">{f.value}</span>
            </span>
          ))}
          {e.unlocks && (
            <span className={styles.enhPill}>
              <span className={styles.enhPillLabel}>Unlocks</span>
              <span className="m">{e.unlocks}</span>
            </span>
          )}
        </div>
      )}
      {e.prerequisite && (
        <div className={styles.enhPrereq}>Requires {e.prerequisite}</div>
      )}
    </div>
  );
}

function WeaponCard({ weapon: w }: { weapon: DecoratedWeapon }) {
  const layers = w.FireTargetLayerCapsTable
    ? [...new Set(Object.values(w.FireTargetLayerCapsTable).flatMap((v) => v.split('|')))].join(' / ')
    : null;
  return (
    <div className={styles.panel}>
      <div className={styles.weaponHead}>
        <Icon name="target" size={15} />
        <span className={`t ${styles.weaponName}`}>{w.DisplayName ?? w.Label ?? 'Weapon'}</span>
        <span className={styles.badge}>{w.category.toUpperCase()}</span>
        {w.DamageType && <span className={styles.badge}>{w.DamageType} damage</span>}
        <span className={styles.spacer} />
        {w.dps ? (
          <span className={styles.dpsPill}>
            <span className={`m ${styles.dpsFigure}`}>{fmtRatio(w.dps, 1)}</span>
            <span className="lbl" style={{ fontSize: 9, color: 'var(--best)' }}>DPS</span>
          </span>
        ) : null}
      </div>
      <div className={styles.fieldGrid}>
        <Field label="Damage" value={fmtNum(round(w.fullDamage, 1))} icon="damage" />
        {w.firingCycle?.cycleTime ? <Field label="Reload" value={w.firingCycle.cycleTime.toFixed(1)} sub="s" icon="clock" /> : null}
        {w.MaxRadius !== undefined ? <Field label="Range" value={fmtNum(w.MaxRadius)} icon="range" /> : null}
        {w.MuzzleVelocity !== undefined ? <Field label="Muzzle velocity" value={String(w.MuzzleVelocity)} icon="velocity" /> : null}
        {w.DamageRadius !== undefined ? (
          <Field label="Damage radius" value={String(w.DamageRadius)} sub={w.DamageRadius === 0 ? 'single target' : undefined} icon="radius" />
        ) : null}
        {w.TurretYawRange !== undefined ? <Field label="Turret yaw" value={`±${w.TurretYawRange}°`} icon="yaw" /> : null}
        {w.DoTPulses && w.DoTPulses > 1 ? <Field label="Damage over time" value={`${w.DoTPulses} pulses`} sub={`${w.DoTTime}s`} icon="pulses" /> : null}
        {layers ? <Field label="Fires at" value={layers} icon="target" /> : null}
      </div>
      {w.firingCycle?.cycleTime && w.cycleText ? (
        <div className={styles.cycle}>
          <span className="lbl" style={{ fontSize: 9 }}>Cycle</span>
          <span className={styles.cycleTrack}>
            <span className={styles.cycleTick} />
            <span className={styles.cycleLine} />
            <span className={`m ${styles.cycleText}`}>reload {w.firingCycle.cycleTime.toFixed(1)} s</span>
            <span className={styles.cycleLine} />
            <span className={styles.cycleTick} />
          </span>
          <span className={styles.cycleText}>{w.cycleText}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Every weapon a unit can actually bring, not just its direct-fire gun.
 * `directDps` is null for anything whose damage is torpedoes or AA, which is
 * most of the navy — comparing two destroyers on it showed no damage at all.
 */
function totalDps(u: Unit): number {
  return u.weapons.reduce(
    (n, w) => (w.WeaponCategory === 'Death' ? n : n + (w.dps ?? 0)),
    0
  );
}

function PeerRow({ peer, base }: { peer: Unit; base: Unit }) {
  const hpDelta = peer.health - base.health;
  const peerDps = totalDps(peer);
  const baseDps = totalDps(base);
  const dpsDelta = peerDps > 0 || baseDps > 0 ? peerDps - baseDps : null;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
  return (
    <Link href={`/unit/${peer.slug}`} className={styles.peerRow} data-faction={peer.faction}>
      <UnitWell id={peer.Id} faction={peer.faction} techLabel={peer.techLabel} size={38} imageSize={34} pip={false} hasRender={peer.hasRender} />
      <div className={styles.peerBody}>
        <div className={`t ${styles.peerName}`}>{peer.name}</div>
        <div className={styles.peerRole}>{peer.role}</div>
      </div>
      <div className={styles.deltas}>
        <span className={`m ${styles.delta} ${hpDelta >= 0 ? styles.deltaUp : styles.deltaDown}`}>
          {sign(hpDelta)}{fmtNum(Math.abs(hpDelta))} hp
        </span>
        {dpsDelta !== null && (
          <span className={`m ${styles.delta} ${dpsDelta >= 0 ? styles.deltaUp : styles.deltaDown}`}>
            {sign(dpsDelta)}{fmtRatio(Math.abs(dpsDelta), 1)} dps
          </span>
        )}
      </div>
    </Link>
  );
}
