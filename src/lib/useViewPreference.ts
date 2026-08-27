'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ViewMode = 'cards' | 'groups' | 'compact';

const KEY = 'faf.view';
const EVENT = 'faf:view-change';

/** The grouped roster is the default: a unit database's front page should show
 *  the whole game at once, the way the in-game roster does. */
const DEFAULT: ViewMode = 'groups';

const isView = (v: unknown): v is ViewMode => v === 'cards' || v === 'groups' || v === 'compact';

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
