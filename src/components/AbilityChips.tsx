import styles from './AbilityChips.module.css';

/**
 * Fits chips on one line, then says honestly how many it dropped. Widths are
 * estimated from the chip's own metrics so every tile's chip row is one line
 * tall, whatever the ability names happen to be.
 */
export function fitAbilities(abilities: string[], cap = 2, avail = 131) {
  if (!abilities.length) return { shown: [] as string[], rest: 0 };
  const width = (t: string) => 10 + 5.6 * t.length;
  const GAP = 4;
  const PLUS = 25;

  const head = abilities.slice(0, cap);
  const total = head.reduce((s, a) => s + width(a), 0) + GAP * (head.length - 1);
  if (head.length === abilities.length && total <= avail) {
    return { shown: head, rest: 0 };
  }

  const shown: string[] = [];
  let used = 0;
  for (const a of head) {
    const w = width(a) + (shown.length ? GAP : 0);
    if (shown.length && used + w > avail - PLUS - GAP) break;
    shown.push(a);
    used += w;
  }
  return { shown, rest: abilities.length - shown.length };
}

export function AbilityChips({
  abilities,
  cap = 2,
  avail = 131,
}: {
  abilities: string[];
  cap?: number;
  avail?: number;
}) {
  const { shown, rest } = fitAbilities(abilities, cap, avail);
  if (!shown.length) return null;
  return (
    <div className={styles.row}>
      {shown.map((a) => (
        <span key={a} className={styles.chip} title={a}>
          {a}
        </span>
      ))}
      {rest > 0 && (
        <span
          className={`${styles.chip} ${styles.more}`}
          title={abilities.slice(shown.length).join(', ')}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
