import { ROLE_KEYS, SORTS, type SortKey } from './browse';
import type { Faction, Kind, Tech } from './types';

export const FACTIONS: Faction[] = ['UEF', 'Cybran', 'Aeon', 'Seraphim', 'Nomads'];
export const TECHS: Tech[] = ['T1', 'T2', 'T3', 'EXP'];
export const KINDS: Kind[] = ['Land', 'Air', 'Naval', 'Base'];
export const VIEWS = ['cards', 'groups', 'compact'] as const;
export type ViewMode = (typeof VIEWS)[number];

export interface BrowseState {
  query: string;
  factions: Set<string>;
  techs: Set<string>;
  kinds: Set<string>;
  roles: Set<string>;
  sort: SortKey;
  view: ViewMode;
}

/**
 * Landing defaults: the whole base-game roster in the grouped layout. Nomads is
 * mod content, off by default and one click away with its count on screen.
 */
export const defaults = (view: ViewMode = 'compact'): BrowseState => ({
  query: '',
  factions: new Set(FACTIONS.filter((f) => f !== 'Nomads')),
  techs: new Set(TECHS),
  kinds: new Set(KINDS),
  roles: new Set(ROLE_KEYS),
  sort: 'hpPerMass',
  view,
});

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** Short keys keep shared links readable: ?f=UEF,Cybran&t=T3&k=Land */
const parseSet = (raw: string | null, all: string[], fallback: Set<string>): Set<string> => {
  if (raw === null) return fallback;
  const picked = raw.split(',').map((s) => s.trim()).filter((s) => all.includes(s));
  return picked.length ? new Set(picked) : fallback;
};

export function parseBrowseState(search: string, viewPreference: ViewMode): BrowseState {
  const p = new URLSearchParams(search);
  const d = defaults(viewPreference);
  const view = p.get('v');
  const sort = p.get('s');

  return {
    query: p.get('q') ?? '',
    factions: parseSet(p.get('f'), FACTIONS, d.factions),
    techs: parseSet(p.get('t'), TECHS, d.techs),
    kinds: parseSet(p.get('k'), KINDS, d.kinds),
    roles: parseSet(p.get('r'), ROLE_KEYS, d.roles),
    sort: sort && sort in SORTS ? (sort as SortKey) : d.sort,
    view: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : d.view,
  };
}

/** Only non-default values are written, so a default view has a clean URL. */
export function serialiseBrowseState(state: BrowseState, viewPreference: ViewMode): string {
  const d = defaults(viewPreference);
  const p = new URLSearchParams();

  if (state.query) p.set('q', state.query);
  if (!sameSet(state.factions, d.factions)) p.set('f', FACTIONS.filter((x) => state.factions.has(x)).join(','));
  if (!sameSet(state.techs, d.techs)) p.set('t', TECHS.filter((x) => state.techs.has(x)).join(','));
  if (!sameSet(state.kinds, d.kinds)) p.set('k', KINDS.filter((x) => state.kinds.has(x)).join(','));
  if (!sameSet(state.roles, d.roles)) p.set('r', ROLE_KEYS.filter((x) => state.roles.has(x)).join(','));
  if (state.sort !== d.sort) p.set('s', state.sort);
  if (state.view !== d.view) p.set('v', state.view);

  return p.toString();
}

export const isDefault = (state: BrowseState, viewPreference: ViewMode): boolean =>
  serialiseBrowseState(state, viewPreference) === '';
