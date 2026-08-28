import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { BUILD_ORDERS } from '@/data/build-orders';
import { BuildOrdersClient } from './BuildOrdersClient';
import styles from './build-orders.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Build orders',
  description:
    'Every build order guide for Supreme Commander: Forged Alliance Forever worth finding, in one place — generic openings and map-specific ones, tagged by focus and level.',
};

export default async function BuildOrdersPage() {
  const { units, version } = await getUnitData();
  const maps = new Set(BUILD_ORDERS.filter((o) => o.scope !== 'Generic').map((o) => o.scope));

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <div className={styles.head}>
        <Link href="/learn" className={styles.back}>
          <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> Learn
        </Link>
        <h1 className={`t ${styles.title}`}>Build orders</h1>
        <p className={styles.lede}>
          {BUILD_ORDERS.length} guides, generic and map-specific, tagged so you can find the one you
          need. They are scattered across YouTube, two wikis, both forums and a Google Doc, and
          nowhere collects them — so this does. Each links out to its author; nothing is
          reproduced here.
        </p>
        <p className={styles.note}>
          Worth knowing before you start: a build order is tied to one map, and the ladder pool
          rotates monthly, so map-specific material goes stale by design. The generic openings and
          the faction guides age far better. {maps.size} maps are covered below.
        </p>
      </div>

      <BuildOrdersClient orders={BUILD_ORDERS} />

      <SiteFooter version={version} />
    </div>
  );
}
