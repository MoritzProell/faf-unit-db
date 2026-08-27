import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { SiteFooter } from '@/components/SiteFooter';
import { UnitWell } from '@/components/UnitWell';
import { getUnitData } from '@/lib/faf/data';
import { getPatches } from '@/lib/faf/changelog';
import { buildRelations } from '@/lib/faf/related';
import type { FieldChange, UnitChange } from '@/lib/faf/diff';
import type { Faction } from '@/lib/faf/types';
import styles from './changelog.module.css';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Patch changes',
  description:
    'What each Forged Alliance Forever patch actually changed, computed from the unit blueprints themselves, alongside FAF’s own release notes.',
};

export default async function ChangelogPage() {
  const { units, version } = await getUnitData();
  const patches = await getPatches();
  const byId = new Map(units.map((u) => [u.Id, u]));

  // A unit and the units it builds are one system, so they read together. The
  // Novax Center and its Defense Satellite are the case that motivated this.
  const childToParent = new Map<string, string>();
  for (const [parent, kids] of buildRelations(units)) {
    for (const k of kids) childToParent.set(k, parent);
  }

  return (
    <div className={styles.shell}>
      <TopBar version={version} totalUnits={units.length} />

      <main className={styles.wrap}>
        <div className={styles.head}>
          <h1 className={`t ${styles.title}`}>Patch changes</h1>
        </div>
        <p className={styles.lede}>
          Every stat change below is computed by diffing the unit blueprints between patches, so it
          reflects what actually shipped rather than what the notes mention. FAF&rsquo;s own release
          notes sit alongside for the reasoning.
        </p>

        {patches.length === 0 ? (
          <p className={styles.empty}>No patch history recorded yet.</p>
        ) : (
          patches.map((p) => (
            <section key={p.version} id={`patch-${p.version}`} className={styles.patch}>
              <div className={styles.patchHead}>
                <h2 className={`t ${styles.patchVersion}`}>Patch {p.version}</h2>
                <span className={styles.patchMeta}>
                  {p.changed.length === 0 && p.added.length === 0
                    ? `no unit changes since ${p.previousVersion}`
                    : [
                        p.changed.length ? `${p.changed.length} units changed` : null,
                        p.added.length ? `${p.added.length} added` : null,
                        p.removed.length ? `${p.removed.length} removed` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
                {p.notesUrl && (
                  <a className={styles.patchLink} href={p.notesUrl} target="_blank" rel="noopener noreferrer">
                    Official notes
                  </a>
                )}
              </div>

              <div className={styles.cols} data-single={p.changed.length === 0 && p.added.length === 0}>
                <div>
                  <div className={`lbl ${styles.sectionLabel}`}>Unit changes</div>
                  {p.changed.length === 0 && p.added.length === 0 ? (
                    <p className={styles.empty}>
                      No unit blueprint changed in this patch. It was fixes and other work.
                    </p>
                  ) : (
                    <>
                      {p.added.map((a) => {
                        const u = byId.get(a.id);
                        return (
                          <Link key={a.id} href={`/unit/${a.slug}`} className={styles.unit} data-faction={a.faction}>
                            <div className={styles.unitTop}>
                              {u && (
                                <UnitWell id={u.Id} faction={u.faction} techLabel={u.techLabel} size={30} imageSize={28} pip={false} hasRender={u.hasRender} />
                              )}
                              <span className={`t ${styles.unitName}`}>{a.name}</span>
                              <span className={styles.badge}>NEW</span>
                              <span className={styles.unitRole}>{a.role}</span>
                            </div>
                          </Link>
                        );
                      })}
                      {(() => {
                        const changedIds = new Set(p.changed.map((c) => c.id));
                        const nested = new Map<string, UnitChange[]>();
                        const top: UnitChange[] = [];
                        for (const c of p.changed) {
                          const parent = childToParent.get(c.id);
                          if (parent && changedIds.has(parent)) {
                            nested.set(parent, [...(nested.get(parent) ?? []), c]);
                          } else {
                            top.push(c);
                          }
                        }
                        return top.map((c) => (
                          <ChangedUnit
                            key={c.id}
                            change={c}
                            hasRender={byId.get(c.id)?.hasRender ?? false}
                            related={(nested.get(c.id) ?? []).map((r) => ({
                              change: r,
                              hasRender: byId.get(r.id)?.hasRender ?? false,
                            }))}
                          />
                        ));
                      })()}
                    </>
                  )}
                </div>

                <div>
                  <div className={`lbl ${styles.sectionLabel}`}>FAF release notes</div>
                  {p.notes?.length ? (
                    <div className={styles.notes}>
                      {p.notes.map((s) => (
                        <div key={s.heading}>
                          <div className={styles.noteHeading}>{s.heading}</div>
                          <ul className={styles.noteList}>
                            {s.items.slice(0, 12).map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                          {s.items.length > 12 && (
                            <p className={styles.more}>
                              +{s.items.length - 12} more in the{' '}
                              <a href={p.notesUrl} target="_blank" rel="noopener noreferrer">official notes</a>.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>No release notes published for this patch.</p>
                  )}
                </div>
              </div>
            </section>
          ))
        )}
      </main>

      <SiteFooter version={version} />
    </div>
  );
}

function ChangedUnit({
  change,
  hasRender,
  related = [],
}: {
  change: UnitChange;
  hasRender: boolean;
  related?: Array<{ change: UnitChange; hasRender: boolean }>;
}) {
  return (
    <div className={styles.unitGroup} data-faction={change.faction}>
      <Link href={`/unit/${change.slug}`} className={styles.unit} data-faction={change.faction}>
        <div className={styles.unitTop}>
          <UnitWell
            id={change.id}
            faction={change.faction as Faction}
            techLabel={change.techLabel}
            size={30}
            imageSize={28}
            pip={false}
            hasRender={hasRender}
          />
          <span className={`t ${styles.unitName}`}>{change.name}</span>
          <span className={styles.unitRole}>{change.role}</span>
        </div>
        <div className={styles.fields}>
          {change.fields.map((f, i) => (
            <FieldPill key={i} field={f} />
          ))}
        </div>
      </Link>

      {related.map((r) => (
        <Link
          key={r.change.id}
          href={`/unit/${r.change.slug}`}
          className={`${styles.unit} ${styles.related}`}
          data-faction={r.change.faction}
        >
          <div className={styles.unitTop}>
            <span className={styles.relatedTick} aria-hidden="true">&#8627;</span>
            <UnitWell
              id={r.change.id}
              faction={r.change.faction as Faction}
              techLabel={r.change.techLabel}
              size={26}
              imageSize={24}
              pip={false}
              hasRender={r.hasRender}
            />
            <span className={`t ${styles.unitName}`}>{r.change.name}</span>
            <span className={styles.unitRole}>{r.change.role}</span>
          </div>
          <div className={styles.fields}>
            {r.change.fields.map((f, i) => (
              <FieldPill key={i} field={f} />
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function FieldPill({ field: f }: { field: FieldChange }) {
  const numeric = typeof f.from === 'number' && typeof f.to === 'number';
  const better = numeric && f.higherIsBetter !== undefined
    ? (f.to as number) > (f.from as number) === f.higherIsBetter
    : undefined;
  const tone = better === undefined ? '' : better ? styles.up : styles.down;
  const fmt = (v: number | string | null) =>
    v === null ? '–' : typeof v === 'number' ? v.toLocaleString('en-GB').replace(/,/g, ' ') : v;

  return (
    <span className={styles.field}>
      <span className={styles.fieldLabel}>{f.label}</span>
      {f.from !== null && <span className={`m ${styles.from}`}>{fmt(f.from)}</span>}
      <span className={styles.arrow}>&rarr;</span>
      <span className={`m ${styles.to} ${tone}`}>{fmt(f.to)}</span>
    </span>
  );
}
