import React, { useState } from 'react';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  LogIn,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { StorageService } from '../services/storageService';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, register, isLoading } = useAuth();
  const { showToast } = useNotification();
  const schoolSettings = StorageService.getSchoolSettings();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  // Registration form state (for alumni using personal email)
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    nisn: '',
    angkatan: 2025,
    jurusan: 'PPLG',
    phone: '',
    password: ''
  });
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowRegisterPrompt(false);
    const errors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.identifier = 'Email atau NISN wajib diisi';
    }
    if (!password) {
      errors.password = 'Password wajib diisi';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const result = await login(identifier, password, rememberMe);
    if (!result.success) {
      setErrorMessage(result.message);
      // If email seems like a personal email and not found, offer register
      if (identifier.includes('@') && result.message.toLowerCase().includes('tidak ditemukan')) {
        setShowRegisterPrompt(true);
      }
      showToast('error', result.message, 'Gagal Masuk');
    } else {
      showToast('success', `Selamat datang kembali di AlumniTrack`, 'Login Berhasil');
      if (result.role === 'ADMIN') {
        onNavigate('/admin/dashboard');
      } else {
        onNavigate('/alumni/dashboard');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const errors: Record<string, string> = {};

    const cleanEmail = registerData.email.trim();
    if (!registerData.name.trim()) {
      errors.name = 'Nama lengkap wajib diisi';
    }
    if (!cleanEmail) {
      errors.email = 'Email pribadi wajib diisi';
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      errors.email = 'Format email tidak valid (contoh: nama@gmail.com)';
    }
    if (!registerData.password) {
      errors.password = 'Password wajib dibuat';
    }

    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }
    setRegisterErrors({});

    try {
      const res = await register(registerData);
      if (!res.success) {
        setErrorMessage(res.message);
        showToast('error', res.message, 'Pendaftaran');
      } else {
        showToast('success', res.message || 'Akun berhasil terdaftar!', 'Pendaftaran Sukses');
        onNavigate('/alumni/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat memproses pendaftaran');
      showToast('error', 'Gagal mendaftarkan akun');
    }
  };

  const switchToRegisterWithEmail = (emailToPrefill: string) => {
    setRegisterData(prev => ({ ...prev, email: emailToPrefill }));
    setAuthMode('register');
    setErrorMessage(null);
    setShowRegisterPrompt(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden grid lg:grid-cols-12 min-h-[580px]">
        {/* Bagian Kiri: Branding & Informasi */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl" />
          
          <div className="relative z-10">
            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group mb-8"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xl font-bold tracking-tight">AlumniTrack</span>
            </button>

            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Rekap Karir & Tracer Study Resmi
            </h2>
            <p className="text-xs text-emerald-200/80 mt-2 leading-relaxed">
              {schoolSettings.name}
            </p>
          </div>

          <div className="relative z-10 py-6 my-auto space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Bebas Akses Email Pribadi
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Anda dapat menggunakan email pribadi (Gmail, Yahoo, iCloud, dll.) untuk mendaftar atau login ke akun AlumniTrack.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Keamanan & Akurasi Data
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Data karir dan kuesioner tracer study Anda terjaga dan dipergunakan untuk akreditasi serta pengembangan sekolah.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-emerald-800/60 text-[11px] text-emerald-300/70 flex items-center justify-between">
            <span>Tahun Ajaran {schoolSettings.academic_year}</span>
            <button onClick={() => onNavigate('/')} className="hover:underline flex items-center gap-1">
              Halaman Depan <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bagian Kanan: Formulir Login & Registrasi */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-5">
            {/* Mode Tab Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMessage(null); setShowRegisterPrompt(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Masuk ke Akun
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMessage(null); setShowRegisterPrompt(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" /> Daftar Akun Alumni Baru
              </button>
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {authMode === 'login' ? 'Autentikasi Pengguna' : 'Registrasi Alumni Baru'}
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {authMode === 'login' ? 'Selamat Datang 👋' : 'Mendaftar dengan Email Pribadi ✨'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                {authMode === 'login' 
                  ? 'Masuk menggunakan email pribadi (Gmail, dll.), email sekolah, atau NISN Anda.'
                  : 'Daftarkan diri Anda sebagai alumni untuk mengakses kuesioner dan pusat karir.'}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">{errorMessage}</span>
                  {showRegisterPrompt && (
                    <button
                      type="button"
                      onClick={() => switchToRegisterWithEmail(identifier)}
                      className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Ingin mendaftar dengan email {identifier}? Klik di sini
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* FORM LOGIN */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Field Email Pribadi / NISN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Pribadi atau NISN
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: nama@gmail.com atau NISN"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.identifier 
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/20' 
                          : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100 bg-slate-50/40 focus:bg-white'
                      }`}
                    />
                  </div>
                  {fieldErrors.identifier ? (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.identifier}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">Bisa email pribadi (Gmail, dll.), email institusi, atau nomor NISN</p>
                  )}
                </div>

                {/* Field Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        showToast('info', 'Untuk bantuan akun atau reset password, silakan hubungi Guru BK / Admin Sekolah di Tata Usaha.', 'Bantuan Akun');
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.password 
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 bg-rose-50/20' 
                          : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100 bg-slate-50/40 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                      aria-label="Tampilkan atau sembunyikan password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Checkbox Ingat Saya */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                    />
                    <span>Ingat saya di perangkat ini</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Akun</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
                    className="text-xs text-slate-600 hover:text-emerald-700 font-medium"
                  >
                    Belum memiliki akun? <span className="font-bold text-emerald-700 underline">Daftar dengan email pribadi</span>
                  </button>
                </div>
              </form>
            ) : (
              /* FORM REGISTRASI ALUMNI BARU */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder="Contoh: Alzahra Rahmawati"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {registerErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1">{registerErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Pribadi *
                    </label>
                    <input
                      type="email"
                      required
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="nama@gmail.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    {registerErrors.email && (
                      <p className="text-[11px] text-rose-600 mt-1">{registerErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NISN <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={registerData.nisn}
                      onChange={(e) => setRegisterData({ ...registerData, nisn: e.target.value })}
                      placeholder="0058291xxx (bisa dikosongkan)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    {registerErrors.nisn && (
                      <p className="text-[11px] text-rose-600 mt-1">{registerErrors.nisn}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tahun Kelulusan (Angkatan) *
                    </label>
                    <select
                      value={registerData.angkatan}
                      onChange={(e) => setRegisterData({ ...registerData, angkatan: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value={2026}>2026</option>
                      <option value={2025}>2025</option>
                      <option value={2024}>2024</option>
                      <option value={2023}>2023</option>
                      <option value={2022}>2022</option>
                      <option value={2021}>2021</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Konsentrasi Keahlian / Jurusan *
                    </label>
                    <select
                      value={registerData.jurusan}
                      onChange={(e) => setRegisterData({ ...registerData, jurusan: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
                    >
                      <option value="PPLG">PPLG (Pengembangan Perangkat Lunak & Gim)</option>
                      <option value="DKV">DKV (Desain Komunikasi Visual)</option>
                      <option value="MPLB">MPLB (Manajemen Perkantoran)</option>
                      <option value="AKL">AKL (Akuntansi & Keuangan Lembaga)</option>
                      <option value="Bisnis Ritel">Bisnis Ritel / Pemasaran</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buat Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {registerErrors.password && (
                    <p className="text-[11px] text-rose-600 mt-1">{registerErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Daftar & Masuk Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setErrorMessage(null); }}
                    className="text-xs text-slate-600 hover:text-emerald-700 font-medium"
                  >
                    Sudah memiliki akun? <span className="font-bold text-emerald-700 underline">Masuk di sini</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
