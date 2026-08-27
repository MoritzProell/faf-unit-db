import { ImageResponse } from 'next/og';
import { getUnitData } from '@/lib/faf/data';
import { fmtRatio } from '@/lib/faf/decorate';
import { FACTION_COLOR, OG_CONTENT_TYPE, OG_SIZE, groupNum, ogFonts, unitImageDataUri } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Unit stats';

/**
 * The social card. FAF links get shared in Discord and on Reddit, where the card
 * is the whole first impression, so it carries the render and the four figures
 * people actually ask about rather than a bare title.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { bySlug, version } = await getUnitData();
  const unit = bySlug.get(slug);
  if (!unit) return new Response('Not found', { status: 404 });

  const accent = FACTION_COLOR[unit.faction] ?? '#2d78b2';
  const [fonts, render] = await Promise.all([ogFonts(), unitImageDataUri(unit.Id)]);

  const stats: Array<[string, string]> = [
    ['MASS', groupNum(unit.mass)],
    ['HEALTH', groupNum(unit.health)],
    ['HP / MASS', fmtRatio(unit.hpPerMass)],
    unit.directDps ? ['DPS', fmtRatio(unit.directDps, 1)] : ['ENERGY', groupNum(unit.energy)],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#090909', color: '#f2f4f5', fontFamily: 'Montserrat',
          borderTop: `10px solid ${accent}`, padding: '52px 60px', position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 340,
            background: `linear-gradient(160deg, ${accent}2e, ${accent}00 62%)`,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>FAF UNIT DB</div>
          <div style={{ width: 1, height: 20, background: '#3a4046', display: 'flex' }} />
          <div style={{ fontSize: 19, fontFamily: 'Plex', color: '#8b9299' }}>{`PATCH ${version}`}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 46 }}>
          {render && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 190, height: 190, borderRadius: 16,
                background: `${accent}1f`, border: `2px solid ${accent}66`,
              }}
            >
              <img src={render} width={162} height={162} alt="" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 800 }}>
            <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
              {unit.name}
            </div>
            <div style={{ fontSize: 30, color: '#a4abb2', marginTop: 12 }}>{unit.role}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Badge color={accent} filled>{unit.faction.toUpperCase()}</Badge>
              <Badge color="#5a6167">{unit.techLabel === 'T4' ? 'T4 EXPERIMENTAL' : unit.techLabel}</Badge>
              <Badge color="#5a6167">{unit.Id}</Badge>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', gap: 56 }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2.4, color: '#767d84' }}>
                {label}
              </div>
              <div style={{ fontSize: 46, fontFamily: 'Plex', marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

function Badge({ children, color, filled }: { children: string; color: string; filled?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', height: 38, padding: '0 14px', borderRadius: 8,
        border: `2px solid ${filled ? color : '#3a4046'}`,
        background: filled ? `${color}26` : 'transparent',
        color: filled ? color : '#a4abb2',
        fontSize: 19, fontWeight: 600, letterSpacing: 1,
      }}
    >
      {children}
    </div>
  );
}
