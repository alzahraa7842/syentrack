import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AlumniProfile, UserRole } from '../types';
import {
  StorageService,
  getAuthToken,
  setAuthToken,
  startAuthenticatedListeners,
  stopAuthenticatedListeners,
} from '../services/storageService';
import { AVATAR_COWO } from '../constants/avatars';

interface RegisterPayload {
  name: string;
  email: string;
  nisn?: string;
  angkatan?: number;
  jurusan?: string;
  phone?: string;
  password: string;
  avatar?: string;
  receive_email_notifications?: boolean;
}

interface AuthResult {
  success: boolean;
  message: string;
  role?: UserRole;
  code?: string;
}

interface AuthContextType {
  user: User | null;
  alumniProfile: AlumniProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  needsAdminBootstrap: boolean;
  bootstrapAdmin: (password: string) => Promise<AuthResult>;
  activateAlumni: (identifier: string, password: string) => Promise<AuthResult>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthResult>;
  register: (data: RegisterPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [alumniProfile, setAlumniProfile] = useState<AlumniProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [needsAdminBootstrap, setNeedsAdminBootstrap] = useState<boolean>(false);

  const syncCachedProfile = useCallback((currentUser: User | null) => {
    if (!currentUser) {
      setAlumniProfile(null);
      return;
    }
    if (currentUser.role === 'ALUMNI') {
      const prof = StorageService.getAlumniByUserId(
        currentUser.id,
        currentUser.email,
        currentUser.nisn
      );
      if (prof) {
        setAlumniProfile(prof);
      }
    } else {
      setAlumniProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      try {
        const storedToken = getAuthToken();
        const cachedUser = StorageService.getCurrentUser();
        if (storedToken && cachedUser && active) {
          setToken(storedToken);
          setUser(cachedUser);
          syncCachedProfile(cachedUser);
        }

        const statusPromise = fetch('/api/auth/admin-status')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const mePromise = storedToken
          ? fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            }).catch(() => null)
          : Promise.resolve(null);

        const [statusData, meRes] = await Promise.all([statusPromise, mePromise]);

        if (statusData && active) {
          setNeedsAdminBootstrap(Boolean(statusData.needsBootstrap));
        }

        if (storedToken && meRes && active) {
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.user && active) {
              StorageService.syncSessionFromServer(meData.user, meData.alumniProfile || null);
              startAuthenticatedListeners(meData.user.id, meData.user.role);
              setToken(storedToken);
              setUser(meData.user);
              setAlumniProfile(meData.alumniProfile || null);
            }
          } else if (meRes.status === 401 || meRes.status === 403) {
            stopAuthenticatedListeners();
            setToken(null);
            setUser(null);
            setAlumniProfile(null);
          }
        }
      } catch (err) {
        console.error('Initial auth check error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void initAuth();

    const handleDataSync = () => {
      const activeToken = getAuthToken();
      const cachedUser = StorageService.getCurrentUser();
      if (activeToken && cachedUser) {
        setToken(activeToken);
        setUser(cachedUser);
        syncCachedProfile(cachedUser);
      } else if (!activeToken) {
        setToken(null);
        setUser(null);
        setAlumniProfile(null);
      }
    };

    window.addEventListener('alumnitrack_auth_changed', handleDataSync);
    window.addEventListener('alumnitrack_data_changed', handleDataSync);
    return () => {
      active = false;
      window.removeEventListener('alumnitrack_auth_changed', handleDataSync);
      window.removeEventListener('alumnitrack_data_changed', handleDataSync);
    };
  }, [syncCachedProfile]);

  const applyAuthenticatedSession = (
    newToken: string,
    authUser: User,
    profile: AlumniProfile | null,
    rememberMe = true
  ) => {
    setAuthToken(newToken, rememberMe);
    StorageService.syncSessionFromServer(authUser, profile);
    startAuthenticatedListeners(authUser.id, authUser.role);
    setToken(newToken);
    setUser(authUser);
    setAlumniProfile(profile);
  };

  const safeReadAuthJson = async (res: Response): Promise<Record<string, any> | null> => {
    try {
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text) as Record<string, any>;
    } catch {
      return null;
    }
  };

  const bootstrapAdmin = async (password: string): Promise<AuthResult> => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/bootstrap-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await safeReadAuthJson(res);
      if (!data) {
        setIsSubmitting(false);
        return {
          success: false,
          message: `Server autentikasi merespons tidak valid (HTTP ${res.status}).`,
        };
      }
      if (!res.ok || !data.success) {
        setIsSubmitting(false);
        return { success: false, message: data.message || 'Gagal menetapkan password Admin.' };
      }

      setNeedsAdminBootstrap(false);
      applyAuthenticatedSession(data.token, data.user, null);
      StorageService.addAuditLog(data.user.name, data.user.role, 'Menetapkan password Admin awal & masuk sistem');
      setIsSubmitting(false);
      return {
        success: true,
        message: data.message || 'Password Admin berhasil ditetapkan!',
        role: data.user.role,
      };
    } catch {
      setIsSubmitting(false);
      return { success: false, message: 'Gagal menghubungi server.' };
    }
  };

  const activateAlumni = async (identifier: string, password: string): Promise<AuthResult> => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/activate-alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await safeReadAuthJson(res);
      if (!data) {
        setIsSubmitting(false);
        return {
          success: false,
          message: `Server aktivasi merespons tidak valid (HTTP ${res.status}).`,
        };
      }
      if (!res.ok || !data.success) {
        setIsSubmitting(false);
        return { success: false, message: data.message || 'Gagal mengaktivasi akun alumni.' };
      }

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null);
      StorageService.addAuditLog(data.user.name, data.user.role, 'Aktivasi password awal & login alumni');
      setIsSubmitting(false);
      return {
        success: true,
        message: data.message || 'Akun berhasil diaktivasi!',
        role: data.user.role,
      };
    } catch {
      setIsSubmitting(false);
      return { success: false, message: 'Gagal terhubung ke server aktivasi.' };
    }
  };

  const login = async (identifier: string, password: string, rememberMe = true): Promise<AuthResult> => {
    const cleanId = identifier.trim();
    if (!cleanId) return { success: false, message: 'Email atau NISN tidak boleh kosong.' };
    if (!password) return { success: false, message: 'Password tidak boleh kosong.' };

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      });
      const data = await safeReadAuthJson(res);
      if (!data) {
        setIsSubmitting(false);
        return {
          success: false,
          message: `Server autentikasi gagal merespons JSON (HTTP ${res.status}). Periksa koneksi database atau fungsi API server.`,
        };
      }
      if (!res.ok || !data.success) {
        setIsSubmitting(false);
        return {
          success: false,
          code: data.code,
          message: data.message || 'Gagal melakukan autentikasi.',
        };
      }

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null, rememberMe);
      StorageService.addAuditLog(data.user.name, data.user.role, 'Login berhasil ke sistem');
      setIsSubmitting(false);
      return {
        success: true,
        message: data.message || 'Login berhasil!',
        role: data.user.role,
      };
    } catch {
      setIsSubmitting(false);
      return { success: false, message: 'Gagal terhubung ke server autentikasi.' };
    }
  };

  const register = async (payload: RegisterPayload): Promise<AuthResult> => {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Alamat email valid wajib diisi.' };
    }
    if (!payload.password || payload.password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter.' };
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          email: cleanEmail,
          avatar: payload.avatar !== undefined ? payload.avatar : AVATAR_COWO,
        }),
      });
      const data = await safeReadAuthJson(res);
      if (!data) {
        setIsSubmitting(false);
        return {
          success: false,
          message: `Server pendaftaran merespons tidak valid (HTTP ${res.status}).`,
        };
      }
      if (!res.ok || !data.success) {
        setIsSubmitting(false);
        return {
          success: false,
          code: data.code,
          message: data.message || 'Gagal mendaftarkan akun baru.',
        };
      }

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null);
      StorageService.addAuditLog(
        data.user.name,
        data.user.role,
        'Mendaftar sebagai akun alumni baru'
      );
      setIsSubmitting(false);
      return {
        success: true,
        message: data.message || 'Pendaftaran akun baru berhasil!',
        role: data.user.role,
      };
    } catch {
      setIsSubmitting(false);
      return { success: false, message: 'Gagal terhubung ke server pendaftaran.' };
    }
  };

  const logout = async () => {
    if (user) {
      StorageService.addAuditLog(user.name, user.role, 'Logout dari sistem');
    }
    stopAuthenticatedListeners();
    setUser(null);
    setAlumniProfile(null);
    setToken(null);
  };

  const refreshUser = () => {
    const cachedUser = StorageService.getCurrentUser();
    if (cachedUser) {
      setUser(cachedUser);
      syncCachedProfile(cachedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        alumniProfile,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isSubmitting,
        needsAdminBootstrap,
        bootstrapAdmin,
        activateAlumni,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
