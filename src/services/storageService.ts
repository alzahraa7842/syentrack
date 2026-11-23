import { 
  User, 
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
  GuruBkProfile
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_ALUMNI_PROFILES, 
  INITIAL_CAREER_HISTORIES, 
  INITIAL_DOCUMENTS, 
  INITIAL_TRACER_SURVEYS, 
  INITIAL_TRACER_QUESTIONS, 
  INITIAL_JOB_POSTINGS, 
  INITIAL_FORUM_POSTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_GURU_BK_PROFILES
} from '../data/initialData';
import { AVATAR_COWO, AVATAR_CEWE } from '../constants/avatars';

const STORAGE_KEYS = {
  USERS: 'alumnitrack_users',
  PROFILES: 'alumnitrack_profiles',
  HISTORIES: 'alumnitrack_histories',
  DOCUMENTS: 'alumnitrack_documents',
  SURVEYS: 'alumnitrack_surveys',
  QUESTIONS: 'alumnitrack_questions',
  SUBMISSIONS: 'alumnitrack_submissions',
  JOBS: 'alumnitrack_jobs',
  FORUM: 'alumnitrack_forum',
  NOTIFICATIONS: 'alumnitrack_notifications',
  AUDIT: 'alumnitrack_audit',
  SETTINGS: 'alumnitrack_settings',
  GURU_BK: 'alumnitrack_guru_bk',
  AUTH_TOKEN: 'alumnitrack_token',
  AUTH_USER: 'alumnitrack_current_user',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('alumnitrack_data_changed'));
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
  }
}

// Initializer to ensure storage is populated
export function initStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_ALUMNI_PROFILES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.HISTORIES)) {
    localStorage.setItem(STORAGE_KEYS.HISTORIES, JSON.stringify(INITIAL_CAREER_HISTORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SURVEYS)) {
    localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(INITIAL_TRACER_SURVEYS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_TRACER_QUESTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.JOBS)) {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOB_POSTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.FORUM)) {
    localStorage.setItem(STORAGE_KEYS.FORUM, JSON.stringify(INITIAL_FORUM_POSTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SCHOOL_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.GURU_BK)) {
    localStorage.setItem(STORAGE_KEYS.GURU_BK, JSON.stringify(INITIAL_GURU_BK_PROFILES));
  }

  // Ensure stored jobs have images updated if missing
  try {
    const rawJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (rawJobs) {
      const storedJobs: JobPosting[] = JSON.parse(rawJobs);
      let jobsUpdated = false;
      storedJobs.forEach(job => {
        const initialJob = INITIAL_JOB_POSTINGS.find(ij => ij.id === job.id);
        if (initialJob?.image && !job.image) {
          job.image = initialJob.image;
          jobsUpdated = true;
        }
      });
      if (jobsUpdated) {
        localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(storedJobs));
      }
    }
  } catch (e) {
    console.error('Error synchronizing jobs images:', e);
  }

  // 1. Sanitize any existing stored alumni data to ensure no "TKJ" exists anywhere
  try {
    const rawProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (rawProfiles) {
      const profiles: AlumniProfile[] = JSON.parse(rawProfiles);
      let changed = false;
      profiles.forEach(p => {
        if (p.jurusan && p.jurusan.toUpperCase().includes('TKJ')) {
          p.jurusan = 'PPLG';
          changed = true;
        }
      });
      // 1.1 Helper to map name to Cowo / Cewe avatar
      const getCharacterAvatar = (name: string, currentAvatar?: string) => {
        if (currentAvatar && (currentAvatar === AVATAR_COWO || currentAvatar === AVATAR_CEWE)) {
          return currentAvatar;
        }
        const femaleNames = ['siti', 'anisa', 'maya', 'zahra', 'dewi', 'rahayu', 'putri', 'nabila', 'kartika', 'lestari', 'nurhaliza'];
        const lower = (name || '').toLowerCase();
        return femaleNames.some(fn => lower.includes(fn)) ? AVATAR_CEWE : AVATAR_COWO;
      };

      // 1.2 Sanitize avatars in profiles (preserve custom photos & explicitly cleared '')
      profiles.forEach(p => {
        if (p.avatar === undefined || p.avatar === null || p.avatar.includes('unsplash.com')) {
          p.avatar = getCharacterAvatar(p.name, p.avatar);
          changed = true;
        }
      });

      // Also merge any new seed profiles (e.g. Bisnis Ritel or Alzahra) if not yet present in stored data
      INITIAL_ALUMNI_PROFILES.forEach((initAlum: AlumniProfile) => {
        const alreadyExists = profiles.some(p => 
          (initAlum.nisn && p.nisn === initAlum.nisn) || 
          p.id === initAlum.id ||
          (initAlum.email && p.email && p.email.toLowerCase() === initAlum.email.toLowerCase())
        );
        if (!alreadyExists) {
          profiles.push(initAlum);
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      }
    }
  } catch (e) {
    console.error('Error cleaning TKJ or seeding:', e);
  }

  // 2. Synchronize all alumni profiles with users table so every single alumni can log in immediately
  try {
    const rawProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (rawProfiles && rawUsers) {
      const profiles: AlumniProfile[] = JSON.parse(rawProfiles);
      const users: User[] = JSON.parse(rawUsers);
      let usersChanged = false;

      const getCharacterAvatar = (name: string, currentAvatar?: string) => {
        if (currentAvatar && (currentAvatar === AVATAR_COWO || currentAvatar === AVATAR_CEWE)) {
          return currentAvatar;
        }
        const femaleNames = ['siti', 'anisa', 'maya', 'zahra', 'dewi', 'rahayu', 'putri', 'nabila', 'kartika', 'lestari', 'nurhaliza'];
        const lower = (name || '').toLowerCase();
        return femaleNames.some(fn => lower.includes(fn)) ? AVATAR_CEWE : AVATAR_COWO;
      };

      // Update admin user to "Guru BK" and clean placeholder avatars (preserve custom photos)
      users.forEach(u => {
        if (u.role === 'ADMIN' || u.email === 'admin@sekolah.sch.id' || u.name.includes('Hendro') || u.name.includes('Drs.')) {
          if (u.name !== 'Guru BK') {
            u.name = 'Guru BK';
            usersChanged = true;
          }
          if (u.avatar === undefined || u.avatar === null || u.avatar.includes('unsplash.com')) {
            u.avatar = AVATAR_COWO;
            usersChanged = true;
          }
        } else if (u.avatar === undefined || u.avatar === null || u.avatar.includes('unsplash.com')) {
          u.avatar = getCharacterAvatar(u.name, u.avatar);
          usersChanged = true;
        }
      });

      // Update current logged-in user if exists (preserve custom photos)
      const rawAuth = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (rawAuth) {
        try {
          const authUser: User = JSON.parse(rawAuth);
          let authChanged = false;
          if (authUser.role === 'ADMIN' || authUser.name.includes('Hendro') || authUser.name.includes('Drs.')) {
            if (authUser.name !== 'Guru BK') {
              authUser.name = 'Guru BK';
              authChanged = true;
            }
            if (authUser.avatar === undefined || authUser.avatar === null || authUser.avatar.includes('unsplash.com')) {
              authUser.avatar = AVATAR_COWO;
              authChanged = true;
            }
          } else if (authUser.avatar === undefined || authUser.avatar === null || authUser.avatar.includes('unsplash.com')) {
            authUser.avatar = getCharacterAvatar(authUser.name, authUser.avatar);
            authChanged = true;
          }
          if (authChanged) {
            localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(authUser));
          }
        } catch {
          // ignore
        }
      }

      // Ensure all INITIAL_USERS exist in users array
      INITIAL_USERS.forEach(initUser => {
        const found = users.find(u => 
          (initUser.email && u.email && u.email.trim().toLowerCase() === initUser.email.trim().toLowerCase()) ||
          (initUser.nisn && u.nisn && u.nisn.trim().toLowerCase() === initUser.nisn.trim().toLowerCase())
        );
        if (!found) {
          users.push({
            ...initUser,
            password: initUser.password || (initUser.role === 'ADMIN' ? 'Admin123!' : 'Alumni123!')
          });
          usersChanged = true;
        }
      });

      profiles.forEach(alumni => {
        const cleanEmail = alumni.email.trim().toLowerCase();
        const cleanNisn = alumni.nisn ? alumni.nisn.trim().toLowerCase() : '';

        const existingUser = users.find(u =>
          (u.email && u.email.trim().toLowerCase() === cleanEmail) ||
          (cleanNisn && u.nisn && u.nisn.trim().toLowerCase() === cleanNisn) ||
          (alumni.user_id && u.id === alumni.user_id)
        );

        if (!existingUser) {
          const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 100;
          const assignedId = alumni.user_id || maxId + 1;
          alumni.user_id = assignedId;
          users.push({
            id: assignedId,
            name: alumni.name,
            email: alumni.email,
            nisn: alumni.nisn,
            role: 'ALUMNI',
            avatar: alumni.avatar || getCharacterAvatar(alumni.name),
            created_at: alumni.created_at || new Date().toISOString(),
            isActive: true,
            password: alumni.password || 'Alumni123!'
          });
          usersChanged = true;
        } else {
          if (!existingUser.password) {
            existingUser.password = alumni.password || 'Alumni123!';
            usersChanged = true;
          }
          if (alumni.user_id !== existingUser.id) {
            alumni.user_id = existingUser.id;
          }
        }
      });

      if (usersChanged) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      }
    }
  } catch (e) {
    console.error('Error syncing alumni users:', e);
  }
}

// Ensure initialization happens immediately
initStorage();

export const StorageService = {
  // --- USERS & AUTH ---
  getUsers: (): User[] => getItem(STORAGE_KEYS.USERS, INITIAL_USERS),
  
  findUserByEmailOrNISN: (identifier: string): User | undefined => {
    const users = StorageService.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    
    // 1. Search in users table
    const matchedUser = users.find(u => 
      (u.email && u.email.trim().toLowerCase() === cleanId) || 
      (u.nisn && u.nisn.trim().toLowerCase() === cleanId)
    );
    if (matchedUser) {
      return matchedUser;
    }

    // 2. If not found in users table, search in alumni profiles (fallback guarantee for newly added/imported alumni)
    const alumniList = StorageService.getAlumniList();
    const matchedAlumni = alumniList.find(a =>
      (a.email && a.email.trim().toLowerCase() === cleanId) || 
      (a.nisn && a.nisn.trim().toLowerCase() === cleanId)
    );

    if (matchedAlumni) {
      // Auto-register user account for this alumni using non-colliding ID
      const maxId = Math.max(100, ...users.map(u => u.id), ...alumniList.map(a => a.user_id || 0));
      const assignedId =
        matchedAlumni.user_id && !users.some(u => u.id === matchedAlumni.user_id)
          ? matchedAlumni.user_id
          : maxId + 1;
      matchedAlumni.user_id = assignedId;

      const newUser: User = {
        id: assignedId,
        name: matchedAlumni.name,
        email: matchedAlumni.email,
        nisn: matchedAlumni.nisn,
        role: 'ALUMNI',
        avatar: matchedAlumni.avatar ?? '',
        created_at: new Date().toISOString(),
        isActive: true,
        password: matchedAlumni.password || 'Alumni123!'
      };
      users.push(newUser);
      setItem(STORAGE_KEYS.USERS, users);
      setItem(STORAGE_KEYS.PROFILES, alumniList);
      return newUser;
    }

    return undefined;
  },

  updateUserPassword: (userId: number, newPassword: string): void => {
    const users = StorageService.getUsers();
    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx >= 0) {
      users[uIdx].password = newPassword;
      setItem(STORAGE_KEYS.USERS, users);
    }
  },

  registerAlumni: (data: {
    name: string;
    email: string;
    nisn?: string;
    angkatan?: number;
    jurusan?: string;
    phone?: string;
    password: string;
    avatar?: string;
    receive_email_notifications?: boolean;
  }): { success: boolean; message: string; user?: User } => {
    const users = StorageService.getUsers();
    const profiles = StorageService.getAlumniList();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const providedNisn = (data.nisn || '').trim();

    if (!cleanEmail) {
      return {
        success: false,
        message: 'Alamat email wajib diisi untuk mendaftarkan akun baru.',
      };
    }

    // 1. STRICT GUARD: Never enter, overwrite, or hijack an existing account by email
    const emailExistsInUsers = users.some(
      u => u.email && u.email.trim().toLowerCase() === cleanEmail
    );
    const emailExistsInProfiles = profiles.some(
      p => p.email && p.email.trim().toLowerCase() === cleanEmail
    );
    if (emailExistsInUsers || emailExistsInProfiles) {
      return {
        success: false,
        message: 'Email ini sudah terdaftar pada akun yang sudah ada. Silakan masuk menggunakan akun Anda atau gunakan email lain.',
      };
    }

    // 2. STRICT GUARD: Never enter, overwrite, or hijack an existing account by NISN
    if (providedNisn) {
      const nisnExistsInUsers = users.some(
        u => u.nisn && u.nisn.trim().toLowerCase() === providedNisn.toLowerCase()
      );
      const nisnExistsInProfiles = profiles.some(
        p => p.nisn && p.nisn.trim().toLowerCase() === providedNisn.toLowerCase()
      );
      if (nisnExistsInUsers || nisnExistsInProfiles) {
        return {
          success: false,
          message: 'NISN ini sudah terdaftar pada akun yang sudah ada. Silakan masuk melalui halaman Login atau periksa kembali NISN Anda.',
        };
      }
    }

    // Generate a guaranteed-unique NISN if left blank
    let cleanNisn = providedNisn;
    if (!cleanNisn) {
      const existingNisns = new Set([
        ...users.map(u => (u.nisn || '').trim().toLowerCase()),
        ...profiles.map(p => (p.nisn || '').trim().toLowerCase()),
      ]);
      do {
        cleanNisn = `0059${Math.floor(100000 + Math.random() * 900000)}`;
      } while (existingNisns.has(cleanNisn.toLowerCase()));
    }

    const cleanName = (data.name || '').trim() || cleanEmail.split('@')[0] || 'Alumni';
    const cleanPassword = (data.password || '').trim();
    if (!cleanPassword) {
      return {
        success: false,
        message: 'Password wajib diisi.',
      };
    }
    const chosenAvatar = data.avatar !== undefined ? data.avatar : '';

    // 3. Allocate strictly brand-new, non-colliding IDs
    const maxProfileId = profiles.length > 0 ? Math.max(100, ...profiles.map(p => p.id)) : 100;
    const newProfileId = maxProfileId + 1;
    const maxUserId = Math.max(
      100,
      ...users.map(u => u.id),
      ...profiles.map(p => p.user_id || 0)
    );
    const newUserId = maxUserId + 1;

    const newProfile: AlumniProfile = {
      id: newProfileId,
      user_id: newUserId,
      name: cleanName,
      nisn: cleanNisn,
      angkatan: data.angkatan || 2025,
      jurusan: data.jurusan || 'PPLG',
      email: cleanEmail,
      phone: data.phone?.trim() || '0812-0000-0000',
      domisili: 'Jakarta',
      status_karir: 'Mencari Kerja',
      status_tracer: 'Belum Mengisi',
      privacy_setting: 'PUBLIC',
      avatar: chosenAvatar,
      receive_email_notifications: data.receive_email_notifications ?? true,
      password: cleanPassword,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0]
    };

    const newUser: User = {
      id: newUserId,
      name: cleanName,
      email: cleanEmail,
      nisn: cleanNisn,
      role: 'ALUMNI',
      avatar: chosenAvatar,
      created_at: new Date().toISOString(),
      isActive: true,
      receive_email_notifications: data.receive_email_notifications ?? true,
      password: cleanPassword
    };

    profiles.push(newProfile);
    users.push(newUser);
    setItem(STORAGE_KEYS.PROFILES, profiles);
    setItem(STORAGE_KEYS.USERS, users);

    return { 
      success: true, 
      message: 'Pendaftaran akun baru berhasil! Anda masuk ke akun baru Anda.', 
      user: newUser 
    };
  },

  getCurrentUser: (): User | null => {
    return getItem(STORAGE_KEYS.AUTH_USER, null);
  },

  setCurrentUser: (user: User | null, token?: string) => {
    if (user && token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    window.dispatchEvent(new Event('alumnitrack_auth_changed'));
  },

  getAuthToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  // --- ALUMNI PROFILES ---
  getAlumniList: (): AlumniProfile[] => {
    return getItem(STORAGE_KEYS.PROFILES, INITIAL_ALUMNI_PROFILES);
  },

  getAlumniById: (id: number): AlumniProfile | undefined => {
    const list = StorageService.getAlumniList();
    return list.find(a => a.id === id);
  },

  getAlumniByUserId: (userId: number, userEmail?: string, userNisn?: string): AlumniProfile | undefined => {
    const list = StorageService.getAlumniList();
    // 1. Direct match by user_id (verified against email when both exist to prevent cross-account mismatch)
    let profile = list.find(a => a.user_id === userId);
    if (profile) {
      const cleanUserEmail = userEmail?.trim().toLowerCase();
      const cleanProfileEmail = profile.email?.trim().toLowerCase();
      if (!cleanUserEmail || !cleanProfileEmail || cleanUserEmail === cleanProfileEmail) {
        return profile;
      }
    }

    // 2. Fallback search by email
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      profile = list.find(a => a.email && a.email.trim().toLowerCase() === cleanEmail);
      if (profile) {
        profile.user_id = userId;
        setItem(STORAGE_KEYS.PROFILES, list);
        return profile;
      }
    }

    // 3. Fallback search by NISN
    if (userNisn) {
      const cleanNisn = userNisn.trim().toLowerCase();
      profile = list.find(a => a.nisn && a.nisn.trim().toLowerCase() === cleanNisn);
      if (profile) {
        profile.user_id = userId;
        setItem(STORAGE_KEYS.PROFILES, list);
        return profile;
      }
    }

    return undefined;
  },

  saveAlumni: (alumni: AlumniProfile, customPassword?: string): AlumniProfile => {
    const list = StorageService.getAlumniList();
    const index = list.findIndex(a => a.id === alumni.id);
    alumni.updated_at = new Date().toISOString().split('T')[0];

    // Guarantee no TKJ is saved
    if (alumni.jurusan && alumni.jurusan.toUpperCase().includes('TKJ')) {
      alumni.jurusan = 'PPLG';
    }

    const assignedPassword = customPassword || alumni.password || 'Alumni123!';
    alumni.password = assignedPassword;
    
    // Ensure user_id exists
    const users = StorageService.getUsers();
    if (!alumni.user_id || alumni.user_id === 0) {
      const maxUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 100;
      alumni.user_id = maxUserId + 1;
    }

    if (index >= 0) {
      list[index] = alumni;
    } else {
      alumni.id = list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1;
      alumni.created_at = new Date().toISOString().split('T')[0];
      list.unshift(alumni);
    }

    // Auto-create or synchronize User login account
    const cleanEmail = alumni.email.trim().toLowerCase();
    const cleanNisn = alumni.nisn ? alumni.nisn.trim().toLowerCase() : '';

    const userIndex = users.findIndex(u => 
      u.id === alumni.user_id || 
      (u.email && u.email.trim().toLowerCase() === cleanEmail) || 
      (cleanNisn && u.nisn && u.nisn.trim().toLowerCase() === cleanNisn)
    );

    if (userIndex >= 0) {
      alumni.user_id = users[userIndex].id;
      users[userIndex].name = alumni.name;
      users[userIndex].email = alumni.email;
      users[userIndex].nisn = alumni.nisn;
      users[userIndex].role = 'ALUMNI';
      users[userIndex].isActive = true;
      if (alumni.avatar !== undefined) users[userIndex].avatar = alumni.avatar;
      users[userIndex].password = assignedPassword;
    } else {
      const newUser: User = {
        id: alumni.user_id,
        name: alumni.name,
        email: alumni.email,
        nisn: alumni.nisn,
        role: 'ALUMNI',
        avatar: alumni.avatar !== undefined ? alumni.avatar : AVATAR_COWO,
        created_at: new Date().toISOString(),
        isActive: true,
        password: assignedPassword
      };
      users.push(newUser);
    }

    setItem(STORAGE_KEYS.PROFILES, list);
    setItem(STORAGE_KEYS.USERS, users);

    // Sync active logged-in session if this alumni is currently logged in
    const currentUser = StorageService.getCurrentUser();
    if (
      currentUser &&
      (currentUser.id === alumni.user_id ||
        (currentUser.email && currentUser.email.trim().toLowerCase() === cleanEmail) ||
        (cleanNisn && currentUser.nisn && currentUser.nisn.trim().toLowerCase() === cleanNisn))
    ) {
      const updatedCurrentUser: User = {
        ...currentUser,
        name: alumni.name,
        email: alumni.email,
        nisn: alumni.nisn,
        avatar: alumni.avatar !== undefined ? alumni.avatar : currentUser.avatar,
      };
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updatedCurrentUser));
      window.dispatchEvent(new Event('alumnitrack_auth_changed'));
    }

    return alumni;
  },

  deleteAlumni: (id: number): boolean => {
    const list = StorageService.getAlumniList();
    const alumniToDelete = list.find(a => a.id === id);
    const filtered = list.filter(a => a.id !== id);
    if (filtered.length !== list.length) {
      setItem(STORAGE_KEYS.PROFILES, filtered);

      // Also clean up User account
      if (alumniToDelete) {
        const users = StorageService.getUsers().filter(u => 
          u.id !== alumniToDelete.user_id && 
          u.email.toLowerCase() !== alumniToDelete.email.toLowerCase()
        );
        setItem(STORAGE_KEYS.USERS, users);
      }

      return true;
    }
    return false;
  },

  deleteMultipleAlumni: (ids: number[]): number => {
    const list = StorageService.getAlumniList();
    const idSet = new Set(ids);
    const toDelete = list.filter(a => idSet.has(a.id));
    const remaining = list.filter(a => !idSet.has(a.id));
    
    if (toDelete.length > 0) {
      setItem(STORAGE_KEYS.PROFILES, remaining);

      // Clean up corresponding User accounts
      const userIdsToDelete = new Set(toDelete.map(a => a.user_id).filter(Boolean));
      const emailsToDelete = new Set(toDelete.map(a => a.email.toLowerCase()));
      const users = StorageService.getUsers().filter(u => 
        !userIdsToDelete.has(u.id) && !emailsToDelete.has(u.email.toLowerCase())
      );
      setItem(STORAGE_KEYS.USERS, users);

      // Clean up histories and documents
      const allHistories = getItem<CareerHistoryItem[]>(STORAGE_KEYS.HISTORIES, INITIAL_CAREER_HISTORIES);
      setItem(STORAGE_KEYS.HISTORIES, allHistories.filter(h => !idSet.has(h.alumni_id)));

      const allDocs = getItem<DocumentFile[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
      setItem(STORAGE_KEYS.DOCUMENTS, allDocs.filter(d => !idSet.has(d.alumni_id)));

      return toDelete.length;
    }
    return 0;
  },

  // --- CAREER HISTORIES ---
  getCareerHistories: (alumniId: number): CareerHistoryItem[] => {
    const all = getItem<CareerHistoryItem[]>(STORAGE_KEYS.HISTORIES, INITIAL_CAREER_HISTORIES);
    return all.filter(h => h.alumni_id === alumniId);
  },

  saveCareerHistory: (item: Omit<CareerHistoryItem, 'id'> & { id?: number }): CareerHistoryItem => {
    const all = getItem<CareerHistoryItem[]>(STORAGE_KEYS.HISTORIES, INITIAL_CAREER_HISTORIES);
    let savedItem: CareerHistoryItem;
    if (item.id) {
      const idx = all.findIndex(h => h.id === item.id);
      savedItem = item as CareerHistoryItem;
      if (idx >= 0) all[idx] = savedItem;
    } else {
      const newId = all.length > 0 ? Math.max(...all.map(h => h.id)) + 1 : 1;
      savedItem = { ...item, id: newId };
      all.push(savedItem);
    }
    setItem(STORAGE_KEYS.HISTORIES, all);
    return savedItem;
  },

  deleteCareerHistory: (id: number): void => {
    const all = getItem<CareerHistoryItem[]>(STORAGE_KEYS.HISTORIES, INITIAL_CAREER_HISTORIES);
    setItem(STORAGE_KEYS.HISTORIES, all.filter(h => h.id !== id));
  },

  // --- DOCUMENTS ---
  getDocuments: (alumniId: number): DocumentFile[] => {
    const all = getItem<DocumentFile[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    return all.filter(d => d.alumni_id === alumniId);
  },

  saveDocument: (doc: Omit<DocumentFile, 'id'>): DocumentFile => {
    const all = getItem<DocumentFile[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    const newId = all.length > 0 ? Math.max(...all.map(d => d.id)) + 1 : 1;
    const newDoc: DocumentFile = { ...doc, id: newId };
    all.push(newDoc);
    setItem(STORAGE_KEYS.DOCUMENTS, all);
    return newDoc;
  },

  deleteDocument: (id: number): void => {
    const all = getItem<DocumentFile[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    setItem(STORAGE_KEYS.DOCUMENTS, all.filter(d => d.id !== id));
  },

  // --- TRACER SURVEYS & QUESTIONS ---
  getSurveys: (): TracerSurvey[] => {
    return getItem(STORAGE_KEYS.SURVEYS, INITIAL_TRACER_SURVEYS);
  },

  getActiveSurvey: (): TracerSurvey | undefined => {
    const surveys = StorageService.getSurveys();
    return surveys.find(s => s.status === 'Aktif') || surveys[0];
  },

  saveSurvey: (survey: TracerSurvey): TracerSurvey => {
    const list = StorageService.getSurveys();
    const idx = list.findIndex(s => s.id === survey.id);
    if (idx >= 0) {
      list[idx] = survey;
    } else {
      survey.id = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
      list.push(survey);
    }
    setItem(STORAGE_KEYS.SURVEYS, list);
    return survey;
  },

  getQuestions: (surveyId: number): TracerQuestion[] => {
    const all = getItem<TracerQuestion[]>(STORAGE_KEYS.QUESTIONS, INITIAL_TRACER_QUESTIONS);
    return all.filter(q => q.survey_id === surveyId).sort((a, b) => a.order - b.order);
  },

  saveQuestion: (question: TracerQuestion): TracerQuestion => {
    const all = getItem<TracerQuestion[]>(STORAGE_KEYS.QUESTIONS, INITIAL_TRACER_QUESTIONS);
    const idx = all.findIndex(q => q.id === question.id);
    if (idx >= 0) {
      all[idx] = question;
    } else {
      question.id = all.length > 0 ? Math.max(...all.map(q => q.id)) + 1 : 1;
      all.push(question);
    }
    setItem(STORAGE_KEYS.QUESTIONS, all);
    return question;
  },

  deleteQuestion: (id: number): void => {
    const all = getItem<TracerQuestion[]>(STORAGE_KEYS.QUESTIONS, INITIAL_TRACER_QUESTIONS);
    setItem(STORAGE_KEYS.QUESTIONS, all.filter(q => q.id !== id));
  },

  deleteMultipleQuestions: (ids: number[]): number => {
    const all = getItem<TracerQuestion[]>(STORAGE_KEYS.QUESTIONS, INITIAL_TRACER_QUESTIONS);
    const idSet = new Set(ids);
    const filtered = all.filter(q => !idSet.has(q.id));
    const count = all.length - filtered.length;
    if (count > 0) {
      setItem(STORAGE_KEYS.QUESTIONS, filtered);
    }
    return count;
  },

  // --- TRACER SUBMISSIONS ---
  getSubmissions: (): TracerSubmission[] => {
    return getItem(STORAGE_KEYS.SUBMISSIONS, []);
  },

  getSubmissionByAlumni: (surveyId: number, alumniId: number): TracerSubmission | undefined => {
    const list = StorageService.getSubmissions();
    return list.find(s => s.survey_id === surveyId && s.alumni_id === alumniId);
  },

  saveSubmission: (sub: Omit<TracerSubmission, 'id'>): TracerSubmission => {
    const list = StorageService.getSubmissions();
    const idx = list.findIndex(s => s.survey_id === sub.survey_id && s.alumni_id === sub.alumni_id);
    let res: TracerSubmission;
    if (idx >= 0) {
      res = { ...sub, id: list[idx].id };
      list[idx] = res;
    } else {
      const newId = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
      res = { ...sub, id: newId };
      list.push(res);
    }
    setItem(STORAGE_KEYS.SUBMISSIONS, list);

    // Update alumni profile status tracer
    const alumni = StorageService.getAlumniById(sub.alumni_id);
    if (alumni) {
      alumni.status_tracer = sub.status;
      StorageService.saveAlumni(alumni);
    }

    return res;
  },

  // --- JOBS & EVENTS ---
  getJobs: (): JobPosting[] => {
    return getItem(STORAGE_KEYS.JOBS, INITIAL_JOB_POSTINGS);
  },

  saveJob: (job: JobPosting): JobPosting => {
    const list = StorageService.getJobs();
    const idx = list.findIndex(j => j.id === job.id);
    if (idx >= 0) {
      list[idx] = job;
    } else {
      job.id = list.length > 0 ? Math.max(...list.map(j => j.id)) + 1 : 1;
      job.created_at = new Date().toISOString().split('T')[0];
      list.unshift(job);
    }
    setItem(STORAGE_KEYS.JOBS, list);
    return job;
  },

  deleteJob: (id: number): void => {
    const list = StorageService.getJobs();
    setItem(STORAGE_KEYS.JOBS, list.filter(j => j.id !== id));
  },

  deleteMultipleJobs: (ids: number[]): number => {
    const list = StorageService.getJobs();
    const idSet = new Set(ids);
    const filtered = list.filter(j => !idSet.has(j.id));
    const count = list.length - filtered.length;
    if (count > 0) {
      setItem(STORAGE_KEYS.JOBS, filtered);
    }
    return count;
  },

  // --- FORUM ---
  getForumPosts: (): ForumPost[] => {
    return getItem(STORAGE_KEYS.FORUM, INITIAL_FORUM_POSTS);
  },

  saveForumPost: (post: Omit<ForumPost, 'id' | 'likes' | 'liked_by_user' | 'comments' | 'created_at' | 'is_locked'> & { is_locked?: boolean }): ForumPost => {
    const list = StorageService.getForumPosts();
    const newId = list.length > 0 ? Math.max(...list.map(p => p.id)) + 1 : 1;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newPost: ForumPost = {
      ...post,
      id: newId,
      likes: 0,
      liked_by_user: false,
      is_locked: post.is_locked ?? false,
      created_at: timeStr,
      comments: []
    };
    list.unshift(newPost);
    setItem(STORAGE_KEYS.FORUM, list);
    return newPost;
  },

  toggleLikePost: (postId: number): void => {
    const list = StorageService.getForumPosts();
    const post = list.find(p => p.id === postId);
    if (post) {
      if (post.liked_by_user) {
        post.likes = Math.max(0, post.likes - 1);
        post.liked_by_user = false;
      } else {
        post.likes += 1;
        post.liked_by_user = true;
      }
      setItem(STORAGE_KEYS.FORUM, list);
    }
  },

  addComment: (postId: number, comment: { author_id: number; author_name: string; author_role: any; author_avatar?: string; content: string }): void => {
    const list = StorageService.getForumPosts();
    const post = list.find(p => p.id === postId);
    if (post) {
      const now = new Date();
      const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const commentId = Math.floor(Math.random() * 90000) + 1000;
      post.comments.push({
        id: commentId,
        post_id: postId,
        ...comment,
        created_at: timeStr
      });
      setItem(STORAGE_KEYS.FORUM, list);
    }
  },

  toggleLockPost: (postId: number): void => {
    const list = StorageService.getForumPosts();
    const post = list.find(p => p.id === postId);
    if (post) {
      post.is_locked = !post.is_locked;
      setItem(STORAGE_KEYS.FORUM, list);
    }
  },

  deletePost: (postId: number): void => {
    const list = StorageService.getForumPosts();
    setItem(STORAGE_KEYS.FORUM, list.filter(p => p.id !== postId));
  },

  // --- NOTIFICATIONS ---
  getNotifications: (): NotificationItem[] => {
    return getItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  markNotificationAsRead: (id: number): void => {
    const list = StorageService.getNotifications();
    const notif = list.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      setItem(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  },

  markAllNotificationsAsRead: (): void => {
    const list = StorageService.getNotifications();
    list.forEach(n => { n.is_read = true; });
    setItem(STORAGE_KEYS.NOTIFICATIONS, list);
  },

  sendBroadcastNotification: (title: string, message: string, target_role: 'ALL' | 'ALUMNI' | 'ADMIN' = 'ALL'): void => {
    const list = StorageService.getNotifications();
    const newId = list.length > 0 ? Math.max(...list.map(n => n.id)) + 1 : 1;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    list.unshift({
      id: newId,
      title,
      message,
      target_role,
      type: 'announcement',
      is_read: false,
      created_at: timeStr,
    });
    setItem(STORAGE_KEYS.NOTIFICATIONS, list);
  },

  // --- AUDIT LOGS ---
  getAuditLogs: (): AuditLog[] => {
    return getItem(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  },

  addAuditLog: (userName: string, userRole: string, activity: string): void => {
    const list = StorageService.getAuditLogs();
    const newId = list.length > 0 ? Math.max(...list.map(l => l.id)) + 1 : 1;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    list.unshift({
      id: newId,
      user_name: userName,
      user_role: userRole,
      activity,
      ip: '127.0.0.1 (Docker Host)',
      timestamp: timeStr
    });
    setItem(STORAGE_KEYS.AUDIT, list);
  },

  deleteAuditLog: (id: number): boolean => {
    const list = StorageService.getAuditLogs();
    const filtered = list.filter(l => l.id !== id);
    if (filtered.length !== list.length) {
      setItem(STORAGE_KEYS.AUDIT, filtered);
      return true;
    }
    return false;
  },

  deleteMultipleAuditLogs: (ids: number[]): number => {
    const list = StorageService.getAuditLogs();
    const idSet = new Set(ids);
    const filtered = list.filter(l => !idSet.has(l.id));
    const count = list.length - filtered.length;
    if (count > 0) {
      setItem(STORAGE_KEYS.AUDIT, filtered);
    }
    return count;
  },

  clearAllAuditLogs: (): void => {
    setItem(STORAGE_KEYS.AUDIT, []);
  },

  // --- SCHOOL SETTINGS ---
  getSchoolSettings: (): SchoolSettings => {
    const stored = getItem(STORAGE_KEYS.SETTINGS, INITIAL_SCHOOL_SETTINGS);
    return {
      ...INITIAL_SCHOOL_SETTINGS,
      ...stored,
      landing_hero_image: stored.landing_hero_image !== undefined ? stored.landing_hero_image : INITIAL_SCHOOL_SETTINGS.landing_hero_image,
      landing_hero_caption: stored.landing_hero_caption !== undefined ? stored.landing_hero_caption : INITIAL_SCHOOL_SETTINGS.landing_hero_caption,
    };
  },

  saveSchoolSettings: (settings: SchoolSettings): SchoolSettings => {
    setItem(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  },

  // --- PROFIL GURU BK (CRUD PENERBIT LAPORAN) ---
  getGuruBkProfiles: (): GuruBkProfile[] => {
    const list = getItem<GuruBkProfile[]>(STORAGE_KEYS.GURU_BK, INITIAL_GURU_BK_PROFILES);
    return list.length > 0 ? list : INITIAL_GURU_BK_PROFILES;
  },

  getActiveGuruBk: (): GuruBkProfile => {
    const list = StorageService.getGuruBkProfiles();
    return list.find(g => g.is_default) || list[0] || INITIAL_GURU_BK_PROFILES[0];
  },

  saveGuruBkProfile: (
    data: Omit<GuruBkProfile, 'id' | 'updated_at'> & { id?: number }
  ): GuruBkProfile => {
    const list = StorageService.getGuruBkProfiles();
    const today = new Date().toISOString().split('T')[0];

    if (data.is_default) {
      list.forEach(item => {
        item.is_default = false;
      });
    }

    let result: GuruBkProfile;

    if (data.id) {
      const idx = list.findIndex(g => g.id === data.id);
      if (idx >= 0) {
        const updated: GuruBkProfile = {
          ...list[idx],
          ...data,
          id: data.id,
          updated_at: today,
        };
        list[idx] = updated;
        if (!list.some(g => g.is_default)) {
          list[0].is_default = true;
        }
        setItem(STORAGE_KEYS.GURU_BK, list);
        result = updated;
      } else {
        const newId = list.length > 0 ? Math.max(...list.map(g => g.id)) + 1 : 1;
        const created: GuruBkProfile = {
          ...data,
          id: newId,
          is_default: data.is_default ?? list.length === 0,
          updated_at: today,
        };
        list.push(created);
        if (!list.some(g => g.is_default)) {
          list[0].is_default = true;
        }
        setItem(STORAGE_KEYS.GURU_BK, list);
        result = created;
      }
    } else {
      const newId = list.length > 0 ? Math.max(...list.map(g => g.id)) + 1 : 1;
      const created: GuruBkProfile = {
        ...data,
        id: newId,
        is_default: data.is_default ?? list.length === 0,
        updated_at: today,
      };
      list.push(created);
      if (!list.some(g => g.is_default)) {
        list[0].is_default = true;
      }
      setItem(STORAGE_KEYS.GURU_BK, list);
      result = created;
    }

    // Sync active Guru BK avatar with Admin user session when set as default
    const activeBk = list.find(g => g.is_default) || list[0];
    if (activeBk && activeBk.avatar !== undefined) {
      const users = StorageService.getUsers();
      let usersModified = false;
      users.forEach(u => {
        if (u.role === 'ADMIN') {
          u.avatar = activeBk.avatar || AVATAR_COWO;
          usersModified = true;
        }
      });
      if (usersModified) {
        setItem(STORAGE_KEYS.USERS, users);
      }
      const currentUser = StorageService.getCurrentUser();
      if (currentUser && currentUser.role === 'ADMIN') {
        const updatedCurrentUser: User = {
          ...currentUser,
          avatar: activeBk.avatar || AVATAR_COWO,
        };
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updatedCurrentUser));
        window.dispatchEvent(new Event('alumnitrack_auth_changed'));
      }
    }

    return result;
  },

  setDefaultGuruBkProfile: (id: number): void => {
    const list = StorageService.getGuruBkProfiles().map(g => ({
      ...g,
      is_default: g.id === id,
    }));
    setItem(STORAGE_KEYS.GURU_BK, list);

    const activeBk = list.find(g => g.is_default);
    if (activeBk) {
      const users = StorageService.getUsers();
      users.forEach(u => {
        if (u.role === 'ADMIN') {
          u.avatar = activeBk.avatar || AVATAR_COWO;
        }
      });
      setItem(STORAGE_KEYS.USERS, users);
      const currentUser = StorageService.getCurrentUser();
      if (currentUser && currentUser.role === 'ADMIN') {
        localStorage.setItem(
          STORAGE_KEYS.AUTH_USER,
          JSON.stringify({ ...currentUser, avatar: activeBk.avatar || AVATAR_COWO })
        );
        window.dispatchEvent(new Event('alumnitrack_auth_changed'));
      }
    }
  },

  deleteGuruBkProfile: (id: number): boolean => {
    const list = StorageService.getGuruBkProfiles();
    if (list.length <= 1) {
      return false; // Keep at least 1 active Guru BK profile
    }
    const filtered = list.filter(g => g.id !== id);
    if (filtered.length !== list.length) {
      if (!filtered.some(g => g.is_default) && filtered.length > 0) {
        filtered[0].is_default = true;
      }
      setItem(STORAGE_KEYS.GURU_BK, filtered);
      return true;
    }
    return false;
  }
};
