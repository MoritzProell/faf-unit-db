'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'faf.compare';
const EVENT = 'faf:compare-change';
export const MAX_COMPARE = 4;

const EMPTY: string[] = [];

/**
 * getSnapshot must be referentially stable or React re-renders forever, so the
 * parsed array is cached and only rebuilt when the stored string changes.
 */
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_COMPARE);
    return ids.length ? ids : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

const getServerSnapshot = (): string[] => EMPTY;

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

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // private mode, quota, whatever: the selection just does not persist
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * The comparison basket, shared by every route.
 *
 * It used to be browse-page state, which meant the top-right Compare button was
 * dead on a unit page: nothing to link to. Keeping it in one external store lets
 * you collect units while reading detail pages and compare them from anywhere.
 */
export function useCompareSelection() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    if (current.includes(id)) write(current.filter((x) => x !== id));
    else if (current.length < MAX_COMPARE) write([...current, id]);
  }, []);

  const remove = useCallback((id: string) => write(getSnapshot().filter((x) => x !== id)), []);
  const clear = useCallback(() => write([]), []);

  return {
    ids,
    toggle,
    remove,
    clear,
    isFull: ids.length >= MAX_COMPARE,
    href: ids.length >= 2 ? `/compare?ids=${ids.join(',')}` : undefined,
  };
}
