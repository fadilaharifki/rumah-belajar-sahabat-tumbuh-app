import React, { useState } from 'react';
import { FileText, Save, X, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { Button } from '../atoms/Button';
import { Label } from '../atoms/Label';
import { Student } from '@/hooks/useMasterData';
import { SessionLog } from '@/hooks/useSessions';
import { RichTextEditor } from '../molecules/RichTextEditor';

export interface SessionLogModalProps {
  onSubmitLog: (log: SessionLog) => void;
  studentList?: Student[];
}

export const SessionLogModal: React.FC<SessionLogModalProps> = ({ onSubmitLog }) => {
  const { isLogModalOpen, closeLogModal, pendingCheckoutData } = useUIStore();
  const [activities, setActivities] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isLogModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activities.trim() || !recommendations.trim()) {
      alert('Mohon isi Kegiatan dan Hasil & Rekomendasi.');
      return;
    }

    const newLog: SessionLog = {
      id: `log-${Date.now()}`,
      session_date: new Date().toISOString().split('T')[0],
      start_time: pendingCheckoutData?.check_in_time
        ? new Date(pendingCheckoutData.check_in_time).toTimeString().substring(0, 5)
        : '14:00',
      end_time: new Date().toTimeString().substring(0, 5),
      teacher_id: pendingCheckoutData?.teacher_id || 'tch-1',
      teacher_name: pendingCheckoutData?.teacher_name || 'Siti Nurhaliza, S.Pd.',
      student_id: pendingCheckoutData?.student_id || 'std-1',
      student_name: pendingCheckoutData?.student_name || 'Ananda Bintang Pratama',
      activities,
      results_recommendations: recommendations,
      session_fee: 85000,
      verified: true
    };

    setIsSaved(true);
    setTimeout(() => {
      onSubmitLog(newLog);
      setIsSaved(false);
      setActivities('');
      setRecommendations('');
      closeLogModal();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Form Catatan Sesi Pendampingan</h3>
              <p className="text-xs text-slate-500 font-medium">Sesuai Format Lembar Fisik Rumah Belajar</p>
            </div>
          </div>
          <button onClick={closeLogModal} className="p-1.5 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs font-semibold text-emerald-900">
          <div>
            <span>Siswa: <strong>{pendingCheckoutData?.student_name || 'Ananda Bintang Pratama'}</strong></span>
          </div>
          <div>
            <span>Durasi: <strong>{pendingCheckoutData?.duration_minutes || 45} Menit</strong></span>
          </div>
        </div>

        {isSaved ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-emerald-700">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 animate-bounce" />
            <h4 className="text-lg font-bold">Catatan Sesi Berhasil Disimpan!</h4>
            <p className="text-xs text-slate-500">Data telah masuk ke Lembar Absensi & Rekap Penggajian Guru.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Kegiatan (Materi & Aktivitas Belajar):</Label>
              <RichTextEditor
                value={activities}
                onChange={setActivities}
                placeholder="Contoh: Latihan soal pecahan senilai, pembagian bersusun sederhana, dan game tebak matematika..."
                minHeight="100px"
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Hasil & Rekomendasi (Evaluasi Belajar Siswa):</Label>
              <RichTextEditor
                value={recommendations}
                onChange={setRecommendations}
                placeholder="Contoh: Bintang sudah memahami konsep pecahan dengan baik (skor 85). Rekomendasi: Latihan rutin perkalian 7 dan 8 di rumah..."
                minHeight="100px"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={closeLogModal}>
                Batal
              </Button>
              <Button variant="primary" type="submit">
                <Save className="w-4 h-4 mr-1 text-amber-300" /> Simpan Lembar Sesi
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
