import { supabase } from '@/lib/supabaseClient';
import { Teacher, Student } from '@/hooks/useMasterData';
import { INITIAL_TEACHERS, INITIAL_STUDENTS } from '@/utils/seedData';

// Check if Supabase credentials are configured
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role_title?: string;
  status?: string;
}

export const apiService = {
  // --- TEACHERS ---
  async getTeachers(): Promise<Teacher[]> {
    if (!isSupabaseConfigured) return INITIAL_TEACHERS;

    try {
      const { data, error } = await supabase.from('teachers').select('*').order('name');
      if (error || !data || data.length === 0) return INITIAL_TEACHERS;
      return data as Teacher[];
    } catch {
      return INITIAL_TEACHERS;
    }
  },

  async createTeacher(teacher: Partial<Teacher>): Promise<Teacher | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase.from('teachers').insert([teacher]).select().single();
      if (error) throw error;
      return data as Teacher;
    } catch (err) {
      console.warn('Supabase createTeacher fallback:', err);
      return null;
    }
  },

  // --- STAFF MANAGEMENT ---
  async getStaff(): Promise<StaffItem[]> {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async createStaff(staff: Partial<StaffItem>): Promise<StaffItem | null> {
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staff)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // --- STUDENTS ---
  async getStudents(): Promise<Student[]> {
    if (!isSupabaseConfigured) return INITIAL_STUDENTS;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, parents(name, phone)')
        .order('name');

      if (error || !data || data.length === 0) return INITIAL_STUDENTS;

      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        nickname: s.nickname,
        grade: s.grade,
        parent_name: s.parents?.name || s.parent_name || 'Orang Tua / Wali',
        parent_phone: s.parents?.phone || s.parent_phone || '081987654321',
        notes: s.notes,
        photo_url: s.photo_url
      })) as Student[];
    } catch {
      return INITIAL_STUDENTS;
    }
  },

  async createStudent(student: Partial<Student>): Promise<Student | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase.from('students').insert([student]).select().single();
      if (error) throw error;
      return data as Student;
    } catch (err) {
      console.warn('Supabase createStudent fallback:', err);
      return null;
    }
  },

  // --- PARENTS ---
  async getParents() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase.from('parents').select('*').order('name');
      return data || [];
    } catch {
      return [];
    }
  },

  // --- SESSION LOGS ---
  async getSessionLogs() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase.from('session_logs').select('*').order('session_date', { ascending: false });
      return data || [];
    } catch {
      return [];
    }
  },

  // --- ATTENDANCE ---
  async getAttendanceRecords() {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase.from('attendance_records').select('*').order('date', { ascending: false });
      return data || [];
    } catch {
      return [];
    }
  }
};
