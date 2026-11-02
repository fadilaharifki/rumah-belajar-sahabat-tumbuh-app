import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/approval - Fetch session reports for approval scoped by supervisor hierarchy
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({
      success: true,
      data: [],
      counts: { pending: 0, valid: 0, invalid: 0, total: 0 },
      source: 'mock'
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'all'; // 'PendingApproval' | 'Valid' | 'Invalid' | 'all'
    const month = searchParams.get('month'); // e.g. '2026-11'
    const teacherIdFilter = searchParams.get('teacher_id');
    const supervisorIdFilter = searchParams.get('supervisor_id');
    const currentUserId = searchParams.get('user_id');
    const userRole = searchParams.get('role'); // 'admin' | 'teacher' | 'staff'

    // 1. Resolve user profile and multi-identity mappings (auth_user_id vs public.users.id)
    const isUuid = (val: any) =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    let userRecord: any = null;
    if (currentUserId) {
      if (currentUserId.includes('@')) {
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id, auth_user_id, email, full_name, category, role_id')
          .eq('email', currentUserId)
          .maybeSingle();
        userRecord = matchedUser;
      } else if (isUuid(currentUserId)) {
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id, auth_user_id, email, full_name, category, role_id')
          .or(`id.eq.${currentUserId},auth_user_id.eq.${currentUserId}`)
          .maybeSingle();
        userRecord = matchedUser;
      }
    }

    const isOwner =
      userRole === 'admin' ||
      userRole === 'Pemilik' ||
      userRecord?.category === 'Pemilik' ||
      userRecord?.role_id === '11111111-1111-1111-1111-000000000001';

    // 2. Fetch all teachers to resolve supervisor hierarchies and user mappings
    const { data: allTeachers } = await supabase
      .from('teachers')
      .select('id, user_id, name, email, photo_url, phone, session_rate, supervisor_id');

    const teachersList = allTeachers || [];

    // Collect all unique IDs that can identify the current user across tables
    const userIdentifierSet = new Set<string>();
    if (currentUserId) userIdentifierSet.add(currentUserId);
    if (userRecord?.id) userIdentifierSet.add(userRecord.id);
    if (userRecord?.auth_user_id) userIdentifierSet.add(userRecord.auth_user_id);

    // Find current user's own teacher record (if any)
    const ownTeacher = teachersList.find(
      (t) =>
        (t.user_id && userIdentifierSet.has(t.user_id)) ||
        userIdentifierSet.has(t.id) ||
        (userRecord?.email && t.email && t.email.toLowerCase() === userRecord.email.toLowerCase())
    );
    const ownTeacherId = ownTeacher?.id;
    if (ownTeacherId) userIdentifierSet.add(ownTeacherId);
    if (ownTeacher?.user_id) userIdentifierSet.add(ownTeacher.user_id);

    // 3. Determine which teachers' reports this user is permitted to review
    let allowedTeacherIds: string[] = [];

    if (isOwner) {
      // Pemilik can view all teachers (optionally filtered by supervisor or teacher)
      let filtered = teachersList;
      if (supervisorIdFilter && supervisorIdFilter !== 'all') {
        filtered = filtered.filter((t) => t.supervisor_id === supervisorIdFilter);
      }
      if (teacherIdFilter && teacherIdFilter !== 'all') {
        filtered = filtered.filter((t) => t.id === teacherIdFilter);
      }
      allowedTeacherIds = filtered.map((t) => t.id);
    } else {
      // Guru Senior / Koordinator: teachers who have this user as supervisor_id
      // Exclude their own teacher_id (Anti-Self Approval)
      const supervisees = teachersList.filter((t) => {
        const isSupervised = Boolean(t.supervisor_id && userIdentifierSet.has(t.supervisor_id));
        const isNotSelf = !userIdentifierSet.has(t.id) && !(t.user_id && userIdentifierSet.has(t.user_id));
        return isSupervised && isNotSelf;
      });

      if (teacherIdFilter && teacherIdFilter !== 'all') {
        allowedTeacherIds = supervisees.filter((t) => t.id === teacherIdFilter).map((t) => t.id);
      } else {
        allowedTeacherIds = supervisees.map((t) => t.id);
      }
    }

    // If supervisor has no supervisees assigned, return empty list gracefully
    if (!isOwner && allowedTeacherIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        counts: { pending: 0, valid: 0, invalid: 0, total: 0 },
        superviseeCount: 0,
        message: 'Belum ada guru yang ditugaskan di bawah bimbingan Anda.'
      });
    }

    // 4. Query attendance records for allowed teachers
    let attQuery = supabase
      .from('attendance_records')
      .select('*, students(id, name, grade, avatar_url)')
      .in('teacher_id', allowedTeacherIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Calculate valid month date boundaries without out-of-range errors (e.g. Nov 31 -> Nov 30)
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (month && month !== 'all') {
      const parts = month.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        const lastDay = new Date(y, m, 0).getDate();
        startDate = `${month}-01`;
        endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    if (startDate && endDate) {
      attQuery = attQuery.gte('date', startDate).lte('date', endDate);
    }

    const { data: attendanceData, error: attError } = await attQuery;

    if (attError) {
      console.warn('Approval attendance query error:', attError.message);
      return NextResponse.json({ success: false, error: attError.message }, { status: 400 });
    }

    const attendanceRecords = attendanceData || [];
    const attIds = attendanceRecords.map((a: any) => a.id);

    // 5. Query session logs for these attendance records AND for allowed teachers
    let sessionLogs: any[] = [];
    if (attIds.length > 0) {
      const { data: logData } = await supabase
        .from('session_logs')
        .select('*')
        .in('attendance_id', attIds);
      sessionLogs = logData || [];
    }

    // Also fetch standalone session logs that might not have matching attendance records
    let standaloneLogQuery = supabase
      .from('session_logs')
      .select('*, students(id, name, grade, avatar_url)')
      .in('teacher_id', allowedTeacherIds);
    if (startDate && endDate) {
      standaloneLogQuery = standaloneLogQuery.gte('session_date', startDate).lte('session_date', endDate);
    }
    const { data: standaloneData } = await standaloneLogQuery;
    const allSessionLogs = [...sessionLogs, ...(standaloneData || [])];

    const logMap = new Map<string, any>();
    allSessionLogs.forEach((l: any) => {
      if (l.attendance_id) logMap.set(l.attendance_id, l);
      if (l.id) logMap.set(l.id, l);
    });

    // 6. Query approver users to show approver names
    const approverIds = Array.from(
      new Set(attendanceRecords.map((a: any) => a.approved_by).filter(Boolean))
    );
    const supervisorUserIds = Array.from(
      new Set(teachersList.map((t) => t.supervisor_id).filter(Boolean))
    );
    const userIdsToFetch = Array.from(new Set([...approverIds, ...supervisorUserIds]));

    let usersMap = new Map<string, string>();
    if (userIdsToFetch.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, auth_user_id, full_name')
        .in('id', userIdsToFetch);
      (usersData || []).forEach((u: any) => {
        if (u.id) usersMap.set(u.id, u.full_name);
        if (u.auth_user_id) usersMap.set(u.auth_user_id, u.full_name);
      });
    }

    const teacherMap = new Map(teachersList.map((t) => [t.id, t]));

    // 7. Format and merge approval data
    const allItems = attendanceRecords
      // Include any session that has a submitted session_log OR is not pure checkin
      .filter((att: any) => logMap.has(att.id) || att.status !== 'CheckIn')
      .map((att: any) => {
        const teacher = teacherMap.get(att.teacher_id);
        const log = logMap.get(att.id);
        const supervisorName = teacher?.supervisor_id ? (usersMap.get(teacher.supervisor_id) || 'Guru Senior') : 'Pemilik Utama';
        const approverName = att.approved_by ? (usersMap.get(att.approved_by) || 'Atasan') : null;

        return {
          id: att.id,
          date: att.date,
          check_in: att.check_in,
          check_out: att.check_out,
          duration_minutes: att.duration_minutes,
          status: att.status || (log ? 'PendingApproval' : 'CheckIn'),
          approved_by: att.approved_by || null,
          approver_name: approverName,
          approved_at: att.approved_at || null,
          approval_notes: att.approval_notes || log?.rejection_reason || null,
          created_at: att.created_at,
          updated_at: att.updated_at,

          teacher: {
            id: teacher?.id || att.teacher_id,
            name: teacher?.name || 'Guru Pengajar',
            photo_url: teacher?.photo_url || '',
            phone: teacher?.phone || '',
            session_rate: teacher?.session_rate || 20000,
            supervisor_id: teacher?.supervisor_id || null,
            supervisor_name: supervisorName
          },

          student: {
            id: att.students?.id || att.student_id,
            name: att.students?.name || 'Siswa Bimbingan',
            grade: att.students?.grade || 'SD',
            avatar_url: att.students?.avatar_url || ''
          },

          session_log: log ? {
            id: log.id,
            session_number: log.session_number || 1,
            activities: log.activities || log.materi_ajar || '',
            notes: log.notes || log.catatan_progress || '',
            photo_url: log.photo_url || '',
            approval_status: log.approval_status || att.status,
            rejection_reason: log.rejection_reason || att.approval_notes || '',
            created_at: log.created_at,
            updated_at: log.updated_at
          } : null
        };
      });

    // Also include any standalone session logs for allowed teachers not yet in attendanceRecords
    const attIdSet = new Set(attIds);
    const standaloneItems = (standaloneData || [])
      .filter((l: any) => (!l.attendance_id || !attIdSet.has(l.attendance_id)) && !attIdSet.has(l.id))
      .map((log: any) => {
        const teacher = teacherMap.get(log.teacher_id);
        const supervisorName = teacher?.supervisor_id ? (usersMap.get(teacher.supervisor_id) || 'Guru Senior') : 'Pemilik Utama';
        const approverName = log.approver_id ? (usersMap.get(log.approver_id) || 'Atasan') : null;

        return {
          id: log.attendance_id || log.id,
          date: log.session_date,
          check_in: log.start_time || '14:00',
          check_out: log.end_time || '15:00',
          duration_minutes: 60,
          status: log.approval_status || 'PendingApproval',
          approved_by: log.approver_id || null,
          approver_name: approverName,
          approved_at: log.approved_at || null,
          approval_notes: log.rejection_reason || null,
          created_at: log.created_at,
          updated_at: log.updated_at,

          teacher: {
            id: teacher?.id || log.teacher_id,
            name: teacher?.name || 'Guru Pengajar',
            photo_url: teacher?.photo_url || '',
            phone: teacher?.phone || '',
            session_rate: teacher?.session_rate || log.session_fee || 20000,
            supervisor_id: teacher?.supervisor_id || null,
            supervisor_name: supervisorName
          },

          student: {
            id: log.students?.id || log.student_id,
            name: log.students?.name || 'Siswa Bimbingan',
            grade: log.students?.grade || 'SD',
            avatar_url: log.students?.avatar_url || ''
          },

          session_log: {
            id: log.id,
            session_number: log.session_number || 1,
            activities: log.activities || log.materi_ajar || '',
            notes: log.notes || log.catatan_progress || '',
            photo_url: log.photo_url || '',
            approval_status: log.approval_status || 'PendingApproval',
            rejection_reason: log.rejection_reason || '',
            created_at: log.created_at,
            updated_at: log.updated_at
          }
        };
      });

    const combinedItems = [...allItems, ...standaloneItems];

    // 8. Calculate status statistics
    const pendingCount = combinedItems.filter((i) => i.status === 'PendingApproval').length;
    const revisionCount = combinedItems.filter((i) => i.status === 'NeedRevision').length;
    const validCount = combinedItems.filter((i) => i.status === 'Valid' || i.status === 'ManualVerified').length;
    const invalidCount = combinedItems.filter((i) => i.status === 'Invalid').length;
    const totalCount = combinedItems.length;

    // 9. Filter by statusParam
    let filteredResult = combinedItems;
    if (statusParam === 'pending' || statusParam === 'PendingApproval') {
      filteredResult = combinedItems.filter((i) => i.status === 'PendingApproval');
    } else if (statusParam === 'revision' || statusParam === 'NeedRevision') {
      filteredResult = combinedItems.filter((i) => i.status === 'NeedRevision');
    } else if (statusParam === 'valid' || statusParam === 'Valid') {
      filteredResult = combinedItems.filter((i) => i.status === 'Valid' || i.status === 'ManualVerified');
    } else if (statusParam === 'invalid' || statusParam === 'Invalid') {
      filteredResult = combinedItems.filter((i) => i.status === 'Invalid');
    }

    return NextResponse.json({
      success: true,
      data: filteredResult,
      counts: {
        pending: pendingCount,
        revision: revisionCount,
        valid: validCount,
        invalid: invalidCount,
        total: totalCount
      },
      supervisees: !isOwner ? allowedTeacherIds : undefined
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

