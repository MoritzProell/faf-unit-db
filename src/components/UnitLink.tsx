'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * A link to a unit page that prefetches on intent, not on sight.
 *
 * Next prefetches every <Link> that scrolls into view, which is right for a
 * nav bar and wrong for a roster: the landing page shows 400 units, so it
 * fetched 187 unit pages in the background, and each of those carried a
 * preload for its hero render, another 183 images at 27 KB apiece. That was
 * 6.4 MB and 370 requests of the 15.7 MB a first visit cost, for pages almost
 * nobody opens. This waits for a pointer or focus, which still lands the page
 * before the click does.
 */
export function UnitLink({
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => { setIntent(true); onMouseEnter?.(e); }}
      onFocus={(e) => { setIntent(true); onFocus?.(e); }}
      onTouchStart={(e) => { setIntent(true); onTouchStart?.(e); }}
    />
  );
}
