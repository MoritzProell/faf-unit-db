'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { TopBar } from './TopBar';
import { FilterRail, FACTIONS, TECHS, KINDS, type Facets, type FilterState } from './FilterRail';
import { UnitTile } from './UnitTile';
import { SectionGroups } from './SectionGroups';
import { CompactGroups } from './CompactGroups';
import { SECTION_ORDER } from '@/lib/faf/sections';
import { CompareTray } from './CompareTray';
import { SiteFooter } from './SiteFooter';
import { Icon, type IconName } from './Icon';
import { useCompareSelection, MAX_COMPARE } from '@/lib/useCompareSelection';
import { useViewPreference } from '@/lib/useViewPreference';
import { useUrlState } from '@/lib/useUrlState';
import {
  parseBrowseState, serialiseBrowseState, isDefault, defaults,
  type BrowseState, type ViewMode,
} from '@/lib/faf/urlFilters';
import {
  SORTS, SORT_ORDER, ROLE_KEYS, ROLE_LABEL,
  type BrowseUnit, type SortKey,
} from '@/lib/faf/browse';

import styles from './Browse.module.css';

const KIND_LABEL: Record<string, string> = { Land: 'Land', Air: 'Air', Naval: 'Naval', Base: 'Structures' };
const TECH_LABEL: Record<string, string> = { T1: 'Tech 1', T2: 'Tech 2', T3: 'Tech 3', EXP: 'T4 Experimental' };
const MOBILE_KINDS = ['Land', 'Air', 'Naval'];

const VIEWS: Array<{ id: ViewMode; label: string; icon: IconName }> = [
  { id: 'cards', label: 'Cards', icon: 'grid' },
  { id: 'groups', label: 'Groups', icon: 'layers' },
  { id: 'compact', label: 'Compact', icon: 'rows' },
];

export function BrowseClient({
  units,
  facets,
  version,
}: {
  units: BrowseUnit[];
  facets: Facets;
  version: string;
}) {
  const [search, setSearch] = useUrlState();
  const [viewPreference, setViewPreference] = useViewPreference();
  const [railOpen, setRailOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const compare = useCompareSelection();

  // Everything the browse screen shows is derived from the URL, so any view can
  // be copied out of the address bar and shared.
  const state = useMemo(() => parseBrowseState(search, viewPreference), [search, viewPreference]);
  const { query, sort: sortKey, view } = state;
  const filters: FilterState = state;
  const sort = SORTS[sortKey];

  const update = useCallback(
    (patch: Partial<BrowseState>) => {
      const next = { ...parseBrowseState(window.location.search, viewPreference), ...patch };
      setSearch(serialiseBrowseState(next, viewPreference));
    },
    [setSearch, viewPreference]
  );

  const setQuery = useCallback((q: string) => update({ query: q }), [update]);
  const setSortKey = useCallback((s: SortKey) => update({ sort: s }), [update]);

  // The layout is a lasting preference as well as a shareable one: a link that
  // names a view wins for that visit, but choosing one also remembers it.
  const setView = useCallback(
    (v: ViewMode) => {
      setViewPreference(v);
      update({ view: v });
    },
    [setViewPreference, update]
  );

  const dirty = !isDefault(state, viewPreference);

  const toggle = useCallback(
    (group: keyof FilterState, value: string) => {
      const next = new Set(state[group]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      update({ [group]: next } as Partial<BrowseState>);
    },
    [state, update]
  );

  const reset = useCallback(() => setSearch(''), [setSearch]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rolesAllOn = filters.roles.size === ROLE_KEYS.length;

    const matched = units.filter((u) => {
      if (!filters.factions.has(u.faction)) return false;
      if (!filters.techs.has(u.tech)) return false;
      if (!filters.kinds.has(u.kind)) return false;
      // Unchecking a role excludes units that carry it; roleless units always pass.
      if (!rolesAllOn && u.roles.some((r) => !filters.roles.has(r))) return false;
      // Prebuilt on the server, and wider than the game's own words: it
      // carries the community's names too, so "tmd" and "terminal missile
      // defense" find the buildings the game calls Tactical Missile Defense.
      if (q && !u.search.includes(q)) return false;
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
    const d = defaults(viewPreference);
    let n = 0;
    if (query) n++;
    n += FACTIONS.filter((f) => filters.factions.has(f) !== d.factions.has(f)).length;
    n += TECHS.filter((t) => filters.techs.has(t) !== d.techs.has(t)).length;
    n += KINDS.filter((k) => filters.kinds.has(k) !== d.kinds.has(k)).length;
    n += ROLE_KEYS.filter((r) => filters.roles.has(r) !== d.roles.has(r)).length;
    return n;
  }, [query, filters, viewPreference]);

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

              {/* Groups arranges by section, tier, faction and role, so it has
                  no free axis left for a sort to act on. Showing the control
                  there implies it does something. */}
              {view !== 'groups' && (
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
              )}

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
            <SectionGroups units={results} selected={compare.ids} onToggle={compare.toggle} sort={sort} pickMode={pickMode} />
          ) : view === 'compact' ? (
            <CompactGroups units={results} selected={compare.ids} onToggle={compare.toggle} sort={sort} pickMode={pickMode} />
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

