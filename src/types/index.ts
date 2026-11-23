export type UserRole = 'ADMIN' | 'ALUMNI';

export interface User {
  id: number;
  name: string;
  email: string;
  nisn?: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  created_at?: string;
  isActive: boolean;
  is_google_user?: boolean;
  receive_email_notifications?: boolean;
}

export type CareerStatus = 
  | 'Bekerja' 
  | 'Kuliah' 
  | 'Wirausaha' 
  | 'Mencari Kerja' 
  | 'Tidak Bekerja' 
  | 'Lainnya';

export type TracerStatus = 'Sudah Mengisi' | 'Belum Mengisi' | 'Draft';

export type PrivacySetting = 'PUBLIC' | 'ADMIN_ONLY' | 'HIDDEN';

export interface AlumniProfile {
  id: number;
  user_id: number;
  name: string;
  nisn: string;
  angkatan: number; // Tahun Lulus, e.g. 2024, 2025
  jurusan: string; // e.g. PPLG, DKV, MPLB, AKL, Bisnis Ritel
  email: string;
  phone: string;
  domisili: string; // Jakarta, Bogor, Depok, Tangerang, Bekasi, Luar Jabodetabek, dll.
  status_karir: CareerStatus;
  status_tracer: TracerStatus;
  password?: string;
  avatar?: string;
  linkedin_url?: string;
  privacy_setting: PrivacySetting;
  is_google_user?: boolean;
  receive_email_notifications?: boolean;
  updated_at: string;
  created_at: string;
  
  // Detail Karir Pekerjaan
  job_company?: string;
  job_position?: string;
  job_industry?: string;
  job_location?: string;
  job_start_date?: string;
  job_type?: 'Full-time' | 'Part-time' | 'Freelance' | 'Kontrak';
  
  // Detail Pendidikan Kuliah
  edu_university?: string;
  edu_major?: string;
  edu_degree?: 'D3' | 'D4' | 'S1' | 'S2';
  edu_location?: string;
  edu_start_year?: number;

  // Detail Wirausaha
  biz_name?: string;
  biz_field?: string;
  biz_location?: string;
  biz_start_year?: number;
}

export interface CareerHistoryItem {
  id: number;
  alumni_id: number;
  year_start: number;
  year_end?: number; // empty if current
  is_current: boolean;
  position: string;
  company: string;
  description?: string;
}

export interface DocumentFile {
  id: number;
  alumni_id: number;
  name: string;
  category: 'CV' | 'Portfolio' | 'Sertifikat' | 'Dokumen Lain';
  file_size_kb: number;
  upload_date: string;
  file_url: string;
  mime_type: string;
}

export type QuestionType = 
  | 'text' 
  | 'textarea' 
  | 'radio' 
  | 'checkbox' 
  | 'dropdown' 
  | 'rating' 
  | 'number' 
  | 'date';

export interface TracerQuestion {
  id: number;
  survey_id: number;
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  required: boolean;
  order: number;
  section?: string;
}

export interface TracerSurvey {
  id: number;
  title: string;
  description: string;
  target_angkatan: number; // e.g. 2025
  deadline: string; // YYYY-MM-DD
  status: 'Aktif' | 'Nonaktif';
  total_target: number;
  created_at: string;
}

export interface TracerSubmission {
  id: number;
  survey_id: number;
  alumni_id: number;
  alumni_name: string;
  angkatan: number;
  jurusan: string;
  status: 'Sudah Mengisi' | 'Draft';
  submitted_at: string;
  answers: Record<string, any>; // question_id -> answer
}

export interface JobPosting {
  id: number;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract' | 'Remote';
  category: 'Lowongan kerja' | 'Beasiswa' | 'Magang' | 'Event' | 'Pelatihan';
  deadline: string;
  description: string;
  requirements?: string;
  apply_url?: string;
  contact_email?: string;
  status: 'Published' | 'Draft' | 'Archived';
  event_date?: string; // for calendar export
  created_at: string;
  image?: string; // Poster, brosur, atau foto informasi lowongan
  company_logo?: string;
  posted_by?: string;
}

export interface ForumComment {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_role: UserRole;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface ForumPost {
  id: number;
  author_id: number;
  author_name: string;
  author_role: UserRole;
  author_avatar?: string;
  title: string;
  content: string;
  category: 'Karier' | 'Kuliah' | 'Networking' | 'Lowongan' | 'Umum';
  likes: number;
  liked_by_user: boolean;
  is_locked: boolean;
  created_at: string;
  comments: ForumComment[];
}

export interface NotificationItem {
  id: number;
  user_id?: number; // undefined means all or system
  target_role?: UserRole | 'ALL';
  title: string;
  message: string;
  type: 'tracer' | 'profile' | 'job' | 'announcement' | 'forum';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export interface AuditLog {
  id: number;
  user_name: string;
  user_role: string;
  activity: string;
  ip: string;
  timestamp: string;
}

export interface SchoolSettings {
  name: string;
  tagline: string;
  npsn: string;
  logo: string;
  landing_hero_image?: string;
  landing_hero_caption?: string;
  address: string;
  email: string;
  phone: string;
  academic_year: string;
  website: string;
  instagram: string;
  linkedin: string;
  tracer_default_deadline_days: number;
  reminder_7_days: boolean;
  reminder_3_days: boolean;
  reminder_1_day: boolean;
}

export interface GuruBkProfile {
  id: number;
  name: string;
  nip?: string;
  title: string;
  email?: string;
  phone?: string;
  city?: string;
  avatar?: string;
  is_default?: boolean;
  updated_at: string;
}

export interface EmailNotificationLog {
  id: string;
  user_id?: number;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  preview_text?: string;
  body_html: string;
  sent_at: string;
  category?: string;
  status: 'Terkirim' | 'Pending' | 'Gagal' | string;
  event_link?: string;
  real_gmail_sent?: boolean;
  gmail_compose_url?: string;
}
