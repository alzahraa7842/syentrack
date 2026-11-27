import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AlumniProfile, UserRole } from '../types';
import {
  StorageService,
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
  const [user, setUser] = useState<User | null>(null);
  const [alumniProfile, setAlumniProfile] = useState<AlumniProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
    const checkInitialStatus = async () => {
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
    void checkInitialStatus();

    const handleDataSync = () => {
      const cachedUser = StorageService.getCurrentUser();
      if (cachedUser) {
        setUser(cachedUser);
        syncCachedProfile(cachedUser);
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
    profile: AlumniProfile | null
  ) => {
    setAuthToken(newToken);
    StorageService.setCurrentUser(authUser);
    startAuthenticatedListeners(authUser.id, authUser.role);
    setToken(newToken);
    setUser(authUser);
    setAlumniProfile(profile);
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
      applyAuthenticatedSession(data.token, data.user, null);
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

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
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

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null);
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

      applyAuthenticatedSession(data.token, data.user, data.alumniProfile || null);
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
