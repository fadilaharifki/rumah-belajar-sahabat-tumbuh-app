import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/payroll?month=YYYY-MM - Fetch all payroll records joined with teacher details (Decoupled Query for 100% PostgREST Safety)
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    // 1. Query payrolls table directly
    let query = supabase
      .from('payrolls')
      .select('*')
      .order('period_month', { ascending: false });

    if (month) {
      query = query.eq('period_month', month);
    }

    const { data: payrollData, error } = await query;

    if (error) {
      console.warn('Payrolls query note:', error.message);
      return NextResponse.json({ data: [], error: error.message }, { status: 400 });
    }

    // 2. Fetch all teachers to map teacher names & photos cleanly without relying on schema cache relationships
    const teacherIds = Array.from(new Set((payrollData || []).map((p: any) => p.teacher_id).filter(Boolean)));
    const teacherMap: Record<string, any> = {};

    if (teacherIds.length > 0) {
      const { data: teacherList } = await supabase
        .from('teachers')
        .select('id, name, photo_url, phone, session_rate')
        .in('id', teacherIds);

      if (teacherList) {
        teacherList.forEach((t: any) => {
          teacherMap[t.id] = t;
        });
      }
    }

    const formatted = (payrollData || []).map((p: any) => {
      const t = teacherMap[p.teacher_id] || {};
      return {
        id: p.id,
        teacher_id: p.teacher_id,
        teacher_name: t.name || 'Guru Pengajar',
        teacher_photo: t.photo_url || '',
        period_month: p.period_month,
        total_sessions: p.total_sessions,
        rate_per_session: p.rate_per_session || t.session_rate || 85000,
        total_amount: p.total_amount,
        status: p.status || 'Draft',
        paid_at: p.paid_at || p.created_at
      };
    });

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

// POST /api/payroll - Upsert/Update Payroll status and disburse honorarium for a teacher (Default status: 'Draft')
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacher_id, period_month, total_sessions, rate_per_session, total_amount, status } = body;

    if (!teacher_id || !period_month) {
      return NextResponse.json(
        { success: false, error: 'Guru dan periode bulan wajib diisi!' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured) {
      // 1. Fetch teacher details first
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name, session_rate')
        .eq('id', teacher_id)
        .maybeSingle();

      const rate = Number(rate_per_session) || teacher?.session_rate || 85000;
      const sessions = Number(total_sessions) || 0;
      const amount = Number(total_amount) || (sessions * rate);
      const targetStatus = status || 'Draft';

      // 2. Perform direct table upsert without embedding joins
      const { data, error } = await supabase
        .from('payrolls')
        .upsert([
          {
            teacher_id,
            period_month,
            total_sessions: sessions,
            rate_per_session: rate,
            total_amount: amount,
            status: targetStatus,
            paid_at: targetStatus === 'Lunas' ? new Date().toISOString() : null
          }
        ], { onConflict: 'teacher_id,period_month' })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        message: `Status Payroll bulan ${period_month} untuk ${teacher?.name || 'Guru'} berhasil diperbarui menjadi ${targetStatus}!`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll updated (mock mode)'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
