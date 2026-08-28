/* eslint-disable @next/next/no-img-element */
import type { Faction } from '@/lib/faf/types';

/**
 * The upgrade's own button art, vendored from FAForever/UnitDB into
 * public/enhancements/<Faction>/<icon>.png. UnitDB names each file after the
 * same abbreviation the blueprint puts in the enhancement's `Icon` field, so
 * the mapping is exact. Upgrades without an icon field render nothing rather
 * than a broken image.
 */
export function EnhancementIcon({
  faction,
  icon,
  size = 26,
}: {
  faction: Faction;
  icon?: string;
  size?: number;
}) {
  if (!icon) return null;
  return (
    <img
      src={`/enhancements/${faction}/${icon.toLowerCase()}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ display: 'block', flexShrink: 0, borderRadius: 4 }}
    />
  );
}
