import {
  User,
  UserRole,
  AlumniProfile,
  CareerHistoryItem,
  DocumentFile,
  TracerSurvey,
  TracerQuestion,
  TracerSubmission,
  JobPosting,
  ForumPost,
  NotificationItem,
  AuditLog,
  SchoolSettings,
  GuruBkProfile,
  EmailNotificationLog,
} from '../types';
import {
  INITIAL_ALUMNI_PROFILES,
  INITIAL_TRACER_SURVEYS,
  INITIAL_TRACER_QUESTIONS,
  INITIAL_JOB_POSTINGS,
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_GURU_BK_PROFILES,
} from '../data/initialData';

export interface PublicCareerStat {
  alumni_id: number;
  uid?: string;
  status_karir: AlumniProfile['status_karir'];
  angkatan: number;
  jurusan: string;
  updated_at: string;
}

function emitDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('alumnitrack_data_changed'));
  }
}

function emitAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('alumnitrack_auth_changed'));
  }
}

function emitSyncErrorToast(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('alumnitrack_firestore_error', { detail: { message } })
    );
  }
}

let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

interface StoreCache {
  users: User[];
  currentUser: User | null;
  profiles: AlumniProfile[];
  careerStats: PublicCareerStat[];
  histories: CareerHistoryItem[];
  documents: DocumentFile[];
  surveys: TracerSurvey[];
  questions: TracerQuestion[];
  submissions: TracerSubmission[];
  jobs: JobPosting[];
  publicJobs: JobPosting[];
  forum: ForumPost[];
  notifications: NotificationItem[];
  audit: AuditLog[];
  settings: SchoolSettings;
  guruBk: GuruBkProfile[];
  emailLogs: EmailNotificationLog[];
  hasPublicStats: boolean;
  hasPublicJobs: boolean;
}

const cache: StoreCache = {
  users: [],
  currentUser: null,
  profiles: [],
  careerStats: [],
  histories: [],
  documents: [],
  surveys: [],
  questions: [],
  submissions: [],
  jobs: [],
  publicJobs: [],
  forum: [],
  notifications: [],
  audit: [],
  settings: { ...INITIAL_SCHOOL_SETTINGS },
  guruBk: [...INITIAL_GURU_BK_PROFILES],
  emailLogs: [],
  hasPublicStats: false,
  hasPublicJobs: false,
};

let sseSource: EventSource | null = null;
let publicStarted = false;
let authActive = false;

export async function refreshPublicLandingData(): Promise<void> {
  try {
    const res = await fetch('/api/public/landing');
    if (!res.ok) return;
    const data = await res.json();
    if (data.settings) cache.settings = data.settings;
    if (Array.isArray(data.publicCareerStats)) {
      cache.careerStats = data.publicCareerStats;
      cache.hasPublicStats = true;
    }
    if (Array.isArray(data.publicJobs)) {
      cache.publicJobs = data.publicJobs;
      cache.hasPublicJobs = true;
    }
    emitDataChanged();
  } catch (err) {
    console.error('Public landing fetch failed:', err);
  }
}

export async function refreshAuthenticatedData(): Promise<void> {
  if (!inMemoryAuthToken) return;
  try {
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${inMemoryAuthToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    cache.users = Array.isArray(data.users) ? data.users : [];
    cache.profiles = Array.isArray(data.profiles) ? data.profiles : [];
    cache.histories = Array.isArray(data.histories) ? data.histories : [];
    cache.documents = Array.isArray(data.documents) ? data.documents : [];
    cache.surveys = Array.isArray(data.surveys) ? data.surveys : [];
    cache.questions = Array.isArray(data.questions) ? data.questions : [];
    cache.submissions = Array.isArray(data.submissions) ? data.submissions : [];
    cache.jobs = Array.isArray(data.jobs) ? data.jobs : [];
    cache.forum = Array.isArray(data.forum) ? data.forum : [];
    cache.notifications = Array.isArray(data.notifications) ? data.notifications : [];
    cache.audit = Array.isArray(data.audit) ? data.audit : [];
    if (data.settings) cache.settings = data.settings;
    if (Array.isArray(data.guruBk) && data.guruBk.length > 0) cache.guruBk = data.guruBk;
    if (Array.isArray(data.emailLogs)) cache.emailLogs = data.emailLogs;

    if (cache.currentUser) {
      const freshSelf = cache.users.find((u) => u.id === cache.currentUser?.id);
      if (freshSelf) {
        cache.currentUser = freshSelf;
        emitAuthChanged();
      }
    }
    emitDataChanged();
  } catch (err) {
    console.error('Authenticated data fetch failed:', err);
  }
}

export function startPublicListeners(): void {
  if (typeof window === 'undefined') return;
  if (!publicStarted) {
    publicStarted = true;
    void refreshPublicLandingData();
  }
  if (!sseSource) {
    try {
      sseSource = new EventSource('/api/events');
      sseSource.addEventListener('change', () => {
        void refreshPublicLandingData();
        if (authActive && inMemoryAuthToken) {
          void refreshAuthenticatedData();
        }
      });
    } catch (err) {
      console.error('SSE init failed:', err);
    }
  }
}

export function startAuthenticatedListeners(_uid?: string | number, _role?: UserRole): void {
  authActive = true;
  startPublicListeners();
  void refreshAuthenticatedData();
}

export function stopAuthenticatedListeners(): void {
  authActive = false;
  inMemoryAuthToken = null;
  cache.users = [];
  cache.currentUser = null;
  cache.profiles = [];
  cache.histories = [];
  cache.documents = [];
  cache.submissions = [];
  cache.audit = [];
  cache.notifications = [];
  cache.emailLogs = [];
  emitAuthChanged();
  emitDataChanged();
}

if (typeof window !== 'undefined') {
  startPublicListeners();
}

function nextNumericId(existingIds: number[]): number {
  const max = existingIds.reduce((m, val) => (val > m ? val : m), 0);
  return max + 1;
}

async function apiMutate(
  method: string,
  url: string,
  body?: unknown,
  onAfterSuccess?: () => void
): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (inMemoryAuthToken) {
      headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || errData?.message || `HTTP ${res.status}`);
    }
    onAfterSuccess?.();
  } catch (err: any) {
    console.error(`API ${method} ${url} failed:`, err);
    emitSyncErrorToast(err?.message || 'Gagal menyimpan perubahan ke database.');
    void refreshAuthenticatedData();
    void refreshPublicLandingData();
  }
}

export const StorageService = {
  // --- PUBLIC REAL-TIME LANDING PAGE STATS ---
  getPublicCareerStats: (): PublicCareerStat[] => {
    if (cache.hasPublicStats) {
      return cache.careerStats;
    }
    if (cache.profiles.length > 0) {
      return cache.profiles.map((a) => ({
        alumni_id: a.id,
        status_karir: a.status_karir,
        angkatan: a.angkatan,
        jurusan: a.jurusan,
        updated_at: a.updated_at,
      }));
    }
    return INITIAL_ALUMNI_PROFILES.map((a) => ({
      alumni_id: a.id,
      status_karir: a.status_karir,
      angkatan: a.angkatan,
      jurusan: a.jurusan,
      updated_at: a.updated_at,
    }));
  },

  // --- USERS & SESSION ---
  getUsers: (): User[] => cache.users,

  getCurrentUser: (): User | null => cache.currentUser,

  setCurrentUser: (user: User | null): void => {
    cache.currentUser = user;
    emitAuthChanged();
  },

  // --- ALUMNI PROFILES ---
  getAlumniList: (): AlumniProfile[] => cache.profiles,

  getAlumniById: (id: number): AlumniProfile | undefined => {
    return cache.profiles.find((a) => a.id === id);
  },

  getAlumniByUserId: (
    userId: number,
    userEmail?: string,
    userNisn?: string
  ): AlumniProfile | undefined => {
    const list = cache.profiles;
    const byUserId = list.find((a) => a.user_id === userId);
    if (byUserId) {
      const cleanUserEmail = userEmail?.trim().toLowerCase();
      const cleanProfileEmail = byUserId.email?.trim().toLowerCase();
      if (!cleanUserEmail || !cleanProfileEmail || cleanUserEmail === cleanProfileEmail) {
        return byUserId;
      }
    }

    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const byEmail = list.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
      if (byEmail) return byEmail;
    }

    if (userNisn) {
      const cleanNisn = userNisn.trim().toLowerCase();
      const byNisn = list.find((a) => a.nisn && a.nisn.trim().toLowerCase() === cleanNisn);
      if (byNisn) return byNisn;
    }

    return undefined;
  },

  saveAlumni: (alumni: AlumniProfile): AlumniProfile => {
    const updated: AlumniProfile = {
      ...alumni,
      id: alumni.id && alumni.id > 0 ? alumni.id : nextNumericId(cache.profiles.map((p) => p.id)),
      user_id:
        alumni.user_id && alumni.user_id > 0
          ? alumni.user_id
          : nextNumericId(cache.users.map((u) => u.id)),
      jurusan:
        alumni.jurusan && alumni.jurusan.toUpperCase().includes('TKJ')
          ? 'PPLG'
          : alumni.jurusan || 'PPLG',
      created_at: alumni.created_at || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    delete updated.password;

    const idx = cache.profiles.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      cache.profiles = cache.profiles.map((p) => (p.id === updated.id ? updated : p));
    } else {
      cache.profiles = [updated, ...cache.profiles];
    }

    if (
      cache.currentUser &&
      (cache.currentUser.id === updated.user_id ||
        cache.currentUser.email.toLowerCase() === updated.email.toLowerCase())
    ) {
      cache.currentUser = {
        ...cache.currentUser,
        name: updated.name,
        nisn: updated.nisn,
        avatar: updated.avatar !== undefined ? updated.avatar : cache.currentUser.avatar,
      };
      emitAuthChanged();
    }
    emitDataChanged();

    void apiMutate('PUT', '/api/alumni', updated, () => {
      void refreshAuthenticatedData();
      void refreshPublicLandingData();
    });

    return updated;
  },

  deleteAlumni: (id: number): boolean => {
    const exists = cache.profiles.some((p) => p.id === id);
    if (!exists) return false;
    cache.profiles = cache.profiles.filter((p) => p.id !== id);
    cache.careerStats = cache.careerStats.filter((s) => s.alumni_id !== id);
    emitDataChanged();

    void apiMutate('DELETE', `/api/alumni/${id}`);
    return true;
  },

  deleteMultipleAlumni: (ids: number[]): number => {
    const idSet = new Set(ids);
    const toDelete = cache.profiles.filter((a) => idSet.has(a.id));
    if (toDelete.length === 0) return 0;

    cache.profiles = cache.profiles.filter((a) => !idSet.has(a.id));
    cache.careerStats = cache.careerStats.filter((s) => !idSet.has(s.alumni_id));
    cache.histories = cache.histories.filter((h) => !idSet.has(h.alumni_id));
    cache.documents = cache.documents.filter((d) => !idSet.has(d.alumni_id));
    emitDataChanged();

    void apiMutate('POST', '/api/alumni/batch-delete', { ids });
    return toDelete.length;
  },

  // --- CAREER HISTORIES ---
  getCareerHistories: (alumniId: number): CareerHistoryItem[] => {
    return cache.histories.filter((h) => h.alumni_id === alumniId);
  },

  saveCareerHistory: (
    item: Omit<CareerHistoryItem, 'id'> & { id?: number }
  ): CareerHistoryItem => {
    const newId = item.id || nextNumericId(cache.histories.map((h) => h.id));
    const saved: CareerHistoryItem = { ...item, id: newId };
    const idx = cache.histories.findIndex((h) => h.id === newId);
    if (idx >= 0) {
      cache.histories = cache.histories.map((h) => (h.id === newId ? saved : h));
    } else {
      cache.histories = [...cache.histories, saved];
    }
    emitDataChanged();

    void apiMutate('PUT', '/api/histories', saved);
    return saved;
  },

  deleteCareerHistory: (id: number): void => {
    cache.histories = cache.histories.filter((h) => h.id !== id);
    emitDataChanged();
    void apiMutate('DELETE', `/api/histories/${id}`);
  },

  // --- DOCUMENTS ---
  getDocuments: (alumniId: number): DocumentFile[] => {
    return cache.documents.filter((d) => d.alumni_id === alumniId);
  },

  saveDocument: (docItem: Omit<DocumentFile, 'id'>): DocumentFile => {
    const newId = nextNumericId(cache.documents.map((d) => d.id));
    const saved: DocumentFile = { ...docItem, id: newId };
    cache.documents = [...cache.documents, saved];
    emitDataChanged();

    void apiMutate('POST', '/api/documents', saved);
    return saved;
  },

  deleteDocument: (id: number): void => {
    cache.documents = cache.documents.filter((d) => d.id !== id);
    emitDataChanged();
    void apiMutate('DELETE', `/api/documents/${id}`);
  },

  // --- TRACER SURVEYS & QUESTIONS ---
  getSurveys: (): TracerSurvey[] =>
    cache.surveys.length > 0 ? cache.surveys : INITIAL_TRACER_SURVEYS,

  getActiveSurvey: (): TracerSurvey | undefined => {
    const list = StorageService.getSurveys();
    return list.find((s) => s.status === 'Aktif') || list[0];
  },

  saveSurvey: (survey: TracerSurvey): TracerSurvey => {
    const newId =
      survey.id && survey.id > 0 ? survey.id : nextNumericId(cache.surveys.map((s) => s.id));
    const saved: TracerSurvey = { ...survey, id: newId };
    const idx = cache.surveys.findIndex((s) => s.id === newId);
    if (idx >= 0) {
      cache.surveys = cache.surveys.map((s) => (s.id === newId ? saved : s));
    } else {
      cache.surveys = [...cache.surveys, saved];
    }
    emitDataChanged();

    void apiMutate('PUT', '/api/surveys', saved);
    return saved;
  },

  getQuestions: (surveyId: number): TracerQuestion[] => {
    const source = cache.questions.length > 0 ? cache.questions : INITIAL_TRACER_QUESTIONS;
    return source.filter((q) => q.survey_id === surveyId).sort((a, b) => a.order - b.order);
  },

  saveQuestion: (question: TracerQuestion): TracerQuestion => {
    const newId =
      question.id && question.id > 0
        ? question.id
        : nextNumericId(cache.questions.map((q) => q.id));
    const saved: TracerQuestion = { ...question, id: newId };
    const idx = cache.questions.findIndex((q) => q.id === newId);
    if (idx >= 0) {
      cache.questions = cache.questions.map((q) => (q.id === newId ? saved : q));
    } else {
      cache.questions = [...cache.questions, saved];
    }
    emitDataChanged();

    void apiMutate('PUT', '/api/questions', saved);
    return saved;
  },

  deleteQuestion: (id: number): void => {
    cache.questions = cache.questions.filter((q) => q.id !== id);
    emitDataChanged();
    void apiMutate('DELETE', `/api/questions/${id}`);
  },

  deleteMultipleQuestions: (ids: number[]): number => {
    const idSet = new Set(ids);
    const toDelete = cache.questions.filter((q) => idSet.has(q.id));
    if (toDelete.length === 0) return 0;
    cache.questions = cache.questions.filter((q) => !idSet.has(q.id));
    emitDataChanged();

    void apiMutate('POST', '/api/questions/batch-delete', { ids });
    return toDelete.length;
  },

  // --- TRACER SUBMISSIONS ---
  getSubmissions: (): TracerSubmission[] => cache.submissions,

  getSubmissionByAlumni: (surveyId: number, alumniId: number): TracerSubmission | undefined => {
    return cache.submissions.find(
      (s) => s.survey_id === surveyId && s.alumni_id === alumniId
    );
  },

  saveSubmission: (sub: Omit<TracerSubmission, 'id'>): TracerSubmission => {
    const existing = cache.submissions.find(
      (s) => s.survey_id === sub.survey_id && s.alumni_id === sub.alumni_id
    );
    const newId = existing ? existing.id : nextNumericId(cache.submissions.map((s) => s.id));
    const saved: TracerSubmission = { ...sub, id: newId };

    if (existing) {
      cache.submissions = cache.submissions.map((s) => (s.id === newId ? saved : s));
    } else {
      cache.submissions = [...cache.submissions, saved];
    }

    const alumni = StorageService.getAlumniById(sub.alumni_id);
    if (alumni) {
      cache.profiles = cache.profiles.map((p) =>
        p.id === alumni.id ? { ...p, status_tracer: saved.status } : p
      );
    }
    emitDataChanged();

    void apiMutate('POST', '/api/submissions', saved);
    return saved;
  },

  // --- JOBS & EVENTS ---
  getJobs: (): JobPosting[] => {
    if (cache.jobs.length > 0) return cache.jobs;
    if (cache.hasPublicJobs) return cache.publicJobs;
    return INITIAL_JOB_POSTINGS;
  },

  saveJob: (job: JobPosting): JobPosting => {
    const newId = job.id && job.id > 0 ? job.id : nextNumericId(cache.jobs.map((j) => j.id));
    const saved: JobPosting = {
      ...job,
      id: newId,
      created_at: job.created_at || new Date().toISOString().split('T')[0],
    };
    const idx = cache.jobs.findIndex((j) => j.id === newId);
    if (idx >= 0) {
      cache.jobs = cache.jobs.map((j) => (j.id === newId ? saved : j));
    } else {
      cache.jobs = [saved, ...cache.jobs];
    }
    emitDataChanged();

    void apiMutate('PUT', '/api/jobs', saved);
    return saved;
  },

  deleteJob: (id: number): void => {
    cache.jobs = cache.jobs.filter((j) => j.id !== id);
    emitDataChanged();
    void apiMutate('DELETE', `/api/jobs/${id}`);
  },

  deleteMultipleJobs: (ids: number[]): number => {
    const idSet = new Set(ids);
    const toDelete = cache.jobs.filter((j) => idSet.has(j.id));
    if (toDelete.length === 0) return 0;
    cache.jobs = cache.jobs.filter((j) => !idSet.has(j.id));
    emitDataChanged();

    void apiMutate('POST', '/api/jobs/batch-delete', { ids });
    return toDelete.length;
  },

  // --- FORUM ---
  getForumPosts: (): ForumPost[] => cache.forum,

  saveForumPost: (
    post: Omit<
      ForumPost,
      'id' | 'likes' | 'liked_by_user' | 'comments' | 'created_at' | 'is_locked'
    > & {
      is_locked?: boolean;
    }
  ): ForumPost => {
    const newId = nextNumericId(cache.forum.map((p) => p.id));
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const saved: ForumPost = {
      ...post,
      id: newId,
      likes: 0,
      liked_by_user: false,
      liked_by_uids: [],
      is_locked: post.is_locked ?? false,
      created_at: timeStr,
      comments: [],
    };
    cache.forum = [saved, ...cache.forum];
    emitDataChanged();

    void apiMutate('POST', '/api/forum', saved, () => {
      void refreshAuthenticatedData();
    });
    return saved;
  },

  toggleLikePost: (postId: number): void => {
    const post = cache.forum.find((p) => p.id === postId);
    if (!post) return;
    const nextLiked = !post.liked_by_user;
    const nextLikes = nextLiked ? post.likes + 1 : Math.max(0, post.likes - 1);

    cache.forum = cache.forum.map((p) =>
      p.id === postId ? { ...p, likes: nextLikes, liked_by_user: nextLiked } : p
    );
    emitDataChanged();

    void apiMutate('POST', `/api/forum/${postId}/like`);
  },

  addComment: (
    postId: number,
    comment: {
      author_id: number;
      author_name: string;
      author_role: UserRole;
      author_avatar?: string;
      content: string;
    }
  ): void => {
    const post = cache.forum.find((p) => p.id === postId);
    if (!post) return;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const commentId = Math.floor(Math.random() * 90000) + 1000;
    const newComment = {
      id: commentId,
      post_id: postId,
      ...comment,
      created_at: timeStr,
    };
    cache.forum = cache.forum.map((p) =>
      p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
    );
    emitDataChanged();

    void apiMutate('POST', `/api/forum/${postId}/comment`, { content: comment.content });
  },

  toggleLockPost: (postId: number): void => {
    const post = cache.forum.find((p) => p.id === postId);
    if (!post) return;
    cache.forum = cache.forum.map((p) =>
      p.id === postId ? { ...p, is_locked: !p.is_locked } : p
    );
    emitDataChanged();
    void apiMutate('POST', `/api/forum/${postId}/lock`);
  },

  deletePost: (postId: number): void => {
    cache.forum = cache.forum.filter((p) => p.id !== postId);
    emitDataChanged();
    void apiMutate('DELETE', `/api/forum/${postId}`);
  },

  // --- NOTIFICATIONS ---
  getNotifications: (): NotificationItem[] => cache.notifications,

  markNotificationAsRead: (id: number): void => {
    cache.notifications = cache.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    emitDataChanged();
    void apiMutate('POST', `/api/notifications/read/${id}`);
  },

  markAllNotificationsAsRead: (): void => {
    cache.notifications = cache.notifications.map((n) => ({ ...n, is_read: true }));
    emitDataChanged();
    void apiMutate('POST', '/api/notifications/read-all');
  },

  sendBroadcastNotification: (
    title: string,
    message: string,
    target_role: 'ALL' | 'ALUMNI' | 'ADMIN' = 'ALL'
  ): void => {
    const newId = nextNumericId(cache.notifications.map((n) => n.id));
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const item: NotificationItem = {
      id: newId,
      title,
      message,
      target_role,
      type: 'announcement',
      is_read: false,
      created_at: timeStr,
    };
    cache.notifications = [item, ...cache.notifications];
    emitDataChanged();

    void apiMutate('POST', '/api/notifications/broadcast', { title, message, target_role });
  },

  // --- AUDIT LOGS ---
  getAuditLogs: (): AuditLog[] => cache.audit,

  addAuditLog: (userName: string, userRole: string, activity: string): void => {
    if (!inMemoryAuthToken) return;
    const newId = nextNumericId(cache.audit.map((l) => l.id));
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const item: AuditLog = {
      id: newId,
      user_name: userName,
      user_role: userRole,
      activity,
      ip: 'Session Aktif',
      timestamp: timeStr,
    };
    cache.audit = [item, ...cache.audit];
    emitDataChanged();

    void apiMutate('POST', '/api/audit', { activity });
  },

  deleteAuditLog: (id: number): boolean => {
    const exists = cache.audit.some((l) => l.id === id);
    if (!exists) return false;
    cache.audit = cache.audit.filter((l) => l.id !== id);
    emitDataChanged();
    void apiMutate('DELETE', `/api/audit/${id}`);
    return true;
  },

  deleteMultipleAuditLogs: (ids: number[]): number => {
    const idSet = new Set(ids);
    const toDelete = cache.audit.filter((l) => idSet.has(l.id));
    if (toDelete.length === 0) return 0;
    cache.audit = cache.audit.filter((l) => !idSet.has(l.id));
    emitDataChanged();
    void apiMutate('POST', '/api/audit/batch-delete', { ids });
    return toDelete.length;
  },

  clearAllAuditLogs: (): void => {
    cache.audit = [];
    emitDataChanged();
    void apiMutate('DELETE', '/api/audit');
  },

  // --- SCHOOL SETTINGS ---
  getSchoolSettings: (): SchoolSettings => cache.settings,

  saveSchoolSettings: (settings: SchoolSettings): SchoolSettings => {
    cache.settings = { ...settings };
    emitDataChanged();
    void apiMutate('PUT', '/api/settings', settings);
    return settings;
  },

  // --- PROFIL GURU BK (CRUD PENERBIT LAPORAN) ---
  getGuruBkProfiles: (): GuruBkProfile[] => {
    return cache.guruBk.length > 0 ? cache.guruBk : INITIAL_GURU_BK_PROFILES;
  },

  getActiveGuruBk: (): GuruBkProfile => {
    const list = StorageService.getGuruBkProfiles();
    return list.find((g) => g.is_default) || list[0] || INITIAL_GURU_BK_PROFILES[0];
  },

  saveGuruBkProfile: (
    data: Omit<GuruBkProfile, 'id' | 'updated_at'> & { id?: number }
  ): GuruBkProfile => {
    const today = new Date().toISOString().split('T')[0];
    const list = [...StorageService.getGuruBkProfiles()];
    const newId = data.id || nextNumericId(list.map((g) => g.id));

    const updatedList = list.map((item) =>
      data.is_default ? { ...item, is_default: false } : item
    );

    const existingIdx = updatedList.findIndex((g) => g.id === newId);
    const saved: GuruBkProfile = {
      ...data,
      id: newId,
      is_default: data.is_default ?? updatedList.length === 0,
      updated_at: today,
    };

    if (existingIdx >= 0) {
      updatedList[existingIdx] = saved;
    } else {
      updatedList.push(saved);
    }

    if (!updatedList.some((g) => g.is_default) && updatedList.length > 0) {
      updatedList[0] = { ...updatedList[0], is_default: true };
    }

    cache.guruBk = updatedList;
    emitDataChanged();

    void apiMutate('PUT', '/api/guru-bk', saved);
    return saved;
  },

  setDefaultGuruBkProfile: (id: number): void => {
    cache.guruBk = StorageService.getGuruBkProfiles().map((g) => ({
      ...g,
      is_default: g.id === id,
    }));
    emitDataChanged();
    void apiMutate('POST', `/api/guru-bk/${id}/default`);
  },

  deleteGuruBkProfile: (id: number): boolean => {
    const list = StorageService.getGuruBkProfiles();
    if (list.length <= 1) return false;
    const filtered = list.filter((g) => g.id !== id);
    if (filtered.length === list.length) return false;

    if (!filtered.some((g) => g.is_default) && filtered.length > 0) {
      filtered[0] = { ...filtered[0], is_default: true };
    }
    cache.guruBk = filtered;
    emitDataChanged();
    void apiMutate('DELETE', `/api/guru-bk/${id}`);
    return true;
  },

  // --- EMAIL LOGS ---
  getEmailLogs: (): EmailNotificationLog[] => cache.emailLogs,

  saveEmailLog: (log: EmailNotificationLog): void => {
    cache.emailLogs = [log, ...cache.emailLogs].slice(0, 200);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('alumnitrack_emails_changed'));
    }
    if (inMemoryAuthToken) {
      void apiMutate('POST', '/api/email-logs', log);
    }
  },
};
