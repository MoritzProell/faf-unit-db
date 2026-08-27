'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'faf:url-change';

/**
 * The query string as external state.
 *
 * Filters live in the URL so any view is shareable and indexable: "every T3
 * Cybran direct-fire unit" becomes a link. Using useSyncExternalStore rather
 * than useSearchParams keeps the page statically rendered (useSearchParams
 * would force the whole subtree client-side without a Suspense boundary) and
 * keeps SSR and first paint in agreement.
 *
 * The snapshot is the raw search string, which is referentially stable, so
 * parsing is memoised by the caller.
 */
function getSnapshot(): string {
  return window.location.search;
}

const getServerSnapshot = (): string => '';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useUrlState(): [string, (search: string) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSearch = useCallback((next: string) => {
    const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
    // replaceState, not pushState: tweaking a filter should not fill the back
    // button with every intermediate state.
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [search, setSearch];
}
