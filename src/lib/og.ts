import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export const FACTION_COLOR: Record<string, string> = {
  UEF: '#2d78b2',
  Cybran: '#df2d0e',
  Aeon: '#19b340',
  Seraphim: '#fcb419',
  Nomads: '#e17d23',
};

/**
 * Satori cannot use the CSS-loaded webfonts, so the card ships its own static
 * instances. Montserrat is variable-only on Google Fonts; these come from
 * fontsource, which publishes static weights.
 */
export async function ogFonts() {
  const dir = join(process.cwd(), 'src', 'assets', 'fonts');
  const [bold, semibold, mono] = await Promise.all([
    readFile(join(dir, 'Montserrat-Bold.ttf')),
    readFile(join(dir, 'Montserrat-SemiBold.ttf')),
    readFile(join(dir, 'IBMPlexMono-Medium.ttf')),
  ]);
  return [
    { name: 'Montserrat', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Montserrat', data: semibold, weight: 600 as const, style: 'normal' as const },
    { name: 'Plex', data: mono, weight: 500 as const, style: 'normal' as const },
  ];
}

/** The unit render, inlined; Satori cannot fetch a relative URL. */
export async function unitImageDataUri(id: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), 'public', 'units', `${id}.png`));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export const groupNum = (v: number): string =>
  v.toLocaleString('en-GB').replace(/,/g, ' ');
