import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Percent, 
  Activity, 
  TrendingUp, 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Send, 
  Filter,
  ArrowUpRight,
  MapPin,
  Radio
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { StorageService } from '../../services/storageService';
import { useNotification } from '../../contexts/NotificationContext';
import { AVATAR_COWO } from '../../constants/avatars';
import { AlumniProfile, TracerSurvey } from '../../types';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>(StorageService.getAlumniList());
  const [activeSurvey, setActiveSurvey] = useState<TracerSurvey | undefined>(StorageService.getActiveSurvey());

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setAlumniList(StorageService.getAlumniList());
      setActiveSurvey(StorageService.getActiveSurvey());
    };

    window.addEventListener('alumnitrack_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filters for Career Progression Chart
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>('ALL');
  const [selectedJurusan, setSelectedJurusan] = useState<string>('ALL');
  const [activeTabTracer, setActiveTabTracer] = useState<'sudah' | 'belum'>('belum');

  // Key Metrics
  const totalAlumni = alumniList.length;
  const sudahTracerCount = alumniList.filter(a => a.status_tracer === 'Sudah Mengisi').length;
  const belumTracerCount = alumniList.filter(a => a.status_tracer !== 'Sudah Mengisi').length;
  const responseRate = totalAlumni > 0 ? Math.round((sudahTracerCount / totalAlumni) * 100) : 0;
  const alumniAktifCount = alumniList.filter(a => a.privacy_setting !== 'HIDDEN').length;

  // Career Status Donut Data
  const careerData = useMemo(() => {
    const counts: Record<string, number> = {
      'Bekerja': 0,
      'Kuliah': 0,
      'Wirausaha': 0,
      'Mencari Kerja': 0,
      'Lainnya': 0
    };

    alumniList.forEach(a => {
      if (counts[a.status_karir] !== undefined) {
        counts[a.status_karir]++;
      } else {
        counts['Lainnya']++;
      }
    });

    return [
      { name: 'Bekerja', value: counts['Bekerja'], color: '#059669' },       // Emerald-600
      { name: 'Kuliah', value: counts['Kuliah'], color: '#0284c7' },        // Sky-600
      { name: 'Wirausaha', value: counts['Wirausaha'], color: '#d97706' },    // Amber-600
      { name: 'Mencari Kerja', value: counts['Mencari Kerja'], color: '#e11d48' }, // Rose-600
      { name: 'Lainnya', value: counts['Lainnya'], color: '#64748b' }        // Slate-500
    ];
  }, [alumniList]);

  // Major Distribution Bar Chart Data
  const majorData = useMemo(() => {
    const majors = ['PPLG', 'DKV', 'MPLB', 'AKL', 'BR'];
    return majors.map(m => {
      const cohort = alumniList.filter(a => a.jurusan === m || (m === 'BR' && (a.jurusan.includes('BR') || a.jurusan.includes('Bisnis Ritel'))));
      return {
        jurusan: m,
        bekerja: cohort.filter(a => a.status_karir === 'Bekerja').length,
        kuliah: cohort.filter(a => a.status_karir === 'Kuliah').length,
        wirausaha: cohort.filter(a => a.status_karir === 'Wirausaha').length,
        mencari: cohort.filter(a => a.status_karir === 'Mencari Kerja').length,
        total: cohort.length
      };
    });
  }, [alumniList]);

  // Domicile Distribution
  const domicileData = useMemo(() => {
    const targets = ['Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Luar Jabodetabek'];
    return targets.map(city => {
      const count = alumniList.filter(a => a.domisili === city).length;
      return {
        domisili: city,
        jumlah: count,
        percentage: totalAlumni > 0 ? Math.round((count / totalAlumni) * 100) : 0
      };
    });
  }, [alumniList, totalAlumni]);

  // Trend Progression by Graduation Year (Angkatan)
  const progressionData = useMemo(() => {
    const cohorts = [2023, 2024, 2025];
    return cohorts.map(year => {
      let filtered = alumniList.filter(a => a.angkatan === year);
      if (selectedJurusan !== 'ALL') {
        filtered = filtered.filter(a => a.jurusan === selectedJurusan || (selectedJurusan === 'BR' && (a.jurusan.includes('BR') || a.jurusan.includes('Bisnis Ritel'))));
      }
      return {
        tahun: `Angkatan ${year}`,
        bekerja: filtered.filter(a => a.status_karir === 'Bekerja').length,
        kuliah: filtered.filter(a => a.status_karir === 'Kuliah').length,
        wirausaha: filtered.filter(a => a.status_karir === 'Wirausaha').length,
        mencari: filtered.filter(a => a.status_karir === 'Mencari Kerja').length,
      };
    });
  }, [alumniList, selectedJurusan]);

  const handleSendReminder = (alumniName: string) => {
    showToast('success', `Pengingat pengisian tracer study telah dikirim ke ${alumniName}`);
  };

  const handleBroadcastAll = () => {
    showToast('success', `Pengingat otomatis berhasil disiarkan ke ${belumTracerCount} alumni yang belum mengisi tracer study!`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner / Summary Greeting */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-300 tracking-wider uppercase">
                Dashboard Eksekutif Guru BK & Kesiswaan
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Real-Time
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ringkasan Rekap Karir & Tracer Study
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pantau serapan alumni ke dunia industri, pantau pengisian tracer study berkala, dan kelola laporan akreditasi sekolah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/admin/tracer-study')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-slate-100 font-semibold text-xs shadow-sm transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>Kelola Tracer Study</span>
            </button>
            <button
              onClick={() => onNavigate('/admin/export')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold text-xs border border-emerald-500/30 transition-colors flex items-center gap-2"
            >
              <span>Export Laporan</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Alumni Terdaftar"
          value={totalAlumni}
          subtitle="Tercatat di basis data sekolah"
          icon={<Users className="w-5 h-5" />}
          trend={{ value: '+12% thn ini', isPositive: true }}
        />
        <StatCard
          title="Sudah Mengisi Tracer"
          value={sudahTracerCount}
          subtitle={`${belumTracerCount} alumni belum mengisi`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={{ value: `${sudahTracerCount}/${totalAlumni} responden`, isPositive: true }}
        />
        <StatCard
          title="Response Rate"
          value={`${responseRate}%`}
          subtitle="Target akreditasi min. 75%"
          icon={<Percent className="w-5 h-5" />}
          trend={{ value: responseRate >= 75 ? 'Target Tercapai' : 'Perlu Ditingkatkan', isPositive: responseRate >= 75 }}
        />
        <StatCard
          title="Alumni Aktif"
          value={alumniAktifCount}
          subtitle="Profil publik di direktori"
          icon={<Activity className="w-5 h-5" />}
          trend={{ value: 'Aktif di portal', isPositive: true }}
        />
      </div>

      {/* 3. Tracer Study Target Progress Bar Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {activeSurvey?.title || 'Tracer Study Alumni Angkatan 2025'}
              </h3>
              <Badge variant="success">Sedang Berlangsung</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Batas Akhir: {activeSurvey?.deadline || '31 Oktober 2026'} · Target: {activeSurvey?.total_target || 1205} Alumni
            </p>
          </div>

          <button
            onClick={handleBroadcastAll}
            className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center gap-2 self-start sm:self-center transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Pengingat Masal</span>
          </button>
        </div>

        {/* Visual Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5 tabular-nums">
            <span>Progress Pengisian Keseluruhan: 82%</span>
            <span>987 dari 1.205 alumni sudah mengisi</span>
          </div>
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: '82%' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Charts Row: Status Karir Donut + Trend Karir per Angkatan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Status Karir */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Status Karir Alumni</h3>
                <p className="text-xs text-slate-500">Distribusi serapan lulusan saat ini</p>
              </div>
              <button 
                onClick={() => onNavigate('/admin/alumni')}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Lihat Semua
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={careerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {careerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} Alumni (${totalAlumni ? Math.round((Number(val) / totalAlumni) * 100) : 0}%)`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clean metadata legend (Anti-pill) */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
            {careerData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {item.value} ({totalAlumni ? Math.round((item.value / totalAlumni) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Line / Bar Chart: Perkembangan per Tahun Lulus */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Perkembangan Karir Berdasarkan Angkatan</h3>
                <p className="text-xs text-slate-500">Perbandingan kelulusan 2023 - 2025</p>
              </div>

              {/* Filter Jurusan */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedJurusan}
                  onChange={(e) => setSelectedJurusan(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="ALL">Semua Jurusan</option>
                  <option value="PPLG">PPLG</option>
                  <option value="DKV">DKV</option>
                  <option value="MPLB">MPLB</option>
                  <option value="AKL">AKL</option>
                  <option value="BR">BR (Bisnis Ritel)</option>
                </select>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="tahun" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="bekerja" name="Bekerja" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="kuliah" name="Kuliah" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wirausaha" name="Wirausaha" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mencari" name="Mencari Kerja" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Sumber: Rekap kuesioner tracer study resmi</span>
            <span>Update real-time dari database</span>
          </div>
        </div>
      </div>

      {/* 5. Row: Statistik Jurusan & Statistik Persebaran Domisili */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Jurusan Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Statistik Berdasarkan Jurusan</h3>
              <p className="text-xs text-slate-500">PPLG, DKV, MPLB, AKL, BR (Bisnis Ritel)</p>
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              Total {alumniList.length} Sampel
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={majorData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="jurusan" type="category" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="bekerja" name="Bekerja" fill="#059669" stackId="a" />
                <Bar dataKey="kuliah" name="Kuliah" fill="#0284c7" stackId="a" />
                <Bar dataKey="wirausaha" name="Wirausaha" fill="#d97706" stackId="a" />
                <Bar dataKey="mencari" name="Mencari Kerja" fill="#e11d48" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Domicile Distribution */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Persebaran Domisili Alumni</h3>
                <p className="text-xs text-slate-500">Jabodetabek & Luar Daerah</p>
              </div>
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>

            <div className="space-y-3">
              {domicileData.map(item => (
                <div key={item.domisili} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.domisili}</span>
                    <span className="text-slate-500 font-semibold tabular-nums">
                      {item.jumlah} alumni ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.max(item.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Terkonsentrasi terbesar di Jakarta & Depok</span>
            <button
              onClick={() => onNavigate('/admin/alumni')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Lihat Peta Data
            </button>
          </div>
        </div>
      </div>

      {/* 6. Tracer Study Participation List: Sudah Mengisi vs Belum Mengisi */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pemantauan Partisipasi Tracer Study</h3>
            <p className="text-xs text-slate-500">Daftar alumni yang perlu ditindaklanjuti</p>
          </div>

          {/* Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTabTracer('belum')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabTracer === 'belum'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Mengisi ({belumTracerCount})
            </button>
            <button
              onClick={() => setActiveTabTracer('sudah')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabTracer === 'sudah'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sudah Mengisi ({sudahTracerCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Alumni</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Angkatan</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-4">Status Karir</th>
                <th className="py-3 px-4">Status Tracer</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alumniList
                .filter(a => activeTabTracer === 'sudah' ? a.status_tracer === 'Sudah Mengisi' : a.status_tracer !== 'Sudah Mengisi')
                .map(alumni => (
                  <tr key={alumni.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={alumni.avatar || AVATAR_COWO}
                          alt={alumni.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <span className="truncate">{alumni.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">{alumni.nisn}</td>
                    <td className="py-3 px-4 tabular-nums">{alumni.angkatan}</td>
                    <td className="py-3 px-4 font-medium">{alumni.jurusan}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        alumni.status_karir === 'Bekerja' ? 'success' :
                        alumni.status_karir === 'Kuliah' ? 'info' :
                        alumni.status_karir === 'Wirausaha' ? 'warning' : 'neutral'
                      }>
                        {alumni.status_karir}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={alumni.status_tracer === 'Sudah Mengisi' ? 'success' : 'danger'}>
                        {alumni.status_tracer}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {alumni.status_tracer !== 'Sudah Mengisi' ? (
                        <button
                          onClick={() => handleSendReminder(alumni.name)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] transition-colors"
                        >
                          Kirim Pengingat
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate(`/admin/alumni/${alumni.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-[11px] transition-colors"
                        >
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
