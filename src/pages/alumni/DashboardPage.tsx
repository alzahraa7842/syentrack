import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  GraduationCap, 
  Briefcase, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  Building2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../services/storageService';
import { AlumniProfile } from '../../types';
import { Badge } from '../../components/common/Badge';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const AlumniDashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, alumniProfile } = useAuth();
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    const sync = () => setSyncTick(t => t + 1);
    window.addEventListener('alumnitrack_data_changed', sync);
    return () => window.removeEventListener('alumnitrack_data_changed', sync);
  }, []);

  const activeSurvey = StorageService.getActiveSurvey();
  const jobs = StorageService.getJobs();

  // Find alumni record with robust fallback to logged in user
  const currentAlumni: AlumniProfile = alumniProfile || 
    (user ? StorageService.getAlumniByUserId(user.id, user.email, user.nisn) : undefined) || 
    StorageService.getAlumniList().find(a => user && ((user.email && a.email.toLowerCase() === user.email.toLowerCase()) || (user.nisn && a.nisn === user.nisn))) || 
    {
      id: 999,
      user_id: user?.id || 999,
      name: user?.name || 'Alumni',
      nisn: user?.nisn || '0000000000',
      angkatan: 2025,
      jurusan: 'PPLG',
      email: user?.email || 'alumni@sekolah.sch.id',
      phone: '0812-0000-0000',
      domisili: 'Jakarta',
      status_karir: 'Bekerja',
      status_tracer: 'Belum Mengisi',
      privacy_setting: 'PUBLIC',
      updated_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
    };
  const isTracerCompleted = currentAlumni.status_tracer === 'Sudah Mengisi';

  // Calculate profile completion percentage
  let completedFields = 4; // name, nisn, angkatan, jurusan always present
  if (currentAlumni.phone) completedFields++;
  if (currentAlumni.domisili) completedFields++;
  if (currentAlumni.status_karir) completedFields++;
  if (currentAlumni.linkedin_url) completedFields++;
  if (currentAlumni.job_company || currentAlumni.edu_university || currentAlumni.biz_name) completedFields++;
  const profilePercentage = Math.min(100, Math.round((completedFields / 9) * 100));

  return (
    <div className="space-y-6">
      {/* 1. Welcome Greeting Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-emerald-300 tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Portal Karir & Jejaring Alumni
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Halo, {user?.name || currentAlumni.name}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Selamat datang di portal AlumniTrack. Pantau peluang karir terbaru, isi kuesioner tracer study, dan perluas jejaring sesama lulusan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isTracerCompleted ? (
              <button
                onClick={() => onNavigate('/alumni/tracer-study')}
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-bold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <span>Isi Tracer Study Sekarang</span>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tracer Study Telah Diisi</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Status Cards: Profil, Status Karir, Angkatan, Tracer Study */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider">Profil Saya</span>
              <UserCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-lg font-bold text-slate-900 truncate">
              {currentAlumni.name}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              NISN: {currentAlumni.nisn}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Kelengkapan</span>
            <span className="font-bold text-emerald-700 tabular-nums">{profilePercentage}%</span>
          </div>
        </div>

        {/* Status Karir Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider">Status Karir</span>
              <Briefcase className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                currentAlumni.status_karir === 'Bekerja' ? 'success' :
                currentAlumni.status_karir === 'Kuliah' ? 'info' :
                currentAlumni.status_karir === 'Wirausaha' ? 'warning' : 'neutral'
              }>
                {currentAlumni.status_karir}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-2 truncate font-medium">
              {currentAlumni.job_company || currentAlumni.edu_university || currentAlumni.biz_name || 'Belum diisi'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => onNavigate('/alumni/profile')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Perbarui Karir →
            </button>
          </div>
        </div>

        {/* Angkatan Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider">Angkatan Kelulusan</span>
              <GraduationCap className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {currentAlumni.angkatan}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Konsentrasi Keahlian {currentAlumni.jurusan}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => onNavigate('/alumni/directory')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Cari Teman Seangkatan →
            </button>
          </div>
        </div>

        {/* Tracer Study Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider">Tracer Study</span>
              <Calendar className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isTracerCompleted ? 'success' : 'danger'}>
                {isTracerCompleted ? '✓ Sudah Diisi' : 'Belum Diisi'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-2 tabular-nums">
              Batas: {activeSurvey?.deadline || '31 Oktober 2026'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <button
              onClick={() => onNavigate('/alumni/tracer-study')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              {isTracerCompleted ? 'Lihat Jawaban →' : 'Isi Kuesioner Sekarang →'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Profile Progress Card & Alert Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Completion Box */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Progres Kelengkapan Profil</h3>
            <span className="text-xs font-bold text-emerald-700 tabular-nums">{profilePercentage}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${profilePercentage}%` }}
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Lengkapi data riwayat karir, kontak telepon aktif, sertifikat keahlian, dan portofolio untuk mempermudah mitra industri menjangkau Anda.
          </p>

          <button
            onClick={() => onNavigate('/alumni/profile')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Lengkapi Profil Karir Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tracer Study Alert Card */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Periode Survei Aktif
              </span>
              <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Sisa Waktu 35 Hari
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900">
              {activeSurvey?.title || 'Tracer Study Alumni Angkatan 2025'}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Partisipasi Anda sangat berharga bagi sekolah untuk mengevaluasi kurikulum kejuruan dan pemenuhan standar mutu akreditasi nasional.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Estimasi waktu: ± 5 menit</span>
            <button
              onClick={() => onNavigate('/alumni/tracer-study')}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors"
            >
              {isTracerCompleted ? 'Perbarui Jawaban' : 'Mulai Isi Kuesioner'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Latest Career Postings for Alumni */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Peluang Karir & Beasiswa Terbaru</h3>
            <p className="text-xs text-slate-500">Direkomendasikan oleh Bursa Kerja Khusus sekolah</p>
          </div>
          <button
            onClick={() => onNavigate('/alumni/jobs')}
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
          >
            Lihat Semua Lowongan <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jobs.slice(0, 3).map(job => (
            <div key={job.id} className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold text-emerald-700">{job.category}</span>
                  <span className="tabular-nums">Batas: {job.deadline}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{job.title}</h4>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{job.location}</span>
                <button
                  onClick={() => onNavigate('/alumni/jobs')}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Lamar Sekarang
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
