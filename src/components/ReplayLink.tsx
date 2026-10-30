'use client';

import { Icon } from './Icon';
import { REPLAY_VIEWER_URL } from '@/lib/site';
import styles from './ReplayLink.module.css';

/** What the viewer is for, in one line. Says what it shows, not how. */
export const REPLAY_BLURB =
  'Watch any FAF replay in your browser: who won, the battle on the map, build orders and economy.';

const PROMO_KEY = 'faf.replayPromo';

/**
 * The replay viewer's mark: a play button cut out of the four original
 * factions' colours. The site's own mark is a grid of squares in white; this
 * is the one thing on it that is not a unit, so it gets the one gradient.
 */
export function ReplayMark({ className }: { className?: string }) {
  return <span className={className ? `${styles.mark} ${className}` : styles.mark} aria-hidden="true" />;
}

/**
 * The top-bar entry. It was a row at the bottom of the filter rail and a word
 * in the footer, which on a phone meant it was behind the Filters button; the
 * top bar is on every page at every width.
 */
export function ReplayNavLink() {
  return (
    <a
      href={REPLAY_VIEWER_URL}
      className={styles.nav}
      target="_blank"
      rel="noopener"
      title={REPLAY_BLURB}
      aria-label="Replay viewer (opens in a new tab)"
    >
      <ReplayMark />
      <span className={styles.navLabel}>Replays</span>
      <span className={styles.navOut}><Icon name="external" size={11} strokeWidth={1.8} /></span>
    </a>
  );
}

/**
 * A one-line strip on the browse page, beside the active filters, so it costs
 * no height of its own in the default view, where that row already exists.
 *
 * Dismissal is a class on <html> set before paint by the layout's inline
 * script, not React state: a dismissed strip never flashes in and the server
 * render does not have to guess.
 */
export function ReplayPromo() {
  const dismiss = () => {
    try {
      localStorage.setItem(PROMO_KEY, 'dismissed');
    } catch {
      // still hides for this visit
    }
    document.documentElement.dataset.replayPromo = 'dismissed';
  };
  return (
    <div className={styles.promo}>
      <a href={REPLAY_VIEWER_URL} className={styles.promoLink} target="_blank" rel="noopener">
        <ReplayMark className={styles.promoMark} />
        <span className={styles.promoText}>
          <span className={`t ${styles.promoTitle}`}>Replay viewer</span>
          <span className={styles.promoSub}>{REPLAY_BLURB}</span>
        </span>
        <span className={styles.promoCta}>
          Open <Icon name="external" size={11} strokeWidth={1.8} />
        </span>
      </a>
      <button type="button" className={styles.promoClose} onClick={dismiss} aria-label="Hide the replay viewer banner">
        <Icon name="close" size={11} strokeWidth={1.9} />
      </button>
    </div>
  );
}
