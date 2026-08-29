'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, as React state.
 *
 * Deliberately not a `useState` plus an effect: that renders the false branch
 * first and then swaps, which for a whole-page layout is a visible flash of
 * the wrong view. `useSyncExternalStore` reads the real value on the client's
 * first render and only the server sees the fallback.
 *
 * The server has no viewport, so `getServerSnapshot` must answer something:
 * it answers false, meaning the narrow layout is what gets prerendered and
 * what anyone without JavaScript keeps. That is the right way round, since
 * the narrow layout is the one that works at every width.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
