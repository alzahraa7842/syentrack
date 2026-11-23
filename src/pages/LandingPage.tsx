import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  TrendingUp, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  ExternalLink,
  Radio,
  UserX
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

const DEFAULT_HERO_IMAGE = '/src/assets/images/hero_alumni_careers_1790318409918.jpg';

// Largest-remainder rounding so percentages always sum exactly to 100%
function calculateExactPercentages(counts: number[], total: number): number[] {
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map(c => (c / total) * 100);
  const floored = raw.map(v => Math.floor(v));
  let remainder = 100 - floored.reduce((acc, v) => acc + v, 0);
  const indices = raw
    .map((v, i) => ({ frac: v - floored[i], i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < indices.length; k++) {
    floored[indices[k].i] += 1;
  }
  return floored;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [schoolSettings, setSchoolSettings] = useState(StorageService.getSchoolSettings());
  const [alumniList, setAlumniList] = useState(StorageService.getAlumniList());
  const [jobs, setJobs] = useState(StorageService.getJobs());
  const [heroImgError, setHeroImgError] = useState(false);

  // Real-time synchronization whenever data changes in the system
  useEffect(() => {
    const handleDataChange = () => {
      setSchoolSettings(StorageService.getSchoolSettings());
      setAlumniList(StorageService.getAlumniList());
      setJobs(StorageService.getJobs());
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleDataChange();
      }
    };

    window.addEventListener('alumnitrack_data_changed', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    window.addEventListener('focus', handleDataChange);
    document.addEventListener('visibilitychange', handleVisibility);

    // Lightweight periodic sync every 2s for seamless real-time reflection
    const interval = window.setInterval(handleDataChange, 2000);

    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
      window.removeEventListener('focus', handleDataChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setHeroImgError(false);
  }, [schoolSettings.landing_hero_image]);

  // Aggregate real-time public statistics that strictly sum to totalAlumni
  const totalAlumni = alumniList.length;
  const countBekerja = alumniList.filter(a => a.status_karir === 'Bekerja').length;
  const countKuliah = alumniList.filter(a => a.status_karir === 'Kuliah').length;
  const countWirausaha = alumniList.filter(a => a.status_karir === 'Wirausaha').length;
  // Mencari Kerja, Tidak Bekerja, Lainnya -> Alumni Belum Bekerja
  const countBelumBekerja = totalAlumni - (countBekerja + countKuliah + countWirausaha);

  const [pctBekerja, pctKuliah, pctWirausaha, pctBelumBekerja] = calculateExactPercentages(
    [countBekerja, countKuliah, countWirausaha, countBelumBekerja],
    totalAlumni
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Universal Top Bar Contract: Zone 1 Single Wordmark | Zone 2 Clean Links | Zone 3 Action */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              AlumniTrack
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#beranda" className="hover:text-emerald-700 transition-colors">Beranda</a>
            <a href="#tentang" className="hover:text-emerald-700 transition-colors">Tentang</a>
            <a href="#statistik" className="hover:text-emerald-700 transition-colors">Statistik Alumni</a>
            <a href="#pusat-karir" className="hover:text-emerald-700 transition-colors">Pusat Karir</a>
            <a href="#kontak" className="hover:text-emerald-700 transition-colors">Kontak</a>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('/register')}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              Daftar Mandiri
            </button>
            <button
              onClick={() => onNavigate('/login')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              Masuk Sistem
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="beranda" className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden bg-radial from-emerald-900/10 via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Portal Tracer Study & Bursa Kerja Khusus (BKK)
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
                Rekap Karir Alumni & Tracer Study Terpadu
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed text-pretty">
                Pantau perjalanan karier alumni, tingkatkan kualitas lulusan, dan bangun jejaring alumni yang lebih kuat secara akuntabel dan transparan.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => onNavigate('/register')}
                  className="px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Daftar Akun Siswa Mandiri</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('/login')}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm shadow-xs transition-colors cursor-pointer"
                >
                  Masuk Portal (Alumni / Admin)
                </button>
              </div>

              {/* Quick Trust Markers */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sesuai Standar Akreditasi
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Keamanan Privasi Data
                </span>
              </div>
            </div>

            {/* Visual Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 aspect-16/10 bg-slate-900">
                {!heroImgError && (
                  <img
                    src={schoolSettings.landing_hero_image || DEFAULT_HERO_IMAGE}
                    alt="Alumni Prestasi Berkarir"
                    className="w-full h-full object-cover opacity-90"
                    onError={() => setHeroImgError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                    {schoolSettings.name}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {schoolSettings.landing_hero_caption || 'Mewujudkan Lulusan Siap Kerja, Berdaya Saing & Berakhlak Mulia'}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section Statistik Publik (Tabular Figures & Real-Time Reconciliation) */}
      <section id="statistik" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Data Statistik Real-Time
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Statistik Keterserapan Lulusan
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Data riil hasil penelusuran tracer study lulusan {schoolSettings.name}
            </p>
          </div>

          {/* Total Summary Bar */}
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                  Total Alumni Terdata
                </span>
                <div className="text-3xl font-extrabold tabular-nums">
                  {totalAlumni.toLocaleString('id-ID')} <span className="text-sm font-medium text-emerald-200">Alumni</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-200 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 tabular-nums">
              Rekapitulasi: <strong>{countBekerja}</strong> Bekerja + <strong>{countKuliah}</strong> Kuliah + <strong>{countWirausaha}</strong> Wirausaha + <strong>{countBelumBekerja}</strong> Belum Bekerja = <strong>{totalAlumni} Total</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-700 tabular-nums">
                {countBekerja.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wider">
                Alumni Bekerja ({pctBekerja}%)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 mx-auto flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-sky-700 tabular-nums">
                {countKuliah.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wider">
                Alumni Kuliah ({pctKuliah}%)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-amber-700 tabular-nums">
                {countWirausaha.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wider">
                Alumni Wirausaha ({pctWirausaha}%)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-center">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center mb-3">
                <UserX className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-rose-700 tabular-nums">
                {countBelumBekerja.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1 uppercase tracking-wider">
                Alumni Belum Bekerja ({pctBelumBekerja}%)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section Tentang Tracer Study & BKK */}
      <section id="tentang" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Tentang AlumniTrack
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                Membantu Sekolah Menyelaraskan Kurikulum dengan Kebutuhan Industri
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tracer study bukan sekadar survei kelulusan. Sistem ini memungkinkan sekolah mengukur relevansi materi ajar kejuruan dengan tuntutan dunia kerja terkini, memberikan evaluasi berkala bagi pendidik, serta memfasilitasi penyerapan tenaga kerja melalui lowongan terverifikasi.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Kuesioner interaktif berbasis wizard ramah gawai
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Penyusunan laporan siap cetak untuk akreditasi BAN-SM
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Pusat lowongan kerja dan beasiswa eksklusif alumni
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-900">
                Alur Partisipasi Alumni
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Login dengan NISN / Email</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Gunakan NISN semasa sekolah atau email terdaftar untuk masuk secara aman.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Perbarui Profil & Karir</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Cantumkan status bekerja, universitas tempat kuliah, atau usaha mandiri Anda.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Isi Tracer Study & Akses Peluang</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Jawab kuesioner singkat dan temukan lowongan kerja terbaru dari mitra industri.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section Pusat Karir Publik */}
      <section id="pusat-karir" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Bursa Kerja Khusus
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                Peluang Karir & Beasiswa Terbaru
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/login')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5"
            >
              Lihat Semua Lowongan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {jobs.slice(0, 3).map(job => (
              <div key={job.id} className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-medium text-emerald-700">{job.category}</span>
                    <span className="tabular-nums">Batas: {job.deadline}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                  </p>
                  <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{job.location}</span>
                  <button
                    onClick={() => onNavigate('/login')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                  >
                    Detail & Lamar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Footer & Kontak */}
      <footer id="kontak" className="bg-slate-900 text-slate-300 pt-16 pb-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-white tracking-tight">
                  {schoolSettings.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {schoolSettings.tagline}. Melayani pendataan alumni, monitoring karir lulusan, tracer study resmi, dan jembatan kolaborasi sekolah dengan dunia usaha/industri.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Navigasi Cepat
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#beranda" className="hover:text-white transition-colors">Beranda</a></li>
                <li><a href="#statistik" className="hover:text-white transition-colors">Statistik Keterserapan</a></li>
                <li><a href="#pusat-karir" className="hover:text-white transition-colors">Pusat Karir & Magang</a></li>
                <li><button onClick={() => onNavigate('/login')} className="hover:text-white transition-colors">Portal Login</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Kontak Sekolah
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{schoolSettings.address}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{schoolSettings.phone}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{schoolSettings.email}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {schoolSettings.name}. Hak Cipta Dilindungi Undang-Undang.</p>
            <p className="text-slate-400">AlumniTrack — Rekap Karir Alumni & Tracer Study</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
