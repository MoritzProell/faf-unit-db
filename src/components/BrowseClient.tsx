'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { TopBar } from './TopBar';
import { FilterRail, FACTIONS, TECHS, KINDS, type Facets, type FilterState } from './FilterRail';
import { UnitTile } from './UnitTile';
import { UnitChip } from './UnitChip';
import { SectionGroups } from './SectionGroups';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { CompareTray } from './CompareTray';
import { SiteFooter } from './SiteFooter';
import { FactionMark } from './FactionMark';
import { Icon, type IconName } from './Icon';
import { useCompareSelection, MAX_COMPARE } from '@/lib/useCompareSelection';
import { useViewPreference, type ViewMode } from '@/lib/useViewPreference';
import {
  SORTS, SORT_ORDER, ROLE_KEYS, ROLE_LABEL,
  type BrowseUnit, type SortKey,
} from '@/lib/faf/browse';
import type { Faction } from '@/lib/faf/types';
import styles from './Browse.module.css';

const KIND_LABEL: Record<string, string> = { Land: 'Land', Air: 'Air', Naval: 'Naval', Base: 'Structures' };
const TECH_LABEL: Record<string, string> = { T1: 'Tech 1', T2: 'Tech 2', T3: 'Tech 3', EXP: 'T4 Experimental' };
const MOBILE_KINDS = ['Land', 'Air', 'Naval'];

const VIEWS: Array<{ id: ViewMode; label: string; icon: IconName }> = [
  { id: 'cards', label: 'Cards', icon: 'grid' },
  { id: 'groups', label: 'Groups', icon: 'layers' },
  { id: 'compact', label: 'Compact', icon: 'rows' },
];

/**
 * Landing defaults: the whole base-game roster, in the grouped layout.
 *
 * The point of a unit database's front page is seeing everything at once, the
 * way the in-game roster does. Cards are the drill-down, not the entry: at card
 * size you see fifteen units and have to scroll to learn the game exists.
 *
 * Nomads stays off because it is mod content, one click away with its count on
 * screen.
 */
const defaultFilters = (): FilterState => ({
  factions: new Set(FACTIONS.filter((f) => f !== 'Nomads')),
  techs: new Set(TECHS),
  kinds: new Set(KINDS),
  roles: new Set(ROLE_KEYS),
});

export function BrowseClient({
  units,
  facets,
  version,
}: {
  units: BrowseUnit[];
  facets: Facets;
  version: string;
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sortKey, setSortKey] = useState<SortKey>('hpPerMass');
  const [view, setView] = useViewPreference();
  const [railOpen, setRailOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const compare = useCompareSelection();

  const sort = SORTS[sortKey];

  const dirty = useMemo(() => {
    const d = defaultFilters();
    const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
    return (
      query.length > 0 ||
      !same(filters.factions, d.factions) ||
      !same(filters.techs, d.techs) ||
      !same(filters.kinds, d.kinds) ||
      !same(filters.roles, d.roles)
    );
  }, [query, filters]);

  const toggle = useCallback((group: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [group]: next };
    });
  }, []);

  const reset = useCallback(() => {
    setFilters(defaultFilters());
    setQuery('');
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rolesAllOn = filters.roles.size === ROLE_KEYS.length;

    const matched = units.filter((u) => {
      if (!filters.factions.has(u.faction)) return false;
      if (!filters.techs.has(u.tech)) return false;
      if (!filters.kinds.has(u.kind)) return false;
      // Unchecking a role excludes units that carry it; roleless units always pass.
      if (!rolesAllOn && u.roles.some((r) => !filters.roles.has(r))) return false;
      if (q) {
        const hay = `${u.name} ${u.role} ${u.type} ${u.id} ${u.abilities.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sort.direction === 'asc' ? 1 : -1;
    return matched.sort((a, b) => {
      const av = sort.value(a);
      const bv = sort.value(b);
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av === bv) return a.name.localeCompare(b.name);
      return (av - bv) * dir;
    });
  }, [units, query, filters, sort]);

  const selectedUnits = useMemo(
    () => compare.ids.map((id) => units.find((u) => u.id === id)).filter((u): u is BrowseUnit => !!u),
    [compare.ids, units]
  );

  const activeFilterCount = useMemo(() => {
    const d = defaultFilters();
    let n = 0;
    if (query) n++;
    n += FACTIONS.filter((f) => filters.factions.has(f) !== d.factions.has(f)).length;
    n += TECHS.filter((t) => filters.techs.has(t) !== d.techs.has(t)).length;
    n += KINDS.filter((k) => filters.kinds.has(k) !== d.kinds.has(k)).length;
    n += ROLE_KEYS.filter((r) => filters.roles.has(r) !== d.roles.has(r)).length;
    return n;
  }, [query, filters]);

  const title = useMemo(() => {
    const parts: string[] = [];
    if (filters.techs.size < TECHS.length) {
      parts.push(TECHS.filter((t) => filters.techs.has(t)).map((t) => TECH_LABEL[t]).join(' + '));
    }
    const kinds = KINDS.filter((k) => filters.kinds.has(k));
    const isMobile = kinds.length === 3 && MOBILE_KINDS.every((k) => filters.kinds.has(k));
    if (isMobile) parts.push('Mobile units');
    else if (kinds.length < KINDS.length) parts.push(kinds.map((k) => KIND_LABEL[k]).join(' + '));
    if (!parts.length) return query ? `Search: ${query}` : 'All units';
    return parts.join(' · ');
  }, [filters, query]);

  // Cards are grouped by section rather than presented as one flat wall of 186.
  const cardSections = useMemo(() => {
    const bySection = new Map<string, BrowseUnit[]>();
    for (const u of results) {
      const list = bySection.get(u.section);
      if (list) list.push(u);
      else bySection.set(u.section, [u]);
    }
    return [...SECTION_ORDER, 'Unknown']
      .filter((s) => bySection.has(s))
      .map((s) => [s, bySection.get(s)!] as const);
  }, [results]);

  const trayVisible = compare.ids.length > 0;

  return (
    <div className={styles.shell} data-tray={trayVisible}>
      <TopBar
        version={version}
        totalUnits={units.length}
        query={query}
        onQueryChange={setQuery}
        pickMode={pickMode}
        onTogglePickMode={() => setPickMode((v) => !v)}
      />

      <div className={styles.middle}>
        {railOpen && <div className={styles.backdrop} onClick={() => setRailOpen(false)} aria-hidden="true" />}
        <div className={styles.railWrap} data-open={railOpen}>
          <FilterRail facets={facets} state={filters} onToggle={toggle} onReset={reset} dirty={dirty} />
        </div>

        <main className={styles.main}>
          <div className={styles.resultsBar}>
            <div className={styles.resultsTop}>
              <h1 className={`t ${styles.title}`}>{title}</h1>
              <span className={styles.count}>
                {results.length} {results.length === 1 ? 'unit' : 'units'}
              </span>
              <span className={styles.spacer} />

              <button
                className={styles.filtersBtn}
                onClick={() => setRailOpen((v) => !v)}
                aria-expanded={railOpen}
              >
                <Icon name="sliders" size={13} /> Filters
                {activeFilterCount > 0 && <span className={`m ${styles.filtersCount}`}>{activeFilterCount}</span>}
              </button>

              <label className={styles.control}>
                <span className="lbl" style={{ fontSize: 9 }}>Sort</span>
                <span className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    aria-label="Sort units by"
                  >
                    {SORT_ORDER.map((k) => (
                      <option key={k} value={k}>{SORTS[k].label}</option>
                    ))}
                  </select>
                </span>
                <span style={{ color: 'var(--best)' }}>
                  <Icon name={sort.direction === 'asc' ? 'up' : 'down'} size={12} strokeWidth={2} />
                </span>
                <span style={{ color: 'var(--text-3)' }}><Icon name="chevronDown" size={12} strokeWidth={1.9} /></span>
              </label>

              <div className={styles.seg} role="group" aria-label="Layout">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    className={styles.segBtn}
                    data-on={view === v.id}
                    onClick={() => setView(v.id)}
                    aria-pressed={view === v.id}
                  >
                    <Icon name={v.icon} size={13} /> {v.label}
                  </button>
                ))}
              </div>
            </div>

            <ActiveChips filters={filters} query={query} onToggle={toggle} onClearQuery={() => setQuery('')} />
          </div>

          {pickMode && (
            <div className={styles.pickBar}>
              <Icon name="check" size={14} strokeWidth={2.4} />
              <span>
                Click units to add them to the comparison.{' '}
                <strong>{compare.ids.length}</strong> of {MAX_COMPARE} picked.
              </span>
              <span className={styles.spacer} />
              {compare.ids.length >= 2 && (
                <Link href={`/compare?ids=${compare.ids.join(',')}`} className={styles.pickGo}>
                  Compare {compare.ids.length} units
                </Link>
              )}
              <button className={styles.pickDone} onClick={() => setPickMode(false)}>Done</button>
            </div>
          )}

          {results.length === 0 ? (
            <div className={styles.empty}>
              <span className={`t ${styles.emptyTitle}`}>No units match</span>
              <p className={styles.emptyBody}>
                {query
                  ? `Nothing called "${query}" survives the current filters.`
                  : 'Every unit is filtered out by the current facets.'}
              </p>
              <button className={styles.emptyAction} onClick={reset}>Reset filters</button>
            </div>
          ) : view === 'groups' ? (
            <SectionGroups units={results} selected={compare.ids} onToggle={compare.toggle} sort={sort} />
          ) : view === 'compact' ? (
            <CompactBands units={results} selected={compare.ids} onToggle={compare.toggle} sort={sort} />
          ) : (
            <>
              {cardSections.map(([section, list], si) => (
                <div key={section} className={styles.cardSection}>
                  <div className={styles.groupHead}>
                    <span className={`lbl ${styles.groupLabel}`}>{section}</span>
                    <span className={`m ${styles.groupCount}`}>{list.length}</span>
                    <span className="rule" />
                  </div>
                  <div className={styles.grid}>
                    {list.map((u, i) => (
                      <UnitTile
                        key={u.id}
                        unit={u}
                        sort={sort}
                        selected={compare.ids.includes(u.id)}
                        onToggle={compare.toggle}
                        eager={si === 0 && i < 10}
                        pickMode={pickMode}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className={styles.end}>
                <span className="rule" />
                <span className={styles.endText}>
                  End of results · <span className="m">{results.length}</span> of{' '}
                  <span className="m">{units.length}</span> units
                </span>
                <span className="rule" />
              </div>
            </>
          )}

        </main>
      </div>

      <SiteFooter version={version} />

      {trayVisible && (
        <CompareTray
          units={selectedUnits}
          max={MAX_COMPARE}
          onRemove={compare.remove}
          onClear={compare.clear}
        />
      )}
    </div>
  );
}

function ActiveChips({
  filters,
  query,
  onToggle,
  onClearQuery,
}: {
  filters: FilterState;
  query: string;
  onToggle: (g: keyof FilterState, v: string) => void;
  onClearQuery: () => void;
}) {
  const chips: React.ReactNode[] = [];

  const chip = (key: string, label: string, onClick: () => void, excluded = false) => (
    <button key={key} className={styles.fchip} data-excluded={excluded} onClick={onClick}>
      {excluded && <span className={styles.fchipDash} aria-hidden="true" />}
      {label}
      <Icon name="close" size={11} strokeWidth={1.9} />
    </button>
  );

  if (query) chips.push(chip('q', `"${query}"`, onClearQuery));
  if (filters.techs.size < TECHS.length) {
    TECHS.filter((t) => filters.techs.has(t)).forEach((t) => chips.push(chip(`t-${t}`, TECH_LABEL[t], () => onToggle('techs', t))));
  }
  const kindsOn = KINDS.filter((k) => filters.kinds.has(k));
  if (kindsOn.length < KINDS.length) {
    if (kindsOn.length === 3 && !filters.kinds.has('Base')) {
      chips.push(chip('k-mobile', 'Mobile units', () => onToggle('kinds', 'Base')));
    } else {
      kindsOn.forEach((k) => chips.push(chip(`k-${k}`, KIND_LABEL[k], () => onToggle('kinds', k))));
    }
  }
  FACTIONS.filter((f) => !filters.factions.has(f)).forEach((f) =>
    chips.push(chip(`f-${f}`, f, () => onToggle('factions', f), true))
  );
  ROLE_KEYS.filter((r) => !filters.roles.has(r)).forEach((r) =>
    chips.push(chip(`r-${r}`, ROLE_LABEL[r], () => onToggle('roles', r), true))
  );

  if (!chips.length) return null;
  return <div className={styles.filterChips}>{chips}</div>;
}

function CompactBands({
  units,
  selected,
  onToggle,
  sort,
}: {
  units: BrowseUnit[];
  selected: string[];
  onToggle: (id: string) => void;
  sort: (typeof SORTS)[SortKey];
}) {
  const bands = FACTIONS.map((f) => [f, units.filter((u) => u.faction === f)] as const).filter(
    ([, list]) => list.length > 0
  );

  return (
    <div className={styles.bands}>
      {bands.map(([faction, list], bi) => (
        <div key={faction} className={styles.band} data-faction={faction}>
          <div className={styles.bandHead}>
            <FactionMark faction={faction as Faction} size={15} />
            <span className={`t ${styles.bandName}`}>{faction}</span>
            <span className={`m ${styles.bandCount}`}>{list.length}</span>
          </div>
          <div className={styles.bandUnits}>
            {list.map((u, i) => (
              <UnitChip
                key={u.id}
                unit={u}
                size={44}
                selected={selected.includes(u.id)}
                onToggle={onToggle}
                sort={sort}
                eager={bi === 0 && i < 24}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
