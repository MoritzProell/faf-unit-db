import Link from 'next/link';
import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { getUnitData, getUnitsByIds } from '@/lib/faf/data';
import { buildCompare } from '@/lib/faf/compare';
import { CompareTable, type CompareUnit } from './CompareTable';
import styles from './compare.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Compare units',
  description: 'Compare Supreme Commander: Forged Alliance Forever units side by side, with the winner marked on every stat.',
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const { units: all, version } = await getUnitData();
  const requested = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const units = await getUnitsByIds(requested);

  if (units.length < 2) {
    return (
      <div className={styles.pageShell}>
        <TopBar version={version} totalUnits={all.length} />
        <p className={styles.notice}>
          Pick at least two units to compare. <Link href="/">Back to all units</Link>.
        </p>
        <span style={{ flex: 1 }} />
        <SiteFooter version={version} />
      </div>
    );
  }

  const groups = buildCompare(units);
  const compareUnits: CompareUnit[] = units.map((u) => ({
    id: u.Id,
    slug: u.slug,
    name: u.name,
    role: u.role,
    faction: u.faction,
    techLabel: u.techLabel,
    mass: u.mass,
    energy: u.energy,
    buildTime: u.buildTime,
    abilities: u.abilities,
  }));

  return (
    <div className={styles.pageShell}>
      <TopBar version={version} totalUnits={all.length} />
      <CompareTable units={compareUnits} groups={groups} />
      <SiteFooter version={version} />
    </div>
  );
}
