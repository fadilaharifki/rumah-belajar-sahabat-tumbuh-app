import { useState, useEffect } from 'react';
import { apiService, StaffItem } from '@/services/apiServices';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo_url?: string;
  subjects?: string[];
  hourly_rate?: number;
  session_rate: number;
  status?: string;
}

export interface Student {
  id: string;
  name: string;
  nickname?: string;
  grade: string;
  school_name?: string;
  parent_name: string;
  parent_phone: string;
  photo_url?: string;
  notes?: string;
  status?: string;
}

export const useMasterData = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveMasterData = async () => {
      setIsLoading(true);
      const [liveTeachers, liveStudents, liveStaff] = await Promise.all([
        apiService.getTeachers(),
        apiService.getStudents(),
        apiService.getStaff()
      ]);
      if (isMounted) {
        if (liveTeachers && liveTeachers.length > 0) setTeachers(liveTeachers);
        if (liveStudents && liveStudents.length > 0) setStudents(liveStudents);
        if (liveStaff && liveStaff.length > 0) setStaff(liveStaff);
        setIsLoading(false);
      }
    };

    fetchLiveMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  const addTeacher = async (newTeacher: Partial<Teacher>) => {
    const fullTeacher: Teacher = {
      id: `tch-${Date.now()}`,
      name: newTeacher.name || '',
      email: newTeacher.email || '',
      phone: newTeacher.phone || '',
      session_rate: newTeacher.session_rate || 85000,
      photo_url: newTeacher.photo_url,
      status: 'active'
    };

    setTeachers((prev) => [...prev, fullTeacher]);
    await apiService.createTeacher(fullTeacher);
  };

  const addStudent = async (newStudent: Partial<Student>) => {
    const fullStudent: Student = {
      id: `std-${Date.now()}`,
      name: newStudent.name || '',
      grade: newStudent.grade || '',
      parent_name: newStudent.parent_name || '',
      parent_phone: newStudent.parent_phone || '',
      notes: newStudent.notes,
      photo_url: newStudent.photo_url,
      status: 'active'
    };

    setStudents((prev) => [...prev, fullStudent]);
    await apiService.createStudent(fullStudent);
  };

  const addStaff = async (newStaff: Partial<StaffItem>) => {
    const fullStaff: StaffItem = {
      id: `stf-${Date.now()}`,
      name: newStaff.name || '',
      email: newStaff.email || '',
      phone: newStaff.phone || '',
      role_title: newStaff.role_title || 'Staff Administrasi & Keuangan',
      status: 'Aktif'
    };

    setStaff((prev) => [...prev, fullStaff]);
    await apiService.createStaff(fullStaff);
  };

  return {
    teachers,
    students,
    staff,
    isLoading,
    addTeacher,
    addStudent,
    addStaff
  };
};
