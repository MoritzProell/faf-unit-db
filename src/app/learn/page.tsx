import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { LEARN, type LearnLink } from '@/data/learn';
import styles from './learn.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'A reading list for Supreme Commander: Forged Alliance Forever — the guides, mechanics write-ups and faction walkthroughs the community actually rates, with what each one is for.',
};

export default async function LearnPage() {
  const { units, version } = await getUnitData();
  const total = LEARN.reduce((n, s) => n + s.links.length, 0);

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <div className={styles.head}>
        <Link href="/" className={styles.back}>
          <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> All units
        </Link>
        <h1 className={`t ${styles.title}`}>Learn</h1>
        <p className={styles.lede}>
          {total} guides worth your time, and what each one is for. This page links out rather
          than copying: the forum threads and wiki pages below were written by people in the
          community and belong to them. Everything else on this site is computed from the
          game&rsquo;s own files; none of this is, so it is kept separate and credited.
        </p>
      </div>

      <main className={styles.wrap}>
        <nav className={styles.jump} aria-label="Sections">
          {LEARN.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={styles.jumpLink}>
              {s.title} <span className={`m ${styles.jumpCount}`}>{s.links.length}</span>
            </a>
          ))}
        </nav>

        {LEARN.map((section) => (
          <section key={section.id} id={section.id} className={styles.section}>
            <h2 className={`t ${styles.sectionTitle}`}>{section.title}</h2>
            <p className={styles.sectionIntro}>{section.intro}</p>
            <div className={styles.grid}>
              {section.links.map((l) => (
                <LinkCard key={l.url} link={l} />
              ))}
            </div>
          </section>
        ))}
      </main>

      <SiteFooter version={version} />
    </div>
  );
}

function LinkCard({ link }: { link: LearnLink }) {
  return (
    <a className={styles.card} href={link.url} target="_blank" rel="noopener noreferrer">
      <div className={styles.cardTop}>
        <span className={`t ${styles.cardTitle}`}>{link.title}</span>
        <Icon name="chevronRight" size={13} />
      </div>
      <p className={styles.cardBlurb}>{link.blurb}</p>
      {link.caveat && <p className={styles.cardCaveat}>{link.caveat}</p>}
      <div className={styles.cardMeta}>
        <span className={styles.cardSource} data-source={link.source}>{link.source}</span>
        {link.author && <span>{link.author}</span>}
        {link.year && <span className="m">{link.year}</span>}
        {link.signal && <span className={`m ${styles.cardSignal}`}>{link.signal}</span>}
      </div>
    </a>
  );
}
