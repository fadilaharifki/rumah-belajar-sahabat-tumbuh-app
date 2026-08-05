import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/session-logs - List session logs
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { data, error } = await supabase
      .from('session_logs')
      .select('*, teachers(id, name), students(id, name, grade), attendance_records(*)')
      .order('session_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

// POST /api/session-logs - Create or update a paired session log (Smart Upsert + Auto-Pairing by teacher_id, student_id, & date)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendance_id, teacher_id, student_id, session_number, activities, results_recommendations, session_date } = body;

    if (!teacher_id || !student_id || !activities || !results_recommendations) {
      return NextResponse.json(
        { success: false, error: 'Guru, Siswa, Ringkasan Materi, dan Catatan Anak wajib diisi!' },
        { status: 400 }
      );
    }

    const sDate = session_date || new Date().toISOString().slice(0, 10);
    let targetAttId = attendance_id;

    if (isSupabaseConfigured) {
      // 1. If attendance_id is not provided, look up matching attendance_record for this specific teacher_id, student_id, & date
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

      // 2. Check if a session log already exists for targetAttId OR (teacher_id + student_id + session_date)
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
        verified: true
      };

      let logData: any = null;

      if (existingLog) {
        // Update existing log belonging to this teacher & student
        const { data: updated, error: updateErr } = await supabase
          .from('session_logs')
          .update(payload)
          .eq('id', existingLog.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        logData = updated;
      } else {
        // Insert new log for this teacher & student
        const { data: inserted, error: insertErr } = await supabase
          .from('session_logs')
          .insert([payload])
          .select()
          .single();

        if (insertErr) throw insertErr;
        logData = inserted;
      }

      // 3. Update paired attendance_records status to 'Valid' if matched
      if (targetAttId) {
        await supabase
          .from('attendance_records')
          .update({ status: 'Valid' })
          .eq('id', targetAttId);
      }

      return NextResponse.json({
        success: true,
        data: logData,
        message: 'Laporan belajar siswa berhasil tersimpan! Status sesi kini Terverifikasi & Valid.'
      });
    }

    return NextResponse.json({ success: true, message: 'Laporan disubmit (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
