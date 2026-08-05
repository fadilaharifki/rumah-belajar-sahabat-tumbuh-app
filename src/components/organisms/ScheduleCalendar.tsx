import React from 'react';
import { Calendar, MapPin, User, GraduationCap, Plus } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Teacher, Student } from '@/hooks/useMasterData';

export interface ScheduleCalendarProps {
  schedules?: any[];
  teachers?: Teacher[];
  students?: Student[];
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ schedules = [], teachers = [], students = [] }) => {
  const days = [
    { id: 1, name: 'Senin' },
    { id: 2, name: 'Selasa' },
    { id: 3, name: 'Rabu' },
    { id: 4, name: 'Kamis' },
    { id: 5, name: 'Jumat' },
    { id: 6, name: 'Sabtu' },
    { id: 0, name: 'Minggu' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Jadwal Bimbingan Belajar</h2>
          <p className="text-xs text-slate-500 font-medium">Jadwal sesi ngajar pengajar & pendampingan siswa</p>
        </div>
        <Button variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1 text-amber-300" /> Tambah Jadwal Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day) => {
          const daySchedules = schedules.filter((s) => s.day_of_week === day.id);
          return (
            <Card key={day.id} className="p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{day.name}</span>
                </div>
                <Badge variant="emerald" size="sm">
                  {daySchedules.length} Sesi
                </Badge>
              </div>

              <div className="space-y-2.5">
                {daySchedules.length > 0 ? (
                  daySchedules.map((sch) => {
                    const teacher = teachers.find((t) => t.id === sch.teacher_id);
                    const student = students.find((st) => st.id === sch.student_id);

                    return (
                      <div
                        key={sch.id}
                        className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5 hover:shadow-xs transition"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="text-emerald-900">{sch.subject}</span>
                          <span className="text-[11px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                            {sch.start_time} - {sch.end_time}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Pengajar: {teacher?.name || 'Siti Nurhaliza'}</span>
                        </div>

                        <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Siswa: <strong>{student?.name || 'Ananda Bintang'}</strong></span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{sch.room}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    Tidak ada jadwal ngajar di hari ini.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
