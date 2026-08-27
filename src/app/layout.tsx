import type { Metadata } from 'next';
import { Montserrat, Nunito, IBM_Plex_Mono } from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const title = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-title',
  display: 'swap',
});
const body = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const DESCRIPTION =
  'Every Supreme Commander: Forged Alliance Forever unit, with costs, weapons, DPS and efficiency you can actually compare. Generated from the FAF game files each patch.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // The default carries the words people actually search for; per-page titles
    // put the unit name first, where it counts.
    default: 'FAF Unit Database · Supreme Commander: Forged Alliance Forever unit stats',
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Supreme Commander', 'Forged Alliance Forever', 'FAF', 'supcom',
    'unit database', 'unit stats', 'DPS', 'balance', 'FAF units',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: 'FAF Unit Database',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: 'FAF Unit Database', description: DESCRIPTION },
  robots: { index: true, follow: true },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to the token Search
  // Console gives you; the HTML-tag method then needs no code change.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${title.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=localStorage.getItem('faf.density');if(d)document.documentElement.dataset.density=d}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
