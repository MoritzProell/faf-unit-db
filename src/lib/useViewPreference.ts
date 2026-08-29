'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ViewMode = 'cards' | 'onepage' | 'compact';

const KEY = 'faf.view';
const EVENT = 'faf:view-change';

/**
 * Roster is the landing view: Land, Air, Naval and Experimental side by side,
 * every tier, with the structures a scroll below. A first visit sees the whole
 * army lined up by role across the factions, which is the question this site
 * exists to answer. Anyone who has chosen a view keeps it; this is only the
 * fallback. The value is still `compact` so saved preferences survive.
 */
const DEFAULT: ViewMode = 'compact';

// 'groups' was the old third view, replaced by 'onepage'. Anyone carrying it
// in localStorage falls back to the default rather than rendering nothing.
const isView = (v: unknown): v is ViewMode => v === 'cards' || v === 'onepage' || v === 'compact';

function getSnapshot(): ViewMode {
  try {
    const raw = localStorage.getItem(KEY);
    return isView(raw) ? raw : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Server and first client paint must agree, so SSR always renders the default. */
const getServerSnapshot = (): ViewMode => DEFAULT;

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useViewPreference(): [ViewMode, (v: ViewMode) => void] {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback((next: ViewMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // preference just will not persist
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [view, setView];
}
