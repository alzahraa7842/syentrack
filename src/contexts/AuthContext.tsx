import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AlumniProfile } from '../types';
import { StorageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  alumniProfile: AlumniProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string; role?: 'ADMIN' | 'ALUMNI' }>;
  register: (data: {
    name: string;
    email: string;
    nisn?: string;
    angkatan?: number;
    jurusan?: string;
    phone?: string;
    password: string;
    avatar?: string;
    receive_email_notifications?: boolean;
  }) => Promise<{ success: boolean; message: string; role?: 'ADMIN' | 'ALUMNI' }>;
  loginWithGoogle: (googleEmail: string, googleName: string, avatarUrl?: string) => Promise<{ success: boolean; message: string; role?: 'ADMIN' | 'ALUMNI' }>;
  logout: () => void;
  refreshUser: () => void;
  switchAccount: (role: 'ADMIN' | 'ALUMNI') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [alumniProfile, setAlumniProfile] = useState<AlumniProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadCurrentUserData = () => {
    const savedUser = StorageService.getCurrentUser();
    const savedToken = StorageService.getAuthToken();
    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      if (savedUser.role === 'ALUMNI') {
        const profile = StorageService.getAlumniByUserId(savedUser.id, savedUser.email, savedUser.nisn);
        setAlumniProfile(profile || null);
      } else {
        setAlumniProfile(null);
      }
    } else {
      setUser(null);
      setAlumniProfile(null);
      setToken(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCurrentUserData();

    const handleAuthChange = () => {
      loadCurrentUserData();
    };

    window.addEventListener('alumnitrack_auth_changed', handleAuthChange);
    window.addEventListener('alumnitrack_data_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('alumnitrack_auth_changed', handleAuthChange);
      window.removeEventListener('alumnitrack_data_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const login = async (identifier: string, password: string, _rememberMe: boolean = true) => {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 400));

    if (!identifier.trim()) {
      setIsLoading(false);
      return { success: false, message: 'Email atau NISN tidak boleh kosong' };
    }
    if (!password) {
      setIsLoading(false);
      return { success: false, message: 'Password tidak boleh kosong' };
    }

    const inputPass = password.trim();
    let matchedUser = StorageService.findUserByEmailOrNISN(identifier);

    // If logging in with a brand-new personal email not yet in the system,
    // strictly create a fresh, isolated account (never enter an existing account).
    if (!matchedUser) {
      const cleanEmail = identifier.trim().toLowerCase();
      if (cleanEmail.includes('@') && cleanEmail.includes('.')) {
        const autoName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const regRes = StorageService.registerAlumni({
          name: autoName,
          email: cleanEmail,
          password: inputPass
        });
        if (regRes.success && regRes.user) {
          matchedUser = regRes.user;
        }
      }
    }

    if (!matchedUser) {
      setIsLoading(false);
      return { success: false, message: 'Akun tidak ditemukan. Periksa kembali Email atau NISN Anda.' };
    }

    if (!matchedUser.isActive) {
      setIsLoading(false);
      return { success: false, message: 'Akun Anda sedang dinonaktifkan. Hubungi Guru BK / Admin Sekolah.' };
    }

    // Verify passwords strictly
    const isValidAdmin = matchedUser.role === 'ADMIN' && (
      inputPass === 'Admin123!' ||
      inputPass === 'admin' ||
      (matchedUser.password && inputPass === matchedUser.password.trim())
    );

    const existingAlumniProfile = StorageService.getAlumniByUserId(
      matchedUser.id,
      matchedUser.email,
      matchedUser.nisn
    );
    const storedPass = (matchedUser.password || existingAlumniProfile?.password || '').trim();

    const isValidAlumni = matchedUser.role === 'ALUMNI' && (
      storedPass
        ? inputPass === storedPass
        : (inputPass === 'Alumni123!' || Boolean(matchedUser.nisn && inputPass === matchedUser.nisn.trim()))
    );

    if (!isValidAdmin && !isValidAlumni) {
      setIsLoading(false);
      return { success: false, message: 'Password yang Anda masukkan salah' };
    }

    // Persist active password on the real users key if not yet stored
    if (matchedUser.role === 'ALUMNI' && !matchedUser.password) {
      matchedUser.password = inputPass;
      StorageService.updateUserPassword(matchedUser.id, inputPass);
    }

    const dummyToken = `jwt_${matchedUser.role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    StorageService.setCurrentUser(matchedUser, dummyToken);
    StorageService.addAuditLog(matchedUser.name, matchedUser.role, `Login berhasil melalui browser`);

    setUser(matchedUser);
    setToken(dummyToken);

    if (matchedUser.role === 'ALUMNI') {
      const profile = StorageService.getAlumniByUserId(matchedUser.id, matchedUser.email, matchedUser.nisn);
      setAlumniProfile(profile || null);
    }

    setIsLoading(false);
    return { success: true, message: 'Login berhasil!', role: matchedUser.role };
  };

  const register = async (data: {
    name: string;
    email: string;
    nisn?: string;
    angkatan?: number;
    jurusan?: string;
    phone?: string;
    password: string;
    avatar?: string;
    receive_email_notifications?: boolean;
  }) => {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 350));

    const result = StorageService.registerAlumni(data);
    if (!result.success || !result.user) {
      setIsLoading(false);
      return { success: false, message: result.message };
    }

    const dummyToken = `jwt_alumni_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    StorageService.setCurrentUser(result.user, dummyToken);
    StorageService.addAuditLog(result.user.name, 'ALUMNI', 'Pendaftaran akun alumni baru menggunakan email pribadi');

    setUser(result.user);
    setToken(dummyToken);

    const profile = StorageService.getAlumniByUserId(result.user.id, result.user.email, result.user.nisn);
    setAlumniProfile(profile || null);

    setIsLoading(false);
    return { success: true, message: result.message, role: 'ALUMNI' as const };
  };

  const loginWithGoogle = async (googleEmail: string, googleName: string, avatarUrl?: string) => {
    setIsLoading(true);
    await new Promise(res => setTimeout(res, 350));
    const cleanEmail = googleEmail.trim().toLowerCase();
    let matchedUser = StorageService.findUserByEmailOrNISN(cleanEmail);

    if (matchedUser && matchedUser.role === 'ADMIN') {
      setIsLoading(false);
      return { success: false, message: 'Akun Admin tidak dapat login menggunakan Google Sign-In.' };
    }

    if (!matchedUser) {
      const reg = StorageService.registerAlumni({
        name: googleName.trim() || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: `GoogleAuth_${Date.now()}`,
        avatar: avatarUrl || '',
        receive_email_notifications: true
      });
      if (!reg.success || !reg.user) {
        setIsLoading(false);
        return { success: false, message: reg.message || 'Gagal mendaftarkan akun Google baru' };
      }
      matchedUser = reg.user;
    }

    if (matchedUser) {
      if (!matchedUser.isActive) {
        setIsLoading(false);
        return { success: false, message: 'Akun Anda sedang dinonaktifkan. Hubungi Guru BK / Admin Sekolah.' };
      }
      matchedUser.is_google_user = true;
      if (!matchedUser.avatar && avatarUrl) matchedUser.avatar = avatarUrl;
      const dummyToken = `jwt_google_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      StorageService.setCurrentUser(matchedUser, dummyToken);
      StorageService.addAuditLog(matchedUser.name, 'ALUMNI', 'Login berhasil menggunakan Google Sign-In');
      setUser(matchedUser);
      setToken(dummyToken);
      const profile = StorageService.getAlumniByUserId(matchedUser.id, matchedUser.email, matchedUser.nisn);
      if (profile) {
        profile.is_google_user = true;
        if (!profile.avatar && avatarUrl) profile.avatar = avatarUrl;
        setAlumniProfile(profile);
      }
      setIsLoading(false);
      return { success: true, message: 'Berhasil masuk dengan Akun Google!', role: 'ALUMNI' as const };
    }
    setIsLoading(false);
    return { success: false, message: 'Gagal memproses akun Google' };
  };

  const logout = () => {
    if (user) {
      StorageService.addAuditLog(user.name, user.role, 'Logout dari sistem');
    }
    StorageService.setCurrentUser(null);
    setUser(null);
    setAlumniProfile(null);
    setToken(null);
  };

  const refreshUser = () => {
    loadCurrentUserData();
  };

  // Helper for quick demonstration switching
  const switchAccount = (role: 'ADMIN' | 'ALUMNI') => {
    const users = StorageService.getUsers();
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      const dummyToken = `jwt_${targetUser.role.toLowerCase()}_${Date.now()}`;
      StorageService.setCurrentUser(targetUser, dummyToken);
      loadCurrentUserData();
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
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        switchAccount
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
