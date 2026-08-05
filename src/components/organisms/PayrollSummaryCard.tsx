import React from 'react';
import { Calculator, Printer, Wallet } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { formatRupiah } from '@/utils/formatters';
import { Teacher } from '@/hooks/useMasterData';
import { SessionLog } from '@/hooks/useSessions';

export interface PayrollSummaryCardProps {
  teachers?: Teacher[];
  logs?: SessionLog[];
}

export const PayrollSummaryCard: React.FC<PayrollSummaryCardProps> = ({ teachers = [], logs = [] }) => {
  const payrollData = teachers.map((teacher) => {
    const teacherLogs = logs.filter((l) => l.teacher_id === teacher.id);
    const totalSessions = teacherLogs.length;
    const totalFee = teacherLogs.reduce((acc, curr) => acc + (curr.session_fee || teacher.session_rate), 0);
    const totalHours = Math.round(totalSessions * 1.5);

    return {
      ...teacher,
      totalSessions,
      totalHours,
      totalFee
    };
  });

  const grandTotalPayroll = payrollData.reduce((acc, curr) => acc + curr.totalFee, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-700">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              Rekapitulasi Honorarium Guru / Pengajar
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-0.5">
              Bulan Agustus / 2026
            </h2>
            <p className="text-xs text-emerald-200 mt-1 font-medium">
              Dihitung otomatis berdasarkan total presensi check-in/out & lembar sesi terverifikasi.
            </p>
          </div>
        </div>

        <div className="text-right bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs w-full md:w-auto">
          <p className="text-xs font-medium text-emerald-200">Total Pengeluaran Honor Guru:</p>
          <h3 className="text-3xl font-black text-amber-300 tracking-tight mt-0.5">
            {formatRupiah(grandTotalPayroll)}
          </h3>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <span>Rincian Honor Pengajar Per Sesi / Jam</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1 text-emerald-700" /> Cetak Slip Gaji All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-4">Pengajar</th>
                <th className="px-5 py-4">Tarif per Sesi</th>
                <th className="px-5 py-4">Total Sesi Ngajar</th>
                <th className="px-5 py-4">Est. Jam Ngajar</th>
                <th className="px-5 py-4">Total Honorarium</th>
                <th className="px-5 py-4 text-center">Status Gaji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {payrollData.map((item) => (
                <tr key={item.id} className="hover:bg-emerald-50/20">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={item.photo_url} name={item.name} size="md" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-500">{item.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                    {formatRupiah(item.session_rate)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="emerald" size="md">
                      {item.totalSessions} Sesi Selesai
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-600">
                    {item.totalHours} Jam
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-800 text-sm font-mono">
                    {formatRupiah(item.totalFee)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Button variant="secondary" size="sm" onClick={() => alert(`Slip gaji untuk ${item.name} siap dicetak!`)}>
                      <Printer className="w-3.5 h-3.5 mr-1" /> Slip Gaji
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
