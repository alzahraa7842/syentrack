import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AlumniProfile, UserRole } from '../types';
import {
  StorageService,
  setAuthToken,
  getAuthToken,
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
}

interface AuthContextType {
  user: User | null;
  alumniProfile: AlumniProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsAdminBootstrap: boolean;
  bootstrapAdmin: (password: string) => Promise<AuthResult>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthResult>;
  register: (data: RegisterPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [alumniProfile, setAlumniProfile] = useState<AlumniProfile | null>(() => {
    const initialUser = StorageService.getCurrentUser();
    if (!initialUser || initialUser.role !== 'ALUMNI') return null;
    return (
      StorageService.getAlumniByUserId(initialUser.id, initialUser.email, initialUser.nisn) || null
    );
  });
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => !(getAuthToken() && StorageService.getCurrentUser()));
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

    const bootstrapSession = async () => {
      const savedToken = getAuthToken();
      const savedUser = StorageService.getCurrentUser();

      if (savedToken && savedUser) {
        startAuthenticatedListeners(savedUser.id, savedUser.role);
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (meRes.ok && active) {
            const meData = await meRes.json();
            const cachedLocalProfile =
              meData.user?.role === 'ALUMNI'
                ? StorageService.getAlumniByUserId(
                    meData.user.id,
                    meData.user.email,
                    meData.user.nisn
                  )
                : null;
            const resolvedProfile =
              meData.persistent === false && cachedLocalProfile
                ? cachedLocalProfile
                : meData.alumniProfile || cachedLocalProfile || null;

            const resolvedUser: User = resolvedProfile
              ? {
                  ...meData.user,
                  name: resolvedProfile.name || meData.user.name,
                  avatar:
                    resolvedProfile.avatar !== undefined
                      ? resolvedProfile.avatar
                      : meData.user.avatar,
                }
              : meData.user;

            StorageService.setCurrentUser(resolvedUser);
            setUser(resolvedUser);
            setAlumniProfile(resolvedProfile);
          } else if (meRes.status === 401 && active) {
            const errData = await meRes.json().catch(() => ({}));
            if (!errData?.ephemeralMiss) {
              stopAuthenticatedListeners();
              setUser(null);
              setAlumniProfile(null);
              setToken(null);
            }
          }
        } catch {
          // Offline / static hosting fallback: keep restored local session
        }
      }

      try {
        const res = await fetch('/api/auth/admin-status');
        if (res.ok && active) {
          const data = await res.json();
          setNeedsAdminBootstrap(Boolean(data.needsBootstrap));
        }
      } catch (err) {
        console.error('Admin status check error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void bootstrapSession();

    const handleDataSync = () => {
      const cachedUser = StorageService.getCurrentUser();
      const cachedToken = getAuthToken();
      setToken(cachedToken);
      setUser(cachedUser);
      syncCachedProfile(cachedUser);
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
    let finalProfile = profile;
    if (authUser.role === 'ALUMNI' && profile) {
      const localCached = StorageService.getAlumniById(profile.id);
      if (localCached && !StorageService.isServerPersistent()) {
        finalProfile = localCached;
      } else {
        finalProfile = profile;
      }
    }

    const finalUser: User = finalProfile
      ? {
          ...authUser,
          name: finalProfile.name || authUser.name,
          avatar:
            finalProfile.avatar !== undefined ? finalProfile.avatar : authUser.avatar,
        }
      : authUser;

    StorageService.setCurrentUser(finalUser);
    startAuthenticatedListeners(finalUser.id, finalUser.role);
    setToken(newToken);
    setUser(finalUser);
    setAlumniProfile(finalProfile);
  };

  const bootstrapAdmin = async (password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/bootstrap-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsLoading(false);
        return { success: false, message: data.message || 'Gagal menetapkan password Admin.' };
      }

      setNeedsAdminBootstrap(false);
      applyAuthenticatedSession(data.token, data.user, null, true);
      StorageService.addAuditLog(data.user.name, data.user.role, 'Menetapkan password Admin awal & masuk sistem');
      setIsLoading(false);
      return {
        success: true,
        message: data.message || 'Password Admin berhasil ditetapkan!',
        role: data.user.role,
      };
    } catch {
      setIsLoading(false);
      return { success: false, message: 'Gagal menghubungi server.' };
    }
  };

  const login = async (
    identifier: string,
    password: string,
    rememberMe = true
  ): Promise<AuthResult> => {
    const cleanId = identifier.trim();
    if (!cleanId) return { success: false, message: 'Email atau NISN tidak boleh kosong.' };
    if (!password) return { success: false, message: 'Password tidak boleh kosong.' };

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsLoading(false);
        return { success: false, message: data.message || 'Gagal melakukan autentikasi.' };
      }

      applyAuthenticatedSession(
        data.token,
        data.user,
        data.alumniProfile || null,
        rememberMe
      );
      StorageService.addAuditLog(data.user.name, data.user.role, 'Login berhasil ke sistem');
      setIsLoading(false);
      return {
        success: true,
        message: data.message || 'Login berhasil!',
        role: data.user.role,
      };
    } catch {
      setIsLoading(false);
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

    setIsLoading(true);
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
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsLoading(false);
        return { success: false, message: data.message || 'Gagal mendaftarkan akun baru.' };
      }

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null, true);
      StorageService.addAuditLog(
        data.user.name,
        data.user.role,
        'Mendaftar sebagai akun alumni baru'
      );
      setIsLoading(false);
      return {
        success: true,
        message: data.message || 'Pendaftaran akun baru berhasil!',
        role: data.user.role,
      };
    } catch {
      setIsLoading(false);
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
        needsAdminBootstrap,
        bootstrapAdmin,
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
