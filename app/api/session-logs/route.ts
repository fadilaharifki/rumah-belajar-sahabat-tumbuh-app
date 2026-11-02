import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// Helper to get Indonesian day name and current time in Asia/Jakarta (WIB)
function getJakartaDateTime() {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = dtf.formatToParts(now);
  const m: Record<string, string> = {};
  for (const p of parts) {
    m[p.type] = p.value;
  }
  const dateStr = `${m.year}-${m.month}-${m.day}`;
  const timeStr = `${m.hour}:${m.minute}`;

  // Get day of week in Indonesia
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[dateObj.getUTCDay()];

  return { dateStr, timeStr, dayName };
}

// GET /api/session-logs - List session logs
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*, teachers(id, name, supervisor_id), students(id, name, grade), attendance_records(*)')
      .order('session_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

// POST /api/session-logs - Create or update a paired session log (Smart Upsert + Auto-Pairing with Strict Schedule & 23:59 Cutoff Validation)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      attendance_id, 
      teacher_id, 
      student_id, 
      session_number, 
      activities, 
      results_recommendations, 
      session_date,
      is_admin_override
    } = body;

    if (!teacher_id || !student_id || !activities || !results_recommendations) {
      return NextResponse.json(
        { success: false, error: 'Guru, Siswa, Ringkasan Materi, dan Catatan Anak wajib diisi!' },
        { status: 400 }
      );
    }

    const { dateStr: todayWIB, timeStr: nowTimeWIB, dayName: currentDayName } = getJakartaDateTime();
    const sDate = session_date || todayWIB;
    let targetAttId = attendance_id;

    if (isSupabaseConfigured) {
      // 0. Cek apakah ini sesi yang sedang direvisi (NeedRevision atau Invalid dengan catatan dari supervisor)
      let isRevisionSession = false;
      if (targetAttId) {
        const { data: currentAtt } = await supabase
          .from('attendance_records')
          .select('id, status, approval_notes')
          .eq('id', targetAttId)
          .maybeSingle();

        if (currentAtt && (currentAtt.status === 'NeedRevision' || (currentAtt.status === 'Invalid' && currentAtt.approval_notes))) {
          isRevisionSession = true;
        }
      }

      // 1. Validasi Batas Waktu & Hari Jadwal Belajar Siswa (Kecuali bypass oleh Pemilik/Admin atau sedang revisi laporan)
      if (!is_admin_override && !isRevisionSession) {
        // A. Cek apakah tanggal di masa depan
        if (sDate > todayWIB) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Sesi belajar belum berlangsung! Anda tidak dapat mengisi evaluasi untuk tanggal di masa depan (${sDate}).` 
            },
            { status: 400 }
          );
        }

        // B. Cek batas jam 12 malam (lewat hari sDate < todayWIB)
        if (sDate < todayWIB) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Batas waktu pengisian evaluasi untuk sesi tanggal ${sDate} telah berakhir (maksimal pukul 23:59 WIB pada hari jadwal belajar). Form terkunci.` 
            },
            { status: 400 }
          );
        }

        // C. Cek apakah hari ini siswa memang ada jadwal belajar aktif
        const { data: activeSchedules } = await supabase
          .from('schedules')
          .select('id, day_of_week, start_time, end_time, status')
          .eq('student_id', student_id)
          .eq('status', 'Aktif');

        const todaySchedule = (activeSchedules || []).find(
          (sc: any) => sc.day_of_week === currentDayName
        );

        if (!todaySchedule && (activeSchedules || []).length > 0) {
          const availableDays = activeSchedules?.map((sc: any) => sc.day_of_week).join(', ');
          return NextResponse.json(
            {
              success: false,
              error: `Siswa ini tidak memiliki jadwal belajar pada hari ini (${currentDayName}). Jadwal siswa: ${availableDays}. Laporan evaluasi hanya bisa disubmit pada hari jadwal siswa.`
            },
            { status: 400 }
          );
        }

        // D. Cek jam masuk (jangan submit sebelum jam sesi dimulai)
        if (todaySchedule?.start_time && nowTimeWIB < todaySchedule.start_time.substring(0, 5)) {
          return NextResponse.json(
            {
              success: false,
              error: `Sesi belajar belum dimulai (Jadwal hari ${currentDayName}: ${todaySchedule.start_time.substring(0, 5)} - ${todaySchedule.end_time?.substring(0, 5) || ''} WIB). Laporan evaluasi baru bisa disubmit saat jam belajar dimulai.`
            },
            { status: 400 }
          );
        }
      }

      // 2. Ambil data atasan/supervisor guru yang bersangkutan
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('supervisor_id')
        .eq('id', teacher_id)
        .maybeSingle();

      const approverId = teacherData?.supervisor_id || null;

      // 3. Cari attendance_record jika belum terpasang
      if (!targetAttId) {
        const { data: matchedAtt } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('teacher_id', teacher_id)
          .eq('student_id', student_id)
          .eq('date', sDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (matchedAtt) {
          targetAttId = matchedAtt.id;
        }
      }

      // 4. Cek apakah session log sudah ada sebelumnya (untuk di-update)
      let existingLog: any = null;

      if (targetAttId) {
        const { data: logByAtt } = await supabase
          .from('session_logs')
          .select('id')
          .eq('attendance_id', targetAttId)
          .maybeSingle();
        existingLog = logByAtt;
      }

      if (!existingLog) {
        const { data: logByTeacherStudentDate } = await supabase
          .from('session_logs')
          .select('id')
          .eq('teacher_id', teacher_id)
          .eq('student_id', student_id)
          .eq('session_date', sDate)
          .maybeSingle();
        existingLog = logByTeacherStudentDate;
      }

      const payload = {
        attendance_id: targetAttId || null,
        teacher_id,
        student_id,
        session_number: session_number ? Number(session_number) : 1,
        activities,
        results_recommendations,
        session_date: sDate,
        approval_status: 'PendingApproval',
        approver_id: approverId,
        verified: false
      };

      let logData: any = null;

      if (existingLog) {
        const { data: updated, error: updateErr } = await supabase
          .from('session_logs')
          .update(payload)
          .eq('id', existingLog.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        logData = updated;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('session_logs')
          .insert([payload])
          .select()
          .single();

        if (insertErr) throw insertErr;
        logData = inserted;
      }

      // 5. Update status attendance_records ke 'PendingApproval'
      if (targetAttId) {
        await supabase
          .from('attendance_records')
          .update({ 
            status: 'PendingApproval',
            approved_by: approverId
          })
          .eq('id', targetAttId);
      }

      return NextResponse.json({
        success: true,
        data: logData,
        message: 'Laporan evaluasi belajar siswa berhasil disimpan! Status sesi kini Menunggu Approval dari Atasan.'
      });
    }

    return NextResponse.json({ success: true, message: 'Laporan disubmit (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
