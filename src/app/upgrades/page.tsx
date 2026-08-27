import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { UnitWell } from '@/components/UnitWell';
import { Icon } from '@/components/Icon';
import { MassMark, EnergyMark, TimeMark } from '@/components/Marks';
import { getUnitData } from '@/lib/faf/data';
import { enhancementsOf, groupBySlot, SLOT_LABEL, type Enhancement } from '@/lib/faf/enhancements';
import { fmtNum } from '@/lib/faf/decorate';
import type { Unit } from '@/lib/faf/types';
import styles from './upgrades.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Commander upgrades',
  description:
    'Every ACU and Support Commander upgrade in Forged Alliance Forever, by faction and arm slot, with mass, energy and build time read from the unit blueprints.',
};

export default async function UpgradesPage() {
  const { units, version, descriptions } = await getUnitData();

  // Commanders only: they are the units the engine lets you bolt upgrades onto.
  const hosts = units
    .filter((u) => enhancementsOf(u).length > 0)
    .sort((a, b) =>
      a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name)
    );

  const total = hosts.reduce((n, u) => n + enhancementsOf(u).length, 0);

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <main className={styles.wrap}>
        <div className={styles.head}>
          <Link href="/" className={styles.back}>
            <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> All units
          </Link>
          <h1 className={`t ${styles.title}`}>Commander upgrades</h1>
          <p className={styles.lede}>
            {total} upgrades across {hosts.length} commanders. Costs, effects and prerequisites are
            read from each commander’s blueprint, so they follow the game rather than a hand-kept list.
          </p>
        </div>

        <div className={styles.grid}>
          {hosts.map((host) => (
            <HostCard key={host.Id} host={host} descriptions={descriptions} />
          ))}
        </div>
      </main>

      <SiteFooter version={version} />
    </div>
  );
}

function HostCard({ host, descriptions }: { host: Unit; descriptions: Record<string, string> }) {
  const slots = groupBySlot(enhancementsOf(host));
  return (
    <section className={styles.host} data-faction={host.faction}>
      <Link href={`/unit/${host.slug}`} className={styles.hostHead}>
        <UnitWell
          id={host.Id}
          faction={host.faction}
          techLabel={host.techLabel}
          size={44}
          imageSize={40}
          pip={false}
          hasRender={host.hasRender}
        />
        <span className={styles.hostBody}>
          <span className={`t ${styles.hostName}`}>{host.name}</span>
          <span className={styles.hostRole}>{host.faction} · {host.role}</span>
        </span>
        <Icon name="chevronRight" size={14} />
      </Link>

      {slots.map(([slot, list]) => (
        <div key={slot}>
          <div className={styles.slotHead}>
            <span className="lbl" style={{ fontSize: 9 }}>{SLOT_LABEL[slot]}</span>
            <span className={`m ${styles.slotCount}`}>{list.length}</span>
            <span className="rule" />
          </div>
          {list.map((e) => (
            <UpgradeRow
              key={e.key}
              host={host}
              enhancement={e}
              blurb={descriptions[`${host.Id.toLowerCase()}-${(e.icon ?? e.key).toLowerCase()}`]}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function UpgradeRow({
  host, enhancement: e, blurb,
}: { host: Unit; enhancement: Enhancement; blurb?: string }) {
  return (
    <Link href={`/unit/${host.slug}#upgrade-${e.key.toLowerCase()}`} className={styles.row}>
      <div className={styles.rowTop}>
        <span className={`t ${styles.rowName}`}>{e.name}</span>
        <span className={styles.costs}>
          <span className={styles.cost}><MassMark size={10} /><span className="m">{fmtNum(e.mass)}</span></span>
          <span className={styles.cost}><EnergyMark size={10} /><span className="m">{fmtNum(e.energy)}</span></span>
          <span className={styles.cost}><TimeMark size={10} /><span className="m">{fmtNum(e.buildTime)}</span></span>
        </span>
      </div>
      {blurb && <p className={styles.blurb}>{blurb}</p>}
      {e.effects.length > 0 && (
        <div className={styles.effects}>
          {e.effects.map((fx) => (
            <span key={fx.label} className={styles.pill}>
              <span className={styles.pillLabel}>{fx.label}</span>
              <span className="m">{fx.value}</span>
            </span>
          ))}
        </div>
      )}
      {e.prerequisite && <div className={styles.prereq}>Requires {e.prerequisite}</div>}
    </Link>
  );
}
