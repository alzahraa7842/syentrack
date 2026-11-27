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
import { DEFAULT_HERO_IMAGE, DEFAULT_SCHOOL_LOGO, resolveAssetUrl } from '../constants/assets';

export interface PublicCareerStat {
  alumni_id: number;
  uid?: string;
  status_karir: AlumniProfile['status_karir'];
  angkatan: number;
  jurusan: string;
  updated_at: string;
}

const LS_KEYS = {
  TOKEN: 'alumnitrack_auth_token',
  CURRENT_USER: 'alumnitrack_current_user',
  USERS: 'alumnitrack_users',
  PROFILES: 'alumnitrack_alumni_profiles',
  PROFILE_EDITS: 'alumnitrack_profile_local_edits',
  CAREER_STATS: 'alumnitrack_public_career_stats',
  HISTORIES: 'alumnitrack_histories',
  DOCUMENTS: 'alumnitrack_documents',
  SURVEYS: 'alumnitrack_surveys',
  QUESTIONS: 'alumnitrack_questions',
  SUBMISSIONS: 'alumnitrack_submissions',
  JOBS: 'alumnitrack_jobs',
  PUBLIC_JOBS: 'alumnitrack_public_jobs',
  FORUM: 'alumnitrack_forum',
  NOTIFICATIONS: 'alumnitrack_notifications',
  AUDIT: 'alumnitrack_audit',
  SETTINGS: 'alumnitrack_school_settings',
  SETTINGS_META: 'alumnitrack_school_settings_meta',
  GURU_BK: 'alumnitrack_guru_bk',
  EMAIL_LOGS: 'alumnitrack_email_logs',
} as const;

interface SettingsMeta {
  updatedAt: number;
  customized: boolean;
  syncedToServer: boolean;
}

interface ProfileLocalEdit {
  profile: AlumniProfile;
  updatedAt: number;
  syncedToServer: boolean;
}

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`LocalStorage write failed for ${key}:`, err);
  }
}

function safeRemoveKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function normalizeSettings(raw?: Partial<SchoolSettings> | null): SchoolSettings {
  const merged: SchoolSettings = {
    ...INITIAL_SCHOOL_SETTINGS,
    ...(raw || {}),
  };
  return {
    ...merged,
    logo: resolveAssetUrl(merged.logo, DEFAULT_SCHOOL_LOGO),
    landing_hero_image: resolveAssetUrl(merged.landing_hero_image, DEFAULT_HERO_IMAGE),
  };
}

function normalizeProfile(profile: AlumniProfile): AlumniProfile {
  return {
    ...profile,
    avatar: profile.avatar !== undefined ? resolveAssetUrl(profile.avatar) : profile.avatar,
  };
}

function normalizeUser(user: User): User {
  return {
    ...user,
    avatar: user.avatar !== undefined ? resolveAssetUrl(user.avatar) : user.avatar,
  };
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

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel('alumnitrack_sync');
  } catch {
    broadcastChannel = null;
  }
}

function notifyOtherTabs(scope: string) {
  try {
    broadcastChannel?.postMessage({ scope, ts: Date.now() });
  } catch {
    // ignore
  }
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.localStorage.getItem(LS_KEYS.TOKEN) ||
      window.sessionStorage.getItem(LS_KEYS.TOKEN) ||
      null
    );
  } catch {
    return null;
  }
}

let inMemoryAuthToken: string | null = readStoredToken();

export function setAuthToken(token: string | null, rememberMe = true): void {
  inMemoryAuthToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      if (rememberMe) {
        window.localStorage.setItem(LS_KEYS.TOKEN, token);
        window.sessionStorage.removeItem(LS_KEYS.TOKEN);
      } else {
        window.sessionStorage.setItem(LS_KEYS.TOKEN, token);
        window.localStorage.removeItem(LS_KEYS.TOKEN);
      }
    } else {
      window.localStorage.removeItem(LS_KEYS.TOKEN);
      window.sessionStorage.removeItem(LS_KEYS.TOKEN);
    }
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  if (!inMemoryAuthToken) {
    inMemoryAuthToken = readStoredToken();
  }
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

function loadInitialCache(): StoreCache {
  const storedSettings = safeReadJson<SchoolSettings | null>(LS_KEYS.SETTINGS, null);
  const storedProfiles = safeReadJson<AlumniProfile[]>(LS_KEYS.PROFILES, []).map(normalizeProfile);
  const storedCareerStats = safeReadJson<PublicCareerStat[]>(LS_KEYS.CAREER_STATS, []);
  const storedPublicJobs = safeReadJson<JobPosting[]>(LS_KEYS.PUBLIC_JOBS, []);
  const storedCurrentUser = safeReadJson<User | null>(LS_KEYS.CURRENT_USER, null);

  return {
    users: safeReadJson<User[]>(LS_KEYS.USERS, []).map(normalizeUser),
    currentUser: storedCurrentUser ? normalizeUser(storedCurrentUser) : null,
    profiles: storedProfiles,
    careerStats: storedCareerStats,
    histories: safeReadJson<CareerHistoryItem[]>(LS_KEYS.HISTORIES, []),
    documents: safeReadJson<DocumentFile[]>(LS_KEYS.DOCUMENTS, []),
    surveys: safeReadJson<TracerSurvey[]>(LS_KEYS.SURVEYS, []),
    questions: safeReadJson<TracerQuestion[]>(LS_KEYS.QUESTIONS, []),
    submissions: safeReadJson<TracerSubmission[]>(LS_KEYS.SUBMISSIONS, []),
    jobs: safeReadJson<JobPosting[]>(LS_KEYS.JOBS, []),
    publicJobs: storedPublicJobs,
    forum: safeReadJson<ForumPost[]>(LS_KEYS.FORUM, []),
    notifications: safeReadJson<NotificationItem[]>(LS_KEYS.NOTIFICATIONS, []),
    audit: safeReadJson<AuditLog[]>(LS_KEYS.AUDIT, []),
    settings: normalizeSettings(storedSettings),
    guruBk: safeReadJson<GuruBkProfile[]>(LS_KEYS.GURU_BK, [...INITIAL_GURU_BK_PROFILES]),
    emailLogs: safeReadJson<EmailNotificationLog[]>(LS_KEYS.EMAIL_LOGS, []),
    hasPublicStats: storedCareerStats.length > 0,
    hasPublicJobs: storedPublicJobs.length > 0,
  };
}

const cache: StoreCache = loadInitialCache();

let sseSource: EventSource | null = null;
let publicStarted = false;
let authActive = false;
let serverIsPersistent = true;

function getSettingsMeta(): SettingsMeta {
  return safeReadJson<SettingsMeta>(LS_KEYS.SETTINGS_META, {
    updatedAt: 0,
    customized: false,
    syncedToServer: true,
  });
}

function setSettingsMeta(meta: SettingsMeta): void {
  safeWriteJson(LS_KEYS.SETTINGS_META, meta);
}

function getProfileEdits(): Record<string, ProfileLocalEdit> {
  return safeReadJson<Record<string, ProfileLocalEdit>>(LS_KEYS.PROFILE_EDITS, {});
}

function setProfileEdits(edits: Record<string, ProfileLocalEdit>): void {
  safeWriteJson(LS_KEYS.PROFILE_EDITS, edits);
}

function mergeServerProfilesWithLocalEdits(serverProfiles: AlumniProfile[], persistent: boolean): AlumniProfile[] {
  const edits = getProfileEdits();
  const normalizedServer = serverProfiles.map(normalizeProfile);
  const now = Date.now();
  const serverIds = new Set(normalizedServer.map((p) => p.id));

  const merged = normalizedServer.map((srv) => {
    const localEdit = edits[String(srv.id)];
    if (!localEdit) return srv;
    // Keep local edit (especially uploaded photos!) if server is ephemeral OR edit hasn't synced yet OR occurred within 5 seconds
    const isFresh = now - localEdit.updatedAt < 5000;
    if (!persistent || !localEdit.syncedToServer || isFresh) {
      return normalizeProfile({ ...srv, ...localEdit.profile });
    }
    return srv;
  });

  // Preserve locally-created profiles that haven't been persisted on an ephemeral server
  for (const edit of Object.values(edits)) {
    if (!serverIds.has(edit.profile.id) && (!persistent || !edit.syncedToServer)) {
      merged.unshift(normalizeProfile(edit.profile));
    }
  }

  return merged;
}

function shouldAcceptServerSettings(serverSettings: SchoolSettings, persistent: boolean): boolean {
  const meta = getSettingsMeta();
  const now = Date.now();
  const isFresh = now - meta.updatedAt < 5000;

  if (isFresh) return false;
  if (!persistent && meta.customized) return false;
  if (meta.customized && !meta.syncedToServer) {
    return false;
  }
  return Boolean(serverSettings);
}

function hydrateFromStorage(): void {
  const fresh = loadInitialCache();
  cache.users = fresh.users;
  cache.currentUser = fresh.currentUser;
  cache.profiles = fresh.profiles;
  cache.careerStats = fresh.careerStats;
  cache.histories = fresh.histories;
  cache.documents = fresh.documents;
  cache.surveys = fresh.surveys;
  cache.questions = fresh.questions;
  cache.submissions = fresh.submissions;
  cache.jobs = fresh.jobs;
  cache.publicJobs = fresh.publicJobs;
  cache.forum = fresh.forum;
  cache.notifications = fresh.notifications;
  cache.audit = fresh.audit;
  cache.settings = fresh.settings;
  cache.guruBk = fresh.guruBk;
  cache.emailLogs = fresh.emailLogs;
  cache.hasPublicStats = fresh.hasPublicStats;
  cache.hasPublicJobs = fresh.hasPublicJobs;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('alumnitrack_')) {
      hydrateFromStorage();
      emitAuthChanged();
      emitDataChanged();
    }
  });
  broadcastChannel?.addEventListener('message', () => {
    hydrateFromStorage();
    emitAuthChanged();
    emitDataChanged();
  });
}

export async function refreshPublicLandingData(): Promise<void> {
  try {
    const res = await fetch('/api/public/landing');
    if (!res.ok) return;
    const data = await res.json();
    const persistent = data.persistent !== false;
    serverIsPersistent = persistent;

    if (data.settings && shouldAcceptServerSettings(data.settings, persistent)) {
      const normalized = normalizeSettings(data.settings);
      cache.settings = normalized;
      safeWriteJson(LS_KEYS.SETTINGS, normalized);
    }

    if (Array.isArray(data.publicCareerStats)) {
      const edits = getProfileEdits();
      const serverStats = data.publicCareerStats as PublicCareerStat[];
      if (!persistent && Object.keys(edits).length > 0) {
        const statMap = new Map(serverStats.map((s) => [s.alumni_id, s]));
        for (const edit of Object.values(edits)) {
          statMap.set(edit.profile.id, {
            alumni_id: edit.profile.id,
            status_karir: edit.profile.status_karir,
            angkatan: edit.profile.angkatan,
            jurusan: edit.profile.jurusan,
            updated_at: edit.profile.updated_at,
          });
        }
        cache.careerStats = Array.from(statMap.values());
      } else {
        cache.careerStats = serverStats;
      }
      cache.hasPublicStats = true;
      safeWriteJson(LS_KEYS.CAREER_STATS, cache.careerStats);
    }

    if (Array.isArray(data.publicJobs)) {
      cache.publicJobs = data.publicJobs;
      cache.hasPublicJobs = true;
      safeWriteJson(LS_KEYS.PUBLIC_JOBS, cache.publicJobs);
    }
    emitDataChanged();
  } catch (err) {
    console.error('Public landing fetch failed:', err);
  }
}

export async function refreshAuthenticatedData(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;
  try {
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const persistent = data.persistent !== false;
    serverIsPersistent = persistent;

    const mergedProfiles = Array.isArray(data.profiles)
      ? mergeServerProfilesWithLocalEdits(data.profiles, persistent)
      : cache.profiles;

    const profileByUserId = new Map(mergedProfiles.map((p) => [p.user_id, p]));

    cache.users = (Array.isArray(data.users) ? data.users : []).map((u: User) => {
      const normalized = normalizeUser(u);
      const matchedProfile = profileByUserId.get(normalized.id);
      if (matchedProfile && matchedProfile.avatar !== undefined) {
        return {
          ...normalized,
          name: matchedProfile.name || normalized.name,
          avatar: matchedProfile.avatar,
        };
      }
      return normalized;
    });

    cache.profiles = mergedProfiles;
    cache.histories = Array.isArray(data.histories) ? data.histories : [];
    cache.documents = Array.isArray(data.documents) ? data.documents : [];
    cache.surveys = Array.isArray(data.surveys) ? data.surveys : [];
    cache.questions = Array.isArray(data.questions) ? data.questions : [];
    cache.submissions = Array.isArray(data.submissions) ? data.submissions : [];
    cache.jobs = Array.isArray(data.jobs) ? data.jobs : [];
    cache.forum = Array.isArray(data.forum) ? data.forum : [];
    cache.notifications = Array.isArray(data.notifications) ? data.notifications : [];
    cache.audit = Array.isArray(data.audit) ? data.audit : [];
    if (data.settings && shouldAcceptServerSettings(data.settings, persistent)) {
      cache.settings = normalizeSettings(data.settings);
      safeWriteJson(LS_KEYS.SETTINGS, cache.settings);
    }
    if (Array.isArray(data.guruBk) && data.guruBk.length > 0) {
      cache.guruBk = data.guruBk;
      safeWriteJson(LS_KEYS.GURU_BK, cache.guruBk);
    }
    if (Array.isArray(data.emailLogs)) {
      cache.emailLogs = data.emailLogs;
      safeWriteJson(LS_KEYS.EMAIL_LOGS, cache.emailLogs);
    }

    safeWriteJson(LS_KEYS.USERS, cache.users);
    safeWriteJson(LS_KEYS.PROFILES, cache.profiles);
    safeWriteJson(LS_KEYS.HISTORIES, cache.histories);
    safeWriteJson(LS_KEYS.DOCUMENTS, cache.documents);
    safeWriteJson(LS_KEYS.SURVEYS, cache.surveys);
    safeWriteJson(LS_KEYS.QUESTIONS, cache.questions);
    safeWriteJson(LS_KEYS.SUBMISSIONS, cache.submissions);
    safeWriteJson(LS_KEYS.JOBS, cache.jobs);
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    safeWriteJson(LS_KEYS.NOTIFICATIONS, cache.notifications);
    safeWriteJson(LS_KEYS.AUDIT, cache.audit);

    if (cache.currentUser) {
      const freshSelf = cache.users.find((u) => u.id === cache.currentUser?.id);
      const ownProfile = profileByUserId.get(cache.currentUser.id);
      if (freshSelf || ownProfile) {
        cache.currentUser = normalizeUser({
          ...(freshSelf || cache.currentUser),
          name: ownProfile?.name || freshSelf?.name || cache.currentUser.name,
          avatar:
            ownProfile?.avatar !== undefined
              ? ownProfile.avatar
              : freshSelf?.avatar ?? cache.currentUser.avatar,
        });
        safeWriteJson(LS_KEYS.CURRENT_USER, cache.currentUser);
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
        if (authActive && getAuthToken()) {
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
  setAuthToken(null);
  cache.users = [];
  cache.currentUser = null;
  cache.histories = [];
  cache.documents = [];
  cache.submissions = [];
  cache.audit = [];
  cache.notifications = [];
  cache.emailLogs = [];
  safeRemoveKey(LS_KEYS.CURRENT_USER);
  safeRemoveKey(LS_KEYS.USERS);
  safeRemoveKey(LS_KEYS.AUDIT);
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
  onAfterSuccess?: (resData?: any) => void,
  options?: { preserveLocalOnFailure?: boolean }
): Promise<boolean> {
  const token = getAuthToken();
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
      const errMsg = errData?.error || errData?.message || `HTTP ${res.status}`;
      const isAuthReject = res.status === 401 || res.status === 403;
      if (options?.preserveLocalOnFailure && (!isAuthReject || errData?.ephemeralMiss)) {
        return false;
      }
      throw new Error(errMsg);
    }
    const resData = await res.json().catch(() => undefined);
    onAfterSuccess?.(resData);
    return true;
  } catch (err: any) {
    console.error(`API ${method} ${url} failed:`, err);
    if (!options?.preserveLocalOnFailure) {
      emitSyncErrorToast(err?.message || 'Gagal menyimpan perubahan ke database.');
      void refreshAuthenticatedData();
      void refreshPublicLandingData();
    }
    return false;
  }
}

export const StorageService = {
  getAuthToken,
  setAuthToken,
  isServerPersistent: (): boolean => serverIsPersistent,

  // --- PUBLIC REAL-TIME LANDING PAGE STATS ---
  getPublicCareerStats: (): PublicCareerStat[] => {
    if (cache.hasPublicStats && cache.careerStats.length > 0) {
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
    cache.currentUser = user ? normalizeUser(user) : null;
    if (cache.currentUser) {
      safeWriteJson(LS_KEYS.CURRENT_USER, cache.currentUser);
    } else {
      safeRemoveKey(LS_KEYS.CURRENT_USER);
    }
    emitAuthChanged();
    notifyOtherTabs('auth');
  },

  toggleUserActive: (userId: number): User | undefined => {
    const target = cache.users.find((u) => u.id === userId);
    if (!target) return undefined;
    const updated = { ...target, isActive: !target.isActive };
    cache.users = cache.users.map((u) => (u.id === userId ? updated : u));
    safeWriteJson(LS_KEYS.USERS, cache.users);
    emitDataChanged();
    notifyOtherTabs('users');

    void apiMutate('PUT', `/api/users/${userId}/status`, { isActive: updated.isActive }, undefined, {
      preserveLocalOnFailure: true,
    });
    return updated;
  },

  // --- ALUMNI PROFILES ---
  getAlumniList: (): AlumniProfile[] =>
    cache.profiles.length > 0 ? cache.profiles : INITIAL_ALUMNI_PROFILES.map(normalizeProfile),

  getAlumniById: (id: number): AlumniProfile | undefined => {
    return StorageService.getAlumniList().find((a) => a.id === id);
  },

  getAlumniByUserId: (
    userId: number,
    userEmail?: string,
    userNisn?: string
  ): AlumniProfile | undefined => {
    const list = StorageService.getAlumniList();
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
    const currentList = StorageService.getAlumniList();
    const updated: AlumniProfile = normalizeProfile({
      ...alumni,
      id: alumni.id && alumni.id > 0 ? alumni.id : nextNumericId(currentList.map((p) => p.id)),
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
    });
    delete updated.password;

    const baseProfiles = cache.profiles.length > 0 ? cache.profiles : currentList;
    const idx = baseProfiles.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      cache.profiles = baseProfiles.map((p) => (p.id === updated.id ? updated : p));
    } else {
      cache.profiles = [updated, ...baseProfiles];
    }
    safeWriteJson(LS_KEYS.PROFILES, cache.profiles);

    const edits = getProfileEdits();
    edits[String(updated.id)] = {
      profile: updated,
      updatedAt: Date.now(),
      syncedToServer: false,
    };
    setProfileEdits(edits);

    // Keep public stats in sync locally
    const statIdx = cache.careerStats.findIndex((s) => s.alumni_id === updated.id);
    const updatedStat: PublicCareerStat = {
      alumni_id: updated.id,
      status_karir: updated.status_karir,
      angkatan: updated.angkatan,
      jurusan: updated.jurusan,
      updated_at: updated.updated_at,
    };
    if (statIdx >= 0) {
      cache.careerStats = cache.careerStats.map((s) =>
        s.alumni_id === updated.id ? updatedStat : s
      );
    } else {
      cache.careerStats = [updatedStat, ...cache.careerStats];
    }
    cache.hasPublicStats = true;
    safeWriteJson(LS_KEYS.CAREER_STATS, cache.careerStats);

    if (
      cache.currentUser &&
      (cache.currentUser.id === updated.user_id ||
        cache.currentUser.email.toLowerCase() === updated.email.toLowerCase())
    ) {
      cache.currentUser = normalizeUser({
        ...cache.currentUser,
        name: updated.name,
        nisn: updated.nisn,
        avatar: updated.avatar !== undefined ? updated.avatar : cache.currentUser.avatar,
      });
      safeWriteJson(LS_KEYS.CURRENT_USER, cache.currentUser);
      emitAuthChanged();
    }

    cache.users = cache.users.map((u) =>
      u.id === updated.user_id || u.email.toLowerCase() === updated.email.toLowerCase()
        ? {
            ...u,
            name: updated.name,
            nisn: updated.nisn,
            avatar: updated.avatar !== undefined ? updated.avatar : u.avatar,
          }
        : u
    );
    safeWriteJson(LS_KEYS.USERS, cache.users);

    emitDataChanged();
    notifyOtherTabs('profiles');

    void apiMutate(
      'PUT',
      '/api/alumni',
      updated,
      () => {
        if (serverIsPersistent) {
          const latestEdits = getProfileEdits();
          if (latestEdits[String(updated.id)]) {
            latestEdits[String(updated.id)] = {
              ...latestEdits[String(updated.id)],
              syncedToServer: true,
            };
            setProfileEdits(latestEdits);
          }
        }
        void refreshAuthenticatedData();
        void refreshPublicLandingData();
      },
      { preserveLocalOnFailure: true }
    );

    return updated;
  },

  deleteAlumni: (id: number): boolean => {
    const list = StorageService.getAlumniList();
    const exists = list.some((p) => p.id === id);
    if (!exists) return false;
    cache.profiles = list.filter((p) => p.id !== id);
    cache.careerStats = cache.careerStats.filter((s) => s.alumni_id !== id);
    safeWriteJson(LS_KEYS.PROFILES, cache.profiles);
    safeWriteJson(LS_KEYS.CAREER_STATS, cache.careerStats);

    const edits = getProfileEdits();
    delete edits[String(id)];
    setProfileEdits(edits);

    emitDataChanged();
    notifyOtherTabs('profiles');

    void apiMutate('DELETE', `/api/alumni/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
    return true;
  },

  deleteMultipleAlumni: (ids: number[]): number => {
    const idSet = new Set(ids);
    const list = StorageService.getAlumniList();
    const toDelete = list.filter((a) => idSet.has(a.id));
    if (toDelete.length === 0) return 0;

    cache.profiles = list.filter((a) => !idSet.has(a.id));
    cache.careerStats = cache.careerStats.filter((s) => !idSet.has(s.alumni_id));
    cache.histories = cache.histories.filter((h) => !idSet.has(h.alumni_id));
    cache.documents = cache.documents.filter((d) => !idSet.has(d.alumni_id));
    safeWriteJson(LS_KEYS.PROFILES, cache.profiles);
    safeWriteJson(LS_KEYS.CAREER_STATS, cache.careerStats);
    safeWriteJson(LS_KEYS.HISTORIES, cache.histories);
    safeWriteJson(LS_KEYS.DOCUMENTS, cache.documents);

    const edits = getProfileEdits();
    for (const id of ids) delete edits[String(id)];
    setProfileEdits(edits);

    emitDataChanged();
    notifyOtherTabs('profiles');

    void apiMutate('POST', '/api/alumni/batch-delete', { ids }, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.HISTORIES, cache.histories);
    emitDataChanged();

    void apiMutate('PUT', '/api/histories', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  deleteCareerHistory: (id: number): void => {
    cache.histories = cache.histories.filter((h) => h.id !== id);
    safeWriteJson(LS_KEYS.HISTORIES, cache.histories);
    emitDataChanged();
    void apiMutate('DELETE', `/api/histories/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  // --- DOCUMENTS ---
  getDocuments: (alumniId: number): DocumentFile[] => {
    return cache.documents.filter((d) => d.alumni_id === alumniId);
  },

  saveDocument: (docItem: Omit<DocumentFile, 'id'>): DocumentFile => {
    const newId = nextNumericId(cache.documents.map((d) => d.id));
    const saved: DocumentFile = { ...docItem, id: newId };
    cache.documents = [...cache.documents, saved];
    safeWriteJson(LS_KEYS.DOCUMENTS, cache.documents);
    emitDataChanged();

    void apiMutate('POST', '/api/documents', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  deleteDocument: (id: number): void => {
    cache.documents = cache.documents.filter((d) => d.id !== id);
    safeWriteJson(LS_KEYS.DOCUMENTS, cache.documents);
    emitDataChanged();
    void apiMutate('DELETE', `/api/documents/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
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
    const base = cache.surveys.length > 0 ? cache.surveys : INITIAL_TRACER_SURVEYS;
    const idx = base.findIndex((s) => s.id === newId);
    if (idx >= 0) {
      cache.surveys = base.map((s) => (s.id === newId ? saved : s));
    } else {
      cache.surveys = [...base, saved];
    }
    safeWriteJson(LS_KEYS.SURVEYS, cache.surveys);
    emitDataChanged();

    void apiMutate('PUT', '/api/surveys', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  getQuestions: (surveyId: number): TracerQuestion[] => {
    const source = cache.questions.length > 0 ? cache.questions : INITIAL_TRACER_QUESTIONS;
    return source.filter((q) => q.survey_id === surveyId).sort((a, b) => a.order - b.order);
  },

  saveQuestion: (question: TracerQuestion): TracerQuestion => {
    const base = cache.questions.length > 0 ? cache.questions : INITIAL_TRACER_QUESTIONS;
    const newId =
      question.id && question.id > 0
        ? question.id
        : nextNumericId(base.map((q) => q.id));
    const saved: TracerQuestion = { ...question, id: newId };
    const idx = base.findIndex((q) => q.id === newId);
    if (idx >= 0) {
      cache.questions = base.map((q) => (q.id === newId ? saved : q));
    } else {
      cache.questions = [...base, saved];
    }
    safeWriteJson(LS_KEYS.QUESTIONS, cache.questions);
    emitDataChanged();

    void apiMutate('PUT', '/api/questions', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  deleteQuestion: (id: number): void => {
    const base = cache.questions.length > 0 ? cache.questions : INITIAL_TRACER_QUESTIONS;
    cache.questions = base.filter((q) => q.id !== id);
    safeWriteJson(LS_KEYS.QUESTIONS, cache.questions);
    emitDataChanged();
    void apiMutate('DELETE', `/api/questions/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  deleteMultipleQuestions: (ids: number[]): number => {
    const idSet = new Set(ids);
    const base = cache.questions.length > 0 ? cache.questions : INITIAL_TRACER_QUESTIONS;
    const toDelete = base.filter((q) => idSet.has(q.id));
    if (toDelete.length === 0) return 0;
    cache.questions = base.filter((q) => !idSet.has(q.id));
    safeWriteJson(LS_KEYS.QUESTIONS, cache.questions);
    emitDataChanged();

    void apiMutate('POST', '/api/questions/batch-delete', { ids }, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.SUBMISSIONS, cache.submissions);

    const alumni = StorageService.getAlumniById(sub.alumni_id);
    if (alumni) {
      const updatedProfiles = StorageService.getAlumniList().map((p) =>
        p.id === alumni.id ? { ...p, status_tracer: saved.status } : p
      );
      cache.profiles = updatedProfiles;
      safeWriteJson(LS_KEYS.PROFILES, cache.profiles);
    }
    emitDataChanged();

    void apiMutate('POST', '/api/submissions', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  // --- JOBS & EVENTS ---
  getJobs: (): JobPosting[] => {
    if (cache.jobs.length > 0) return cache.jobs;
    if (cache.hasPublicJobs) return cache.publicJobs;
    return INITIAL_JOB_POSTINGS;
  },

  saveJob: (job: JobPosting): JobPosting => {
    const base = StorageService.getJobs();
    const newId = job.id && job.id > 0 ? job.id : nextNumericId(base.map((j) => j.id));
    const saved: JobPosting = {
      ...job,
      id: newId,
      created_at: job.created_at || new Date().toISOString().split('T')[0],
    };
    const idx = base.findIndex((j) => j.id === newId);
    if (idx >= 0) {
      cache.jobs = base.map((j) => (j.id === newId ? saved : j));
    } else {
      cache.jobs = [saved, ...base];
    }
    safeWriteJson(LS_KEYS.JOBS, cache.jobs);
    cache.publicJobs = cache.jobs.filter((j) => j.status === 'Published');
    cache.hasPublicJobs = true;
    safeWriteJson(LS_KEYS.PUBLIC_JOBS, cache.publicJobs);
    emitDataChanged();
    notifyOtherTabs('jobs');

    void apiMutate('PUT', '/api/jobs', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  deleteJob: (id: number): void => {
    const base = StorageService.getJobs();
    cache.jobs = base.filter((j) => j.id !== id);
    cache.publicJobs = cache.jobs.filter((j) => j.status === 'Published');
    safeWriteJson(LS_KEYS.JOBS, cache.jobs);
    safeWriteJson(LS_KEYS.PUBLIC_JOBS, cache.publicJobs);
    emitDataChanged();
    notifyOtherTabs('jobs');
    void apiMutate('DELETE', `/api/jobs/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  deleteMultipleJobs: (ids: number[]): number => {
    const idSet = new Set(ids);
    const base = StorageService.getJobs();
    const toDelete = base.filter((j) => idSet.has(j.id));
    if (toDelete.length === 0) return 0;
    cache.jobs = base.filter((j) => !idSet.has(j.id));
    cache.publicJobs = cache.jobs.filter((j) => j.status === 'Published');
    safeWriteJson(LS_KEYS.JOBS, cache.jobs);
    safeWriteJson(LS_KEYS.PUBLIC_JOBS, cache.publicJobs);
    emitDataChanged();
    notifyOtherTabs('jobs');

    void apiMutate('POST', '/api/jobs/batch-delete', { ids }, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    emitDataChanged();

    void apiMutate(
      'POST',
      '/api/forum',
      saved,
      () => {
        void refreshAuthenticatedData();
      },
      { preserveLocalOnFailure: true }
    );
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
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    emitDataChanged();

    void apiMutate('POST', `/api/forum/${postId}/like`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    emitDataChanged();

    void apiMutate(
      'POST',
      `/api/forum/${postId}/comment`,
      { content: comment.content },
      undefined,
      { preserveLocalOnFailure: true }
    );
  },

  toggleLockPost: (postId: number): void => {
    const post = cache.forum.find((p) => p.id === postId);
    if (!post) return;
    cache.forum = cache.forum.map((p) =>
      p.id === postId ? { ...p, is_locked: !p.is_locked } : p
    );
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    emitDataChanged();
    void apiMutate('POST', `/api/forum/${postId}/lock`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  deletePost: (postId: number): void => {
    cache.forum = cache.forum.filter((p) => p.id !== postId);
    safeWriteJson(LS_KEYS.FORUM, cache.forum);
    emitDataChanged();
    void apiMutate('DELETE', `/api/forum/${postId}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  // --- NOTIFICATIONS ---
  getNotifications: (): NotificationItem[] => cache.notifications,

  markNotificationAsRead: (id: number): void => {
    cache.notifications = cache.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
    safeWriteJson(LS_KEYS.NOTIFICATIONS, cache.notifications);
    emitDataChanged();
    void apiMutate('POST', `/api/notifications/read/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  markAllNotificationsAsRead: (): void => {
    cache.notifications = cache.notifications.map((n) => ({ ...n, is_read: true }));
    safeWriteJson(LS_KEYS.NOTIFICATIONS, cache.notifications);
    emitDataChanged();
    void apiMutate('POST', '/api/notifications/read-all', undefined, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.NOTIFICATIONS, cache.notifications);
    emitDataChanged();

    void apiMutate(
      'POST',
      '/api/notifications/broadcast',
      { title, message, target_role },
      undefined,
      { preserveLocalOnFailure: true }
    );
  },

  // --- AUDIT LOGS ---
  getAuditLogs: (): AuditLog[] => cache.audit,

  addAuditLog: (userName: string, userRole: string, activity: string): void => {
    if (!getAuthToken()) return;
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
    safeWriteJson(LS_KEYS.AUDIT, cache.audit);
    emitDataChanged();

    void apiMutate('POST', '/api/audit', { activity }, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  deleteAuditLog: (id: number): boolean => {
    const exists = cache.audit.some((l) => l.id === id);
    if (!exists) return false;
    cache.audit = cache.audit.filter((l) => l.id !== id);
    safeWriteJson(LS_KEYS.AUDIT, cache.audit);
    emitDataChanged();
    void apiMutate('DELETE', `/api/audit/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
    return true;
  },

  deleteMultipleAuditLogs: (ids: number[]): number => {
    const idSet = new Set(ids);
    const toDelete = cache.audit.filter((l) => idSet.has(l.id));
    if (toDelete.length === 0) return 0;
    cache.audit = cache.audit.filter((l) => !idSet.has(l.id));
    safeWriteJson(LS_KEYS.AUDIT, cache.audit);
    emitDataChanged();
    void apiMutate('POST', '/api/audit/batch-delete', { ids }, undefined, {
      preserveLocalOnFailure: true,
    });
    return toDelete.length;
  },

  clearAllAuditLogs: (): void => {
    cache.audit = [];
    safeWriteJson(LS_KEYS.AUDIT, cache.audit);
    emitDataChanged();
    void apiMutate('DELETE', '/api/audit', undefined, undefined, {
      preserveLocalOnFailure: true,
    });
  },

  // --- SCHOOL SETTINGS ---
  getSchoolSettings: (): SchoolSettings => cache.settings,

  saveSchoolSettings: (settings: SchoolSettings): SchoolSettings => {
    const normalized = normalizeSettings(settings);
    cache.settings = normalized;
    safeWriteJson(LS_KEYS.SETTINGS, normalized);
    setSettingsMeta({
      updatedAt: Date.now(),
      customized: true,
      syncedToServer: false,
    });
    emitDataChanged();
    notifyOtherTabs('settings');

    void apiMutate(
      'PUT',
      '/api/settings',
      normalized,
      () => {
        if (serverIsPersistent) {
          setSettingsMeta({
            updatedAt: Date.now(),
            customized: true,
            syncedToServer: true,
          });
        }
      },
      { preserveLocalOnFailure: true }
    );
    return normalized;
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
    safeWriteJson(LS_KEYS.GURU_BK, cache.guruBk);
    emitDataChanged();
    notifyOtherTabs('guruBk');

    void apiMutate('PUT', '/api/guru-bk', saved, undefined, { preserveLocalOnFailure: true });
    return saved;
  },

  setDefaultGuruBkProfile: (id: number): void => {
    cache.guruBk = StorageService.getGuruBkProfiles().map((g) => ({
      ...g,
      is_default: g.id === id,
    }));
    safeWriteJson(LS_KEYS.GURU_BK, cache.guruBk);
    emitDataChanged();
    notifyOtherTabs('guruBk');
    void apiMutate('POST', `/api/guru-bk/${id}/default`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
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
    safeWriteJson(LS_KEYS.GURU_BK, cache.guruBk);
    emitDataChanged();
    notifyOtherTabs('guruBk');
    void apiMutate('DELETE', `/api/guru-bk/${id}`, undefined, undefined, {
      preserveLocalOnFailure: true,
    });
    return true;
  },

  // --- EMAIL LOGS ---
  getEmailLogs: (): EmailNotificationLog[] => cache.emailLogs,

  saveEmailLog: (log: EmailNotificationLog): void => {
    cache.emailLogs = [log, ...cache.emailLogs].slice(0, 200);
    safeWriteJson(LS_KEYS.EMAIL_LOGS, cache.emailLogs);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('alumnitrack_emails_changed'));
    }
    if (getAuthToken()) {
      void apiMutate('POST', '/api/email-logs', log, undefined, { preserveLocalOnFailure: true });
    }
  },
};
