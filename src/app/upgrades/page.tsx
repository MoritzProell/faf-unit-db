import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { enhancementsOf } from '@/lib/faf/enhancements';
import { UpgradesClient, type HostRow } from './UpgradesClient';
import styles from './upgrades.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Commander upgrades',
  description:
    'Every ACU and Support Commander upgrade in Forged Alliance Forever, by faction and arm slot, with mass, energy, build time and the game’s own description for each.',
};

export default async function UpgradesPage() {
  const { units, version, descriptions } = await getUnitData();

  const hosts: HostRow[] = units
    .map((u): HostRow | null => {
      const upgrades = enhancementsOf(u);
      if (upgrades.length === 0) return null;
      return {
        id: u.Id,
        slug: u.slug,
        name: u.name,
        faction: u.faction,
        techLabel: u.techLabel,
        role: u.role,
        hasRender: u.hasRender,
        // SUBCOMMANDER is the engine's own name for a Support Commander.
        support: u.Categories?.includes('SUBCOMMANDER') ?? false,
        upgrades: upgrades.map((e) => ({
          key: e.key,
          icon: e.icon,
          name: e.name,
          slot: e.slot,
          mass: e.mass,
          energy: e.energy,
          buildTime: e.buildTime,
          prerequisite: e.prerequisite,
          unlocks: e.unlocks,
          effects: e.effects,
          blurb: descriptions[`${u.Id.toLowerCase()}-${(e.icon ?? e.key).toLowerCase()}`],
        })),
      };
    })
    .filter((h): h is HostRow => h !== null)
    .sort((a, b) =>
      a.faction.localeCompare(b.faction) ||
      Number(a.support) - Number(b.support) ||
      a.name.localeCompare(b.name)
    );

  const total = hosts.reduce((n, h) => n + h.upgrades.length, 0);

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <div className={styles.head}>
        <Link href="/" className={styles.back}>
          <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> All units
        </Link>
        <h1 className={`t ${styles.title}`}>Commander upgrades</h1>
        <p className={styles.lede}>
          {total} upgrades across {hosts.length} commanders. Costs, effects, prerequisites and
          descriptions are read from each commander’s own blueprint, so they follow the game
          rather than a hand-kept list.
        </p>
      </div>

      <UpgradesClient hosts={hosts} />

      <SiteFooter version={version} />
    </div>
  );
}
