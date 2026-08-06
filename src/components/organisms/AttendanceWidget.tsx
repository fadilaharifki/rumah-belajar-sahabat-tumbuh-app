import React from 'react';
import { Camera, LogOut, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { useAttendanceStore } from '@/stores/useAttendanceStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUIStore } from '@/stores/useUIStore';
import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';
import { Card } from '../atoms/Card';

export const AttendanceWidget: React.FC = () => {
  const { activeSession, openCamera, endSession, elapsedSeconds } = useAttendanceStore();
  const { activeTeacher } = useAuthStore();
  const { openLogModal } = useUIStore();

  const handleCheckoutClick = () => {
    const checkoutResult = endSession();
    openLogModal(checkoutResult);
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m} mnt ${s} detik`;
  };

  return (
    <Card variant={activeSession ? 'amber' : 'emerald'} className="p-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <Avatar
            src={activeTeacher?.photo_url}
            name={activeTeacher?.name}
            size="xl"
            className="ring-4 ring-white shadow-md"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-emerald-800 shadow-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status Pengajar Siap</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">{activeTeacher?.name}</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Honor per Sesi: <strong>Rp {activeTeacher?.session_rate?.toLocaleString('id-ID')}</strong>
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-3">
          {activeSession ? (
            <div className="w-full sm:w-auto space-y-2 text-center sm:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-xs">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Mendampingi: <strong>{activeSession.student_name}</strong> ({formatTimer(elapsedSeconds)})</span>
              </div>

              <div>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleCheckoutClick}
                  className="w-full sm:w-auto font-bold shadow-lg"
                >
                  <LogOut className="w-5 h-5 mr-1" /> Check-Out & Input Sesi
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-auto text-center sm:text-right space-y-1.5">
              <Button
                variant="primary"
                size="lg"
                onClick={openCamera}
                className="w-full sm:w-auto text-base font-bold shadow-lg"
              >
                <Camera className="w-5 h-5 mr-2 text-amber-300" /> Check-In Presensi Foto Kamera
              </Button>
              <p className="text-[11px] text-emerald-800 font-semibold flex items-center justify-center sm:justify-end gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> Presensi verified waktu nyata
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
