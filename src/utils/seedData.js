// Initial Seed Data for Rumah Belajar Sahabat Tumbuh

export const INITIAL_TEACHERS = [
  {
    id: "tch-1",
    name: "Siti Nurhaliza, S.Pd.",
    email: "siti.teacher@sahabattumbuh.id",
    phone: "081234567890",
    photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    subjects: ["Matematika", "IPA"],
    hourly_rate: 60000,
    session_rate: 85000,
    status: "active"
  },
  {
    id: "tch-2",
    name: "Rizky Ramadhan, S.Si.",
    email: "rizky.teacher@sahabattumbuh.id",
    phone: "082345678901",
    photo_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
    subjects: ["Bahasa Inggris", "Membaca"],
    hourly_rate: 55000,
    session_rate: 75000,
    status: "active"
  },
  {
    id: "tch-3",
    name: "Dewi Anggraini, S.Kom.",
    email: "dewi.teacher@sahabattumbuh.id",
    phone: "083456789012",
    photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    subjects: ["Calistung", "Komputer Anak"],
    hourly_rate: 50000,
    session_rate: 70000,
    status: "active"
  }
];

export const INITIAL_STUDENTS = [
  {
    id: "std-1",
    name: "Ananda Bintang Pratama",
    nickname: "Bintang",
    grade: "SD Kelas 3",
    school_name: "SDN Merdeka 01",
    parent_name: "Ibu Ratna",
    parent_phone: "081987654321",
    photo_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80",
    notes: "Lebih mudah memahami pembelajaran visual & gambar.",
    status: "active"
  },
  {
    id: "std-2",
    name: "Aisha Nabila Zahra",
    nickname: "Aisha",
    grade: "TK B",
    school_name: "TK Sahabat Ceria",
    parent_name: "Bapak Hendra",
    parent_phone: "082876543210",
    photo_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop&q=80",
    notes: "Pendampingan konsentrasi dan pengenalan huruf/angka.",
    status: "active"
  },
  {
    id: "std-3",
    name: "Fathir Muhammad",
    nickname: "Fathir",
    grade: "SD Kelas 5",
    school_name: "SD Islam Al-Azhar",
    parent_name: "Ibu Melani",
    parent_phone: "083765432109",
    photo_url: "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&auto=format&fit=crop&q=80",
    notes: "Penguatan rumus pecahan & perkalian tingkat lanjut.",
    status: "active"
  }
];

export const INITIAL_SCHEDULES = [
  {
    id: "sch-1",
    teacher_id: "tch-1",
    student_id: "std-1",
    subject: "Matematika SD",
    day_of_week: 1, // Senin
    start_time: "14:00",
    end_time: "15:30",
    room: "Ruang Bambu 01",
    status: "active"
  },
  {
    id: "sch-2",
    teacher_id: "tch-2",
    student_id: "std-2",
    subject: "Calistung & Bahasa",
    day_of_week: 2, // Selasa
    start_time: "15:30",
    end_time: "17:00",
    room: "Ruang Melati 02",
    status: "active"
  },
  {
    id: "sch-3",
    teacher_id: "tch-1",
    student_id: "std-3",
    subject: "IPA Terpadu",
    day_of_week: 3, // Rabu
    start_time: "16:00",
    end_time: "17:30",
    room: "Ruang Bambu 01",
    status: "active"
  }
];

export const INITIAL_SESSION_LOGS = [
  {
    id: "log-1",
    session_date: "2026-08-03",
    start_time: "14:00",
    end_time: "15:30",
    teacher_id: "tch-1",
    teacher_name: "Siti Nurhaliza, S.Pd.",
    student_id: "std-1",
    student_name: "Ananda Bintang Pratama",
    activities: "Latihan soal pecahan senilai, pembagian bersusun sederhana, dan game tebak matematika.",
    results_recommendations: "Bintang sudah memahami konsep pecahan senilai dengan baik (skor 85/100). Rekomendasi: Latihan rutin perkalian 7 dan 8 di rumah.",
    session_fee: 85000,
    verified: true
  },
  {
    id: "log-2",
    session_date: "2026-08-02",
    start_time: "15:30",
    end_time: "17:00",
    teacher_id: "tch-2",
    teacher_name: "Rizky Ramadhan, S.Si.",
    student_id: "std-2",
    student_name: "Aisha Nabila Zahra",
    activities: "Mengenal huruf vokal (A, I, U, E, O), mewarnai kata bergambar, dan latihan menyambungkan garis.",
    results_recommendations: "Aisha sangat antusias dan mampu mengingat huruf A, I, U dengan fasih. Rekomendasi: Didampingi mengeja suku kata terbuka sederhana.",
    session_fee: 75000,
    verified: true
  },
  {
    id: "log-3",
    session_date: "2026-08-01",
    start_time: "16:00",
    end_time: "17:30",
    teacher_id: "tch-1",
    teacher_name: "Siti Nurhaliza, S.Pd.",
    student_id: "std-3",
    student_name: "Fathir Muhammad",
    activities: "Pendampingan materi wujud zat, perubahan fisika-kimia, dan praktikum sederhana larutan gula.",
    results_recommendations: "Fathir aktif bertanya dan memahami perbedaan wujud benda dengan baik. Rekomendasi: Membaca bab selanjutnya tentang tata surya.",
    session_fee: 85000,
    verified: true
  }
];
