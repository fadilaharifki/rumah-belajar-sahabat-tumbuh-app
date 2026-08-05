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

export const metadata: Metadata = {
  title: {
    default: 'Rumah Belajar Sahabat Tumbuh - Presensi AI & Sistem Pendampingan',
    template: '%s | Rumah Belajar Sahabat Tumbuh'
  },
  description:
    'Sistem Informasi Bimbingan Belajar, Presensi AI Kamera, Jadwal Ngajar, Jurnal Progress Anak & Rekap Penggajian Guru Rumah Belajar Sahabat Tumbuh.',
  keywords: [
    'Rumah Belajar Sahabat Tumbuh',
    'Sahabat Tumbuh',
    'Bimbingan Belajar Anak',
    'Les Privat',
    'Presensi AI Kamera',
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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' }
    ]
  },
  openGraph: {
    title: 'Rumah Belajar Sahabat Tumbuh - Presensi AI & Sistem Pendampingan',
    description:
      'Sistem Informasi Bimbingan Belajar, Presensi AI Kamera, Jadwal Ngajar & Jurnal Progress Anak Rumah Belajar Sahabat Tumbuh.',
    siteName: 'Rumah Belajar Sahabat Tumbuh',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rumah Belajar Sahabat Tumbuh',
    description: 'Sistem Informasi Bimbingan Belajar & Presensi Kamera AI'
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
