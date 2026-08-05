import React from 'react';
import { formatDateIndonesian } from '@/utils/formatters';
import { SessionLog } from '@/hooks/useSessions';

export interface PrintableAttendanceSheetProps {
  logs?: SessionLog[];
}

export const PrintableAttendanceSheet: React.FC<PrintableAttendanceSheetProps> = ({ logs = [] }) => {
  return (
    <div className="hidden print:block p-8 bg-white text-black font-serif space-y-6">
      <div className="text-center space-y-1 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          LEMBAR ABSENSI & CATATAN SESI PENDAMPINGAN INTENSIF
        </h1>
        <h2 className="text-base font-semibold">
          Rumah Belajar Sahabat Tumbuh
        </h2>
        <p className="text-sm pt-2">
          Bulan: <span className="underline font-bold">Agustus</span> / 2026
        </p>
      </div>

      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-slate-100 font-bold border-b border-black text-center">
            <th className="border border-black p-2.5 w-1/6">Tanggal & Jam</th>
            <th className="border border-black p-2.5 w-1/6">Pengajar</th>
            <th className="border border-black p-2.5 w-1/6">Siswa</th>
            <th className="border border-black p-2.5 w-1/4">Kegiatan</th>
            <th className="border border-black p-2.5 w-1/4">Hasil & Rekomendasi</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((item, idx) => (
            <tr key={item.id || idx} className="border-b border-black align-top">
              <td className="border border-black p-2.5 text-center">
                <div className="font-bold">{formatDateIndonesian(item.session_date)}</div>
                <div className="text-[11px]">{item.start_time} - {item.end_time} WIB</div>
              </td>
              <td className="border border-black p-2.5 font-bold">
                {item.teacher_name}
              </td>
              <td className="border border-black p-2.5 font-bold text-center">
                {item.student_name}
              </td>
              <td className="border border-black p-2.5 leading-snug">
                {item.activities}
              </td>
              <td className="border border-black p-2.5 leading-snug">
                {item.results_recommendations}
              </td>
            </tr>
          ))}

          {Array.from({ length: Math.max(0, 8 - logs.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="border-b border-black h-16">
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
              <td className="border border-black p-2"></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-8 flex justify-between text-xs px-6">
        <div className="text-center space-y-12">
          <p>Pengajar Pendamping,</p>
          <p className="font-bold underline">( _______________________ )</p>
        </div>
        <div className="text-center space-y-12">
          <p>Pemilik / Pengelola Rumah Belajar,</p>
          <p className="font-bold underline">( Ibu Nurul - Sahabat Tumbuh )</p>
        </div>
      </div>
    </div>
  );
};
