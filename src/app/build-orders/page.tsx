import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { BUILD_ORDERS } from '@/data/build-orders';
import { OPENINGS } from '@/data/openings';
import { runOpening } from '@/lib/faf/opening';
import { OpeningTimeline, type Runs } from '@/components/OpeningTimeline';
import { BuildOrdersClient } from './BuildOrdersClient';
import type { Faction } from '@/lib/faf/types';
import styles from './build-orders.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Build orders',
  description:
    'Every build order guide for Supreme Commander: Forged Alliance Forever worth finding, in one place — generic openings and map-specific ones, tagged by focus and level.',
};

const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim'];

export default async function BuildOrdersPage() {
  const { units, hidden, version } = await getUnitData();
  const maps = new Set(BUILD_ORDERS.filter((o) => o.scope !== 'Generic').map((o) => o.scope));

  /**
   * Every opening, for every faction, run at build time.
   *
   * Twelve runs of a few thousand ticks each, which is nothing once and would
   * be waste on every page view. Running them here also means the timings are
   * in the HTML rather than appearing after hydration, which matters because
   * they are the reason to read the page.
   */
  const all = [...units, ...hidden];
  const slugs = Object.fromEntries(all.map((u) => [u.Id, u.slug]));
  const runs: Runs = {};
  for (const opening of OPENINGS) {
    runs[opening.id] = {};
    for (const faction of FACTIONS) {
      const run = runOpening(opening, faction, all);
      runs[opening.id][faction] = {
        ...run,
        slugs: Object.fromEntries(
          run.items.filter((i) => i.id).map((i) => [i.id!, slugs[i.id!] ?? ''])
        ),
      };
    }
  }

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

      <section className={styles.openings}>
        <div className={styles.sectionHead}>
          <h2 className={`t ${styles.sectionTitle}`}>The first five minutes</h2>
          <p className={styles.sectionLede}>
            The generic openings, played out against the current patch. Pick your faction and what
            you are opening into, and every timing below is computed from the blueprints rather
            than quoted: build points divided by build power, with the economy stepped forward so
            you can see what each step drains and where it would stall.
          </p>
        </div>
        <OpeningTimeline openings={OPENINGS} runs={runs} />
      </section>

      <div className={styles.sectionHead}>
        <h2 className={`t ${styles.sectionTitle}`}>Guides, by map and focus</h2>
        <p className={styles.sectionLede}>
          Openings for specific maps and team positions are not transcribed above, because they
          exist as videos and a build order rebuilt from memory of a video has invented steps in
          it. They are linked here instead, tagged so you can find yours.
        </p>
      </div>

      <BuildOrdersClient orders={BUILD_ORDERS} />

      <SiteFooter version={version} />
    </div>
  );
}
