import type { Metadata, Viewport } from 'next';
import '@/styles/styles.css';
import '@/styles/brand-v2.css';
import '@/styles/app-shell.css';

export const metadata: Metadata = {
  title: 'Plateful — Visueel appconcept',
  description: 'Plateful: een warm, slim en persoonlijk appconcept voor het gezinsdiner.',
  icons: { icon: { url: '/assets/plateful-icon.svg', type: 'image/svg+xml' }, apple: '/assets/plateful-app-icon-1024.png' },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FBF8F1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- exacte URL uit het designsystem */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght,SOFT,WONK@9..144,500,30,1;9..144,600,30,1;9..144,700,30,1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
