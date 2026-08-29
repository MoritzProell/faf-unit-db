/**
 * How to arrange a set of section columns so all of them fit one screen.
 *
 * Pulled out of the component because it is arithmetic, not rendering, and
 * because a browser is a bad place to check arithmetic: a ResizeObserver does
 * not fire for a zoom change, so the obvious way to fake a wide viewport
 * silently leaves the solver holding its old measurement. As a pure function it
 * can be asked what it would do at 3440x1440 without owning a screen that size.
 */

/** What one section column costs, in chips and in the furniture around them. */
export type ColumnMetric = {
  /** Chips across its widest tier. */
  chips: number;
  /** Role columns in that tier, each of which carries its own padding. */
  cols: number;
  /** Faction rows, summed over the tiers it has. */
  rows: number;
  /** Tiers, each of which carries a role-label strip. */
  heads: number;
};

/* Kept in step with OnePage.module.css, and measured on the live page rather
   than read off the rules: the column header's 38px is 10px of padding and a
   border on top of an 8px label, which is not what the stylesheet looks like it
   says. A header modelled 4px short clipped the bottom row of every column. */
const HEAD_H = 34;
const COL_HEAD_H = 38;
const ROW_PAD = 3;
const BAND_GAP = 8;
const COL_GAP = 8;

/**
 * Per section column: tier tab 17, faction mark 11, its gap 5, row padding 10,
 * borders 2, then 4px for each role column and 2px for each chip gap.
 */
function furnitureOf(part: ColumnMetric[]): number {
  return (
    part.reduce((n, m) => n + 45 + 4 * m.cols + 2 * (m.chips - m.cols), 0) +
    COL_GAP * (part.length - 1) +
    18
  );
}

function bandOf(part: ColumnMetric[]) {
  return {
    wide: part.reduce((n, m) => n + m.chips, 0),
    furniture: furnitureOf(part),
    rows: Math.max(1, ...part.map((m) => m.rows)),
    heads: Math.max(1, ...part.map((m) => m.heads)),
  };
}

/** The chip a given split affords: whichever of width and height runs out first. */
export function chipFor(metrics: ColumnMetric[], cuts: number[], w: number, h: number): number {
  const bounds = [0, ...cuts, metrics.length];
  const bands = bounds.slice(0, -1).map((from, i) => bandOf(metrics.slice(from, bounds[i + 1])));
  if (bands.some((b) => b.wide === 0)) return 0;

  const byWidth = Math.min(...bands.map((b) => (w - b.furniture) / b.wide));
  // Per band: the column header, a role-label strip per tier, and every unit
  // row's own padding and border. What is left of the height divides by the
  // rows those bands stack up.
  const fixed = bands.reduce(
    (t, b) => t + COL_HEAD_H + b.heads * (HEAD_H + 1) + b.rows * (ROW_PAD * 2 + 1),
    0
  );
  const totalRows = bands.reduce((t, b) => t + b.rows, 0);
  const byHeight = (h - fixed - BAND_GAP * (bands.length - 1)) / totalRows;
  return Math.min(byWidth, byHeight);
}

/**
 * The best split of these columns into bands, and the chip size it buys.
 *
 * All nine sections in one row is the obvious reading, and on a very wide
 * screen it wins outright. But the same row on a 2560 is starved for width
 * while half the height goes unused, and two bands turn that spare height into
 * chip. Which way round it falls depends on the shape of the screen, so both
 * are costed and the larger chip wins.
 *
 * Candidates are contiguous splits only, so reading order survives: a band is
 * always a run of adjacent sections, never a regrouping. Up to two cuts, which
 * for nine sections is 37 candidates of pure arithmetic.
 *
 * A split has to be worth something to win. On a 2560x1440 the best split beats
 * one row by 0.7px, and it buys that by putting Land alone on the top band with
 * the other eight sections beneath it, which is a worse thing to read for a
 * difference nobody can see. So one row is the default and a split has to be
 * meaningfully better, not merely better.
 */
const SPLIT_GAIN = 1.12;

export function solveBands(
  metrics: ColumnMetric[],
  w: number,
  h: number
): { chip: number; cuts: number[] } {
  const n = metrics.length;
  if (n === 0 || w <= 0 || h <= 0) return { chip: 0, cuts: [] };

  let best = { chip: chipFor(metrics, [], w, h), cuts: [] as number[] };
  for (let a = 1; a < n; a++) {
    const candidates: number[][] = [[a]];
    for (let b = a + 1; b < n; b++) candidates.push([a, b]);
    for (const cuts of candidates) {
      const chip = chipFor(metrics, cuts, w, h);
      if (chip > best.chip * (best.cuts.length ? 1 : SPLIT_GAIN)) best = { chip, cuts };
    }
  }
  return best;
}
