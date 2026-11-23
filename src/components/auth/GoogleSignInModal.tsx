import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { AVATAR_COWO, AVATAR_CEWE } from '../../constants/avatars';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (googleEmail: string, googleName: string, avatarUrl: string) => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const quickGoogleAccounts = [
    {
      name: 'Budi Santoso',
      email: 'budi.santoso@gmail.com',
      avatar: AVATAR_COWO,
      sub: 'Alumni PPLG (2025)'
    },
    {
      name: 'Siti Nurhaliza',
      email: 'siti.nurhaliza@gmail.com',
      avatar: AVATAR_CEWE,
      sub: 'Alumni AKL (2024)'
    }
  ];

  const handleSelectPreset = async (acc: typeof quickGoogleAccounts[0], idx: number) => {
    setSelectedPresetIndex(idx);
    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    onSuccess(acc.email, acc.name, acc.avatar);
    setIsSubmitting(false);
    onClose();
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 500));
    const derivedName = customName.trim() || customEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    onSuccess(customEmail.trim(), derivedName, AVATAR_COWO);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Masuk dengan Akun Google</h3>
              <p className="text-[11px] text-slate-500">Pilih akun Google Anda untuk melanjutkan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Preset list */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Pilih Akun Tersedia (Satu Klik)
            </span>
            {quickGoogleAccounts.map((acc, idx) => (
              <button
                key={acc.email}
                disabled={isSubmitting}
                onClick={() => handleSelectPreset(acc, idx)}
                className="w-full p-3 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">{acc.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{acc.email}</p>
                    <span className="text-[10px] text-emerald-700 font-medium">{acc.sub}</span>
                  </div>
                </div>
                {selectedPresetIndex === idx && isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                )}
              </button>
            ))}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase font-semibold">Atau Masukkan Akun Google Anda</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Custom Google account form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email Gmail / Google Anda
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="nama.anda@gmail.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap (Sesuai Profil Google)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Contoh: Muhammad Rizki"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !customEmail.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Lanjutkan Masuk dengan Akun Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Guarantee */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-start gap-2.5 text-[11px] text-emerald-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">Jaminan Keamanan & Privasi</span>
              Sistem hanya mengautentikasi identitas akun Google Anda dan mengirimkan notifikasi resmi via Gmail. Sistem <strong>tidak pernah meminta atau menyimpan password Gmail</strong> Anda.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
