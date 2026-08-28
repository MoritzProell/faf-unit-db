import { Icon } from './Icon';
import styles from './Marks.module.css';

/** The reference app rings its mass glyph in #88d81b and energy in #edc319. */
export function MassMark({ size = 13 }: { size?: number }) {
  const dot = Math.max(3, size - 8);
  return (
    <span className={`${styles.ring} ${styles.mass}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className={styles.massDot} style={{ width: dot, height: dot }} />
    </span>
  );
}

export function EnergyMark({ size = 13 }: { size?: number }) {
  return (
    <span className={`${styles.ring} ${styles.energy}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="bolt" size={Math.max(8, size - 5)} strokeWidth={1.4} />
    </span>
  );
}

/** Green, because health is green everywhere on this site. */
export function HealthMark({ size = 13 }: { size?: number }) {
  return (
    <span className={`${styles.ring} ${styles.health}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="health" size={Math.max(8, size - 5)} strokeWidth={1.4} />
    </span>
  );
}

/** Blue, because shields are blue in the game. */
export function ShieldMark({ size = 13 }: { size?: number }) {
  return (
    <span className={`${styles.ring} ${styles.shield}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="shield" size={Math.max(8, size - 5)} strokeWidth={1.4} />
    </span>
  );
}

export function TimeMark({ size = 13 }: { size?: number }) {
  return (
    <span className={`${styles.ring} ${styles.time}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="clock" size={Math.max(8, size - 5)} strokeWidth={1.4} />
    </span>
  );
}
