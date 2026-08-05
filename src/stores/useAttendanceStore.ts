import { create } from 'zustand';

export interface ActiveSession {
  teacher_id?: string;
  teacher_name: string;
  student_id?: string;
  student_name: string;
  check_in_time?: string;
  checkin_photo_url?: string;
  verified?: boolean;
  score?: number;
}

export interface AttendanceRecord {
  id: string;
  teacher_name: string;
  student_name: string;
  date: string;
  check_in: string;
  check_out?: string;
  duration_minutes?: number;
  status: string;
}

export interface AttendanceState {
  activeSession: ActiveSession | null;
  isCameraOpen: boolean;
  elapsedSeconds: number;
  timerInterval: any;
  history: AttendanceRecord[];
  openCamera: () => void;
  closeCamera: () => void;
  startSession: (sessionData: ActiveSession) => void;
  endSession: () => any;
  startCheckIn: (teacherName: string, studentName: string) => void;
  checkOutSession: () => void;
}

const INITIAL_HISTORY: AttendanceRecord[] = [
  {
    id: 'att-1',
    teacher_name: 'Siti Nurhaliza, S.Pd.',
    student_name: 'Ananda Bintang Pratama',
    date: '2026-08-04',
    check_in: '14:02:15',
    check_out: '15:32:00',
    duration_minutes: 90,
    status: 'Terverifikasi AI'
  },
  {
    id: 'att-2',
    teacher_name: 'Budi Santoso, M.Pd.',
    student_name: 'Siti Aisyah',
    date: '2026-08-04',
    check_in: '15:30:10',
    check_out: '17:00:00',
    duration_minutes: 90,
    status: 'Terverifikasi AI'
  }
];

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  activeSession: null,
  isCameraOpen: false,
  elapsedSeconds: 0,
  timerInterval: null,
  history: INITIAL_HISTORY,

  openCamera: () => set({ isCameraOpen: true }),
  closeCamera: () => set({ isCameraOpen: false }),

  startSession: (sessionData) => {
    const existingInterval = get().timerInterval;
    if (existingInterval) clearInterval(existingInterval);

    const interval = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);

    set({
      activeSession: {
        ...sessionData,
        check_in_time: new Date().toLocaleTimeString('id-ID')
      },
      elapsedSeconds: 0,
      timerInterval: interval,
      isCameraOpen: false
    });
  },

  startCheckIn: (teacherName, studentName) => {
    get().startSession({
      teacher_name: teacherName,
      student_name: studentName
    });
  },

  checkOutSession: () => {
    const session = get().activeSession;
    const duration = Math.ceil(get().elapsedSeconds / 60) || 60;
    const now = new Date().toLocaleTimeString('id-ID');

    if (session) {
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        teacher_name: session.teacher_name,
        student_name: session.student_name,
        date: new Date().toISOString().split('T')[0],
        check_in: session.check_in_time || '14:00:00',
        check_out: now,
        duration_minutes: duration,
        status: 'Terverifikasi AI'
      };

      set((state) => ({
        history: [newRec, ...state.history]
      }));
    }

    get().endSession();
  },

  endSession: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);

    const currentSession = get().activeSession;
    const totalDuration = get().elapsedSeconds;

    set({
      activeSession: null,
      elapsedSeconds: 0,
      timerInterval: null
    });

    return {
      ...currentSession,
      check_out_time: new Date().toLocaleTimeString('id-ID'),
      duration_minutes: Math.ceil(totalDuration / 60) || 45
    };
  }
}));
