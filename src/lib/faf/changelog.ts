import { cache } from 'react';
import changelog from '@/data/changelog.json';
import type { PatchDiff } from './diff';

const patches = changelog as unknown as PatchDiff[];

export const getPatches = cache(async (): Promise<PatchDiff[]> => patches);

export const getPatch = cache(async (version: string): Promise<PatchDiff | undefined> =>
  patches.find((p) => p.version === version)
);

/** Every patch in which this unit's blueprint moved, newest first. */
export const getUnitHistory = cache(async (id: string) =>
  patches
    .map((p) => ({ version: p.version, change: p.changed.find((c) => c.id === id) }))
    .filter((x): x is { version: string; change: NonNullable<typeof x.change> } => !!x.change)
);

/** Ids touched by the most recent patch that touched anything. */
export const getRecentlyChanged = cache(async (): Promise<{ version: string; ids: Set<string> } | null> => {
  const p = patches.find((x) => x.changed.length > 0 || x.added.length > 0);
  if (!p) return null;
  return {
    version: p.version,
    ids: new Set([...p.changed.map((c) => c.id), ...p.added.map((a) => a.id)]),
  };
});
