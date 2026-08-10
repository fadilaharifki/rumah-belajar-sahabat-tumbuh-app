import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { ClientProviders } from '@/components/providers/ClientProviders';
import '@/app/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://rumah-belajar-sahabat-tumbuh.vercel.app');

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Rumah Belajar Sahabat Tumbuh - Sistem Operasional & Pendampingan Belajar',
    template: '%s | Rumah Belajar Sahabat Tumbuh'
  },
  description:
    'Sistem Informasi Bimbingan Belajar, Presensi Kamera, Jadwal Ngajar, Jurnal Progress Anak & Rekap Penggajian Guru Rumah Belajar Sahabat Tumbuh.',
  keywords: [
    'Rumah Belajar Sahabat Tumbuh',
    'Sahabat Tumbuh',
    'Bimbingan Belajar Anak',
    'Les Privat',
    'Presensi Kamera',
    'Jadwal Ngajar',
    'Catatan Progress Siswa',
    'Sistem Manajemen Les'
  ],
  authors: [{ name: 'Rumah Belajar Sahabat Tumbuh' }],
  creator: 'Rumah Belajar Sahabat Tumbuh',
  publisher: 'Rumah Belajar Sahabat Tumbuh',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Sahabat Tumbuh',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png' },
      { url: '/apple-icon.svg', type: 'image/svg+xml' }
    ]
  },
  openGraph: {
    title: 'Rumah Belajar Sahabat Tumbuh - Sistem Operasional & Pendampingan Belajar',
    description:
      'Sistem Informasi Bimbingan Belajar, Presensi Kamera, Jadwal Ngajar & Jurnal Progress Anak Rumah Belajar Sahabat Tumbuh.',
    siteName: 'Rumah Belajar Sahabat Tumbuh',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Rumah Belajar Sahabat Tumbuh',
      },
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Rumah Belajar Sahabat Tumbuh',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rumah Belajar Sahabat Tumbuh',
    description: 'Sistem Informasi Bimbingan Belajar & Presensi Kamera',
    images: ['/opengraph-image']
  },
  robots: {
    index: true,
    follow: true,
  }
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={poppins.variable} suppressHydrationWarning>
      <body className={`${poppins.className} font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900`} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
