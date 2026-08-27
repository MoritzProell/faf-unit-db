/* eslint-disable @next/next/no-img-element */
import type { Faction } from '@/lib/faf/types';
import { FactionMark } from './FactionMark';
import styles from './UnitWell.module.css';

/**
 * The faction-tinted plate a unit render sits in. Images are vendored under
 * public/units/<Id>.png by scripts/fetch-images.ts, with a 256px Lanczos
 * upscale alongside in public/units-lg for the few places drawn large.
 */
export function UnitWell({
  id,
  faction,
  techLabel,
  size = 60,
  imageSize,
  pip = true,
  priority = false,
  hasRender = true,
  hires = false,
  className,
}: {
  id: string;
  faction: Faction;
  techLabel: string;
  size?: number;
  imageSize?: number;
  pip?: boolean;
  priority?: boolean;
  /** A few blueprints have no render; show the faction mark rather than a gap. */
  hasRender?: boolean;
  /**
   * Draw from the 256px upscale. Worth ~20 KB a unit, so it is opt-in: the
   * browse grid renders hundreds of small wells and keeps the 64px original.
   */
  hires?: boolean;
  /** Lets a caller hang its own rules on the well (the unit hero resizes in dense mode). */
  className?: string;
}) {
  const inner = imageSize ?? Math.round(size * 0.93);
  return (
    <div
      className={className ? `${styles.well} ${className}` : styles.well}
      data-faction={faction}
      style={{ width: size, height: size }}
    >
      {hasRender ? (
        <img
          className={styles.img}
          src={`/units${hires ? '-lg' : ''}/${id}.png`}
          alt=""
          width={inner}
          height={inner}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
        />
      ) : (
        <span className={styles.placeholder} title="No unit render available">
          <FactionMark faction={faction} size={Math.round(inner * 0.5)} opacity={0.45} />
        </span>
      )}
      {pip && (
        <span className={`${styles.pip} m`} aria-hidden="true">
          {techLabel.replace('T', '')}
        </span>
      )}
    </div>
  );
}
