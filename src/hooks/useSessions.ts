import { useState } from 'react';

export interface SessionLog {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  teacher_id: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
  activities: string;
  results_recommendations: string;
  session_fee: number;
  verified?: boolean;
}

export const useSessions = () => {
  const [logs, setLogs] = useState<SessionLog[]>([]);

  const addLog = (newLog: SessionLog) => {
    setLogs((prev) => [newLog, ...prev]);
  };

  return {
    logs,
    addLog
  };
};
