import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useAttendanceStore } from '@/stores/useAttendanceStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { CameraWebcamFeed } from '../molecules/CameraWebcamFeed';
import { Student } from '@/hooks/useMasterData';
import { Select } from '../atoms/Select';

export interface FaceVerificationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (data: any) => void;
  onVerificationSuccess?: (data: any) => void;
  studentList?: Student[];
}

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onVerificationSuccess,
  studentList = []
}) => {
  const { isCameraOpen, closeCamera } = useAttendanceStore();
  const { user } = useAuthStore();
  const [selectedStudentId, setSelectedStudentId] = useState(studentList[0]?.id || 'std-1');

  const visible = isOpen !== undefined ? isOpen : isCameraOpen;
  const handleClose = onClose || closeCamera;
  const handleSuccess = onSuccess || onVerificationSuccess;

  if (!visible) return null;

  const handleCaptureResult = (aiResult: { score: number; matchedName: string; photoDataUrl: string }) => {
    const student = studentList.find((s) => s.id === selectedStudentId) || studentList[0];
    if (handleSuccess) {
      handleSuccess({
        teacher_id: user?.id || 'tch-1',
        teacher_name: user?.full_name || 'Siti Nurhaliza, S.Pd.',
        student_id: student?.id || 'std-1',
        student_name: student?.name || 'Ananda Bintang Pratama',
        checkin_photo_url: aiResult.photoDataUrl,
        verified: true,
        score: aiResult.score
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Presensi Foto Kamera</h3>
              <p className="text-xs text-slate-500">Fitur selfie presensi pengajar real-time</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {studentList.length > 0 && (
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
            <label className="block text-xs font-bold text-amber-900 mb-1.5">
              Pilih Siswa yang Ditingkatkan/Didampingi Sesi Ini:
            </label>
            <Select
              options={studentList.map((s) => ({ value: s.id, label: s.name, subLabel: s.grade }))}
              value={selectedStudentId}
              onChange={(val) => setSelectedStudentId(val)}
              placeholder="-- Cari Siswa Bimbingan --"
              isSearchable
              isClearable={false}
            />
          </div>
        )}

        <CameraWebcamFeed
          targetTeacherName={user?.full_name}
          onCapture={handleCaptureResult}
        />
      </div>
    </div>
  );
};
