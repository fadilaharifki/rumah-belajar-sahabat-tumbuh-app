import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rumah Belajar Sahabat Tumbuh';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: '60px 40px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Decorative background shape */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
          }}
        />

        {/* Brand Pill Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            padding: '10px 24px',
            borderRadius: '50px',
            border: '1.5px solid rgba(251, 191, 36, 0.6)',
            marginBottom: '28px',
          }}
        >
          <span style={{ fontSize: '28px' }}>🌱</span>
          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#FDE68A', letterSpacing: '1px' }}>
            RUMAH BELAJAR SAHABAT TUMBUH
          </span>
        </div>

        {/* Main Title */}
        <div
          style={{
            fontSize: '52px',
            fontWeight: 'bold',
            lineHeight: 1.25,
            textAlign: 'center',
            maxWidth: '1000px',
            marginBottom: '20px',
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          Sistem Bimbingan & Pendampingan Belajar Anak
        </div>

        {/* Subtitle / Features */}
        <div
          style={{
            fontSize: '22px',
            color: '#A7F3D0',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.5,
          }}
        >
          Presensi Kamera • Jadwal Bimbingan • Catatan Progress Siswa • Rekap Honor Pengajar
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
