import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { BUILD_ORDERS, BO_GROUPS } from '@/data/build-orders';
import { OPENINGS, RECLAIM_LEVELS } from '@/data/openings';
import { runOpening } from '@/lib/faf/opening';
import { OpeningTimeline, type Runs } from '@/components/OpeningTimeline';
import { BuildOrdersClient } from './BuildOrdersClient';
import styles from './build-orders.module.css';

export const metadata: Metadata = {
  title: 'Build orders',
  description:
    'Every build order guide for Supreme Commander: Forged Alliance Forever worth finding, in one place — generic openings and map-specific ones, tagged by focus and level.',
};

export default async function BuildOrdersPage() {
  const { units, hidden, version } = await getUnitData();

  /**
   * Every opening at every reclaim level, run at build time.
   *
   * Nine runs of a few thousand ticks each, which is nothing once and would be
   * waste on every page view. Running them here also puts the timings in the
   * HTML rather than after hydration, which matters because they are the reason
   * to read the page.
   */
  const all = [...units, ...hidden];
  const slugs = Object.fromEntries(all.map((u) => [u.Id, u.slug]));
  const runs: Runs = {};
  for (const opening of OPENINGS) {
    runs[opening.id] = {};
    for (const level of RECLAIM_LEVELS) {
      const run = runOpening(opening, all, { reclaim: level.perSecond });
      runs[opening.id][level.key] = {
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

      <main className={styles.page}>
        <header className={styles.head}>
          <Link href="/learn" className={styles.back}>
            <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> Learn
          </Link>
          <h1 className={`t ${styles.title}`}>Build orders</h1>
          <p className={styles.lede}>
            The standard openings played out step by step against the current patch, then{' '}
            {BUILD_ORDERS.length} guides, generic and map-specific, from YouTube, two wikis, both
            forums and a Google Doc. Nowhere else collects them, so this does. The guides link out to
            their authors and nothing of theirs is reproduced here; the opening sequences are
            credited to the guide each one comes from.
          </p>
          <nav className={styles.jump} aria-label="On this page">
            <a href="#openings" className={styles.jumpLink}>
              The first five minutes <span className={`m ${styles.jumpCount}`}>{OPENINGS.length}</span>
            </a>
            <a href="#guides" className={styles.jumpLink}>
              Guides <span className={`m ${styles.jumpCount}`}>{BUILD_ORDERS.length}</span>
            </a>
          </nav>
        </header>

        <section id="openings" className={styles.section} aria-labelledby="openings-title">
          <div className={styles.sectionHead}>
            <h2 id="openings-title" className={`t ${styles.sectionTitle}`}>
              The first five minutes
            </h2>
            <p className={styles.sectionLede}>
              Pick an opening for your situation. Every time and number is computed from the
              current patch rather than quoted: build points divided by build power, with the
              economy stepped forward tick by tick, so you can watch the reserves drain and see
              where the build would stall. There is no faction to pick, because every building an
              opening touches costs exactly the same in all four.
            </p>
          </div>
          <OpeningTimeline openings={OPENINGS} runs={runs} />
        </section>

        <section id="guides" className={styles.section} aria-labelledby="guides-title">
          <div className={styles.sectionHead}>
            <h2 id="guides-title" className={`t ${styles.sectionTitle}`}>
              Guides, by map and focus
            </h2>
            <p className={styles.sectionLede}>
              Openings for specific maps and team positions are not transcribed above, because they
              exist as videos and a build order rebuilt from memory of a video has invented steps in
              it. They are linked here instead, sorted so the ones to start with come first.
            </p>
          </div>
          <BuildOrdersClient orders={BUILD_ORDERS} groups={BO_GROUPS} />
        </section>
      </main>

      <SiteFooter version={version} />
    </div>
  );
}
