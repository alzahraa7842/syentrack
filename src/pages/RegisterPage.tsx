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
  User,
  Hash,
  Phone,
  Calendar,
  Building,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { StorageService } from '../services/storageService';
import { AVATAR_OPTIONS, AVATAR_COWO, AVATAR_CEWE } from '../constants/avatars';
import { GoogleSignInModal } from '../components/auth/GoogleSignInModal';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register, loginWithGoogle, isLoading } = useAuth();
  const { showToast } = useNotification();
  const schoolSettings = StorageService.getSchoolSettings();

  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    angkatan: 2025,
    jurusan: 'PPLG',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    avatar: AVATAR_COWO,
    receive_email_notifications: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim() || !formData.nisn.trim() || !formData.email.trim()) {
      setErrorMessage('Nama Lengkap, NISN, dan Alamat Email wajib diisi.');
      return;
    }

    if (formData.nisn.trim().length < 5) {
      setErrorMessage('Nomor NISN harus terdiri dari minimal 5 digit angka.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Kata sandi harus minimal 6 karakter demi keamanan akun Anda.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    const result = await register({
      name: formData.name,
      nisn: formData.nisn,
      angkatan: Number(formData.angkatan),
      jurusan: formData.jurusan,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      avatar: formData.avatar,
      receive_email_notifications: formData.receive_email_notifications
    });

    if (!result.success) {
      setErrorMessage(result.message);
      showToast('error', result.message, 'Gagal Registrasi');
    } else {
      showToast('success', 'Akun Anda berhasil dibuat! Selamat datang di AlumniTrack.', 'Pendaftaran Sukses');
      onNavigate('/alumni/dashboard');
    }
  };

  const handleGoogleSuccess = async (googleEmail: string, googleName: string, avatarUrl: string) => {
    const res = await loginWithGoogle(googleEmail, googleName, avatarUrl);
    if (res.success) {
      showToast('success', `Berhasil masuk sebagai ${googleName}`, 'Google Sign-In Sukses');
      onNavigate('/alumni/dashboard');
    } else {
      showToast('error', res.message, 'Gagal Masuk Google');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Left Branding Column */}
        <div className="lg:col-span-4 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl" />

          <div className="relative z-10">
            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2.5 text-white/90 hover:text-white transition-colors group mb-6"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-xl font-bold tracking-tight">AlumniTrack</span>
            </button>

            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Registrasi Akun Siswa Mandiri
            </h2>
            <p className="text-xs text-emerald-200/80 mt-2 leading-relaxed">
              {schoolSettings.name}
            </p>
          </div>

          <div className="relative z-10 py-6 my-auto space-y-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Kebijakan Keamanan Akun
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Setiap siswa bertanggung jawab penuh mengelola akun dan kata sandi sendiri. Admin tidak dapat membuatkan akun siswa secara manual demi menjaga keaslian data.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur-xs space-y-2 text-xs text-emerald-200">
              <p className="font-semibold text-white">Keuntungan Akun Alumni:</p>
              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Akses langsung Bursa Kerja & Magang
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Notifikasi event resmi ke email Google
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Jejaring direktori & forum alumni
                </li>
              </ul>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-emerald-800/60 text-[11px] text-emerald-300/70 flex items-center justify-between">
            <span>Sudah punya akun?</span>
            <button
              onClick={() => onNavigate('/login')}
              className="text-white font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Masuk di sini <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-8 p-6 sm:p-10 flex flex-col justify-center bg-white overflow-y-auto max-h-[85vh] lg:max-h-none">
          <div className="max-w-xl w-full mx-auto space-y-5">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Pendaftaran Siswa Baru / Alumni
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Buat Akun Mandiri ✨
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lengkapi biodata diri Anda untuk mengakses tracer study, bursa kerja, dan notifikasi sekolah.
              </p>
            </div>

            {/* Google Sign In Quick Button */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Ingin lebih cepat & terhubung dengan Gmail?</p>
                <p className="text-[11px] text-slate-500">Daftar atau masuk langsung dengan Akun Google Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Daftar dengan Google</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Self Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar Selector (2 characters: Cowo / Cewe) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilih Karakter Avatar Profil (2 Pilihan)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {AVATAR_OPTIONS.map(opt => {
                    const isSelected = formData.avatar === opt.url;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setFormData(prev => ({ ...prev, avatar: opt.url }))}
                        className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={opt.url}
                            alt={opt.label}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200"
                          />
                          {isSelected && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{opt.shortLabel}</p>
                          <p className="text-[10px] text-slate-500">{opt.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 1: Nama & NISN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contoh: Ahmad Fauzan"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor NISN (10 Digit) *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.nisn}
                      onChange={(e) => setFormData(prev => ({ ...prev, nisn: e.target.value.replace(/\D/g, '') }))}
                      placeholder="0061829102"
                      maxLength={10}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Angkatan & Jurusan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Lulus (Angkatan) *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={formData.angkatan}
                      onChange={(e) => setFormData(prev => ({ ...prev, angkatan: Number(e.target.value) }))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(yr => (
                        <option key={yr} value={yr}>Angkatan {yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kompetensi Keahlian / Jurusan *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={formData.jurusan}
                      onChange={(e) => setFormData(prev => ({ ...prev, jurusan: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="PPLG">PPLG (Pengembangan Perangkat Lunak & Gim)</option>
                      <option value="DKV">DKV (Desain Komunikasi Visual)</option>
                      <option value="MPLB">MPLB (Manajemen Perkantoran & Layanan Bisnis)</option>
                      <option value="AKL">AKL (Akuntansi & Keuangan Lembaga)</option>
                      <option value="BR (Bisnis Ritel)">BR (Bisnis Ritel)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Email & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Aktif (Gmail) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="siswa@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP Aktif
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="0812-3456-7890"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Akun (Min. 6 Karakter) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email Notifications Toggle */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.receive_email_notifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, receive_email_notifications: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                  />
                  <span>Kirimkan notifikasi event & lowongan baru ke alamat email Gmail saya</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Daftarkan Akun Siswa Saya</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Sudah memiliki akun terdaftar?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Masuk di Sini
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={handleGoogleSuccess}
      />
    </div>
  );
};
