import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { Icon } from '@/components/Icon';
import { getUnitData } from '@/lib/faf/data';
import { buildSlots } from '@/lib/faf/slots';
import { FactionsClient, type SlotLite } from './FactionsClient';
import styles from './factions.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Faction comparison',
  description:
    'Every job in Forged Alliance Forever with all five factions side by side: who has the strongest T2 shield, the longest-ranged T3 artillery, and which slots only one faction can field.',
};

export default async function FactionsPage() {
  const { units, version } = await getUnitData();
  const slots = buildSlots(units);

  const lite: SlotLite[] = slots.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    tech: s.tech,
    techLabel: s.techLabel,
    kind: s.kind,
    columns: s.metrics.map((m) => m.label),
    unique: s.unique,
    missing: s.missing,
    rows: s.rows.map((r) => ({
      id: r.unit.Id,
      slug: r.unit.slug,
      name: r.unit.name,
      faction: r.unit.faction,
      techLabel: r.unit.techLabel,
      hasRender: r.unit.hasRender,
      values: r.values,
    })),
  }));

  const uniqueCount = lite.filter((s) => s.unique).length;

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <div className={styles.head}>
        <Link href="/" className={styles.back}>
          <Icon name="chevronLeft" size={13} strokeWidth={2.2} /> All units
        </Link>
        <h1 className={`t ${styles.title}`}>Faction comparison</h1>
        <p className={styles.lede}>
          {lite.length} jobs, each with every faction that fields one side by side and the best
          figure in each column marked. {uniqueCount} of them only one faction can build at all.
          Which figures are shown depends on the job: shields are compared on strength, radius,
          regeneration and upkeep, not on damage.
        </p>
      </div>

      <FactionsClient slots={lite} />

      <SiteFooter version={version} />
    </div>
  );
}
