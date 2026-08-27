import { ImageResponse } from 'next/og';
import { getUnitData } from '@/lib/faf/data';
import { FACTION_COLOR, OG_CONTENT_TYPE, OG_SIZE, groupNum, ogFonts, px } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'FAF Unit Database';

/** The card for the site itself, shown when someone shares the root link. */
export default async function Image() {
  const { units, version } = await getUnitData();
  const fonts = await ogFonts();
  const factions = Object.entries(FACTION_COLOR).filter(([f]) => f !== 'Nomads');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', background: '#090909', color: '#f2f4f5',
          fontFamily: 'Montserrat', padding: '0 144px', position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: px(0), left: px(0), right: px(0), height: px(10), display: 'flex' }}>
          {factions.map(([f, c]) => (
            <div key={f} style={{ flex: 1, background: c, display: 'flex' }} />
          ))}
        </div>

        <div style={{ fontSize: px(26), fontWeight: 700, letterSpacing: px(4), color: '#8b9299' }}>
          FAF UNIT DB
        </div>
        {/* Satori needs an explicit display on any multi-child node, and it does
            not lay out <br>, so the two lines are their own flex children. */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', fontSize: px(84), fontWeight: 700,
            lineHeight: 1.08, marginTop: px(18), letterSpacing: px(-2),
          }}
        >
          <div>Every unit in Forged</div>
          <div>Alliance Forever</div>
        </div>
        <div style={{ fontSize: px(30), color: '#a4abb2', marginTop: px(24), maxWidth: px(900), lineHeight: 1.4 }}>
          Costs, weapons, DPS and efficiency you can actually compare. Generated from the game files
          each patch.
        </div>

        <div style={{ display: 'flex', gap: px(56), marginTop: px(44) }}>
          {([['UNITS', groupNum(units.length)], ['PATCH', version], ['FACTIONS', '5']] as const).map(
            ([label, value]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: px(17), fontWeight: 700, letterSpacing: px(2.4), color: '#767d84' }}>
                  {label}
                </div>
                <div style={{ fontSize: px(44), fontFamily: 'Plex', marginTop: px(8) }}>{value}</div>
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
