import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  GraduationCap, 
  Linkedin, 
  ExternalLink,
  Users,
  RotateCcw
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { AlumniProfile } from '../../types';
import { Badge } from '../../components/common/Badge';
import { AVATAR_COWO } from '../../constants/avatars';

export const AlumniDirectoryPage: React.FC = () => {
  const allAlumni = StorageService.getAlumniList();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterJurusan, setFilterJurusan] = useState('ALL');
  const [filterDomisili, setFilterDomisili] = useState('ALL');
  const [filterStatusKarir, setFilterStatusKarir] = useState('ALL');

  // Filter visible alumni (Privacy: only PUBLIC is shown to alumni directory)
  const visibleAlumni = useMemo(() => {
    return allAlumni.filter(a => {
      // Privacy check: don't show HIDDEN or ADMIN_ONLY profiles
      if (a.privacy_setting !== 'PUBLIC') return false;

      const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.job_company && a.job_company.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (a.edu_university && a.edu_university.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (a.biz_name && a.biz_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchAngkatan = filterAngkatan === 'ALL' || a.angkatan.toString() === filterAngkatan;
      const matchJurusan = filterJurusan === 'ALL' || a.jurusan === filterJurusan || (filterJurusan === 'BR' && (a.jurusan.includes('BR') || a.jurusan.includes('Bisnis Ritel')));
      const matchDomisili = filterDomisili === 'ALL' || a.domisili === filterDomisili;
      const matchStatus = filterStatusKarir === 'ALL' || a.status_karir === filterStatusKarir;

      return matchSearch && matchAngkatan && matchJurusan && matchDomisili && matchStatus;
    });
  }, [allAlumni, searchQuery, filterAngkatan, filterJurusan, filterDomisili, filterStatusKarir]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterAngkatan('ALL');
    setFilterJurusan('ALL');
    setFilterDomisili('ALL');
    setFilterStatusKarir('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Direktori Jejaring Alumni
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Temukan rekan satu angkatan, bangun koneksi lintas jurusan, dan perluas jejaring profesional di berbagai industri
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kantor, kampus..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Filter Angkatan */}
          <div>
            <select
              value={filterAngkatan}
              onChange={(e) => setFilterAngkatan(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              <option value="ALL">Semua Angkatan</option>
              <option value="2025">Angkatan 2025</option>
              <option value="2024">Angkatan 2024</option>
              <option value="2023">Angkatan 2023</option>
            </select>
          </div>

          {/* Filter Jurusan */}
          <div>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              <option value="ALL">Semua Jurusan</option>
              <option value="PPLG">PPLG</option>
              <option value="DKV">DKV</option>
              <option value="MPLB">MPLB</option>
              <option value="AKL">AKL</option>
              <option value="BR">BR (Bisnis Ritel)</option>
            </select>
          </div>

          {/* Filter Domisili */}
          <div>
            <select
              value={filterDomisili}
              onChange={(e) => setFilterDomisili(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              <option value="ALL">Semua Domisili</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Bogor">Bogor</option>
              <option value="Depok">Depok</option>
              <option value="Tangerang">Tangerang</option>
              <option value="Bekasi">Bekasi</option>
              <option value="Luar Jabodetabek">Luar Jabodetabek</option>
            </select>
          </div>

          {/* Filter Status Karir */}
          <div>
            <select
              value={filterStatusKarir}
              onChange={(e) => setFilterStatusKarir(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="Bekerja">Bekerja</option>
              <option value="Kuliah">Kuliah</option>
              <option value="Wirausaha">Wirausaha</option>
              <option value="Mencari Kerja">Mencari Kerja</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Menampilkan <strong className="text-slate-800 tabular-nums">{visibleAlumni.length}</strong> alumni terdaftar publik</span>
          {(searchQuery || filterAngkatan !== 'ALL' || filterJurusan !== 'ALL' || filterDomisili !== 'ALL' || filterStatusKarir !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Alumni Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleAlumni.map(alumni => (
          <div
            key={alumni.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <img
                  src={alumni.avatar || AVATAR_COWO}
                  alt={alumni.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                />

                <Badge variant={
                  alumni.status_karir === 'Bekerja' ? 'success' :
                  alumni.status_karir === 'Kuliah' ? 'info' :
                  alumni.status_karir === 'Wirausaha' ? 'warning' : 'neutral'
                }>
                  {alumni.status_karir}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {alumni.name}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Lulusan <strong>{alumni.angkatan}</strong> · {alumni.jurusan}
              </p>

              {/* Career / Education Details */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                {(alumni.job_company || alumni.edu_university || alumni.biz_name) && (
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 line-clamp-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{alumni.job_company || alumni.edu_university || alumni.biz_name}</span>
                  </p>
                )}

                {(alumni.job_position || alumni.edu_major || alumni.biz_field) && (
                  <p className="text-slate-500 line-clamp-1 pl-5">
                    {alumni.job_position || alumni.edu_major || alumni.biz_field}
                  </p>
                )}

                <p className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{alumni.domisili}</span>
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              {alumni.linkedin_url ? (
                <a
                  href={alumni.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3 text-sky-500" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Alumni Terverifikasi</span>
              )}

              <span className="text-[11px] text-slate-400 tabular-nums">
                Update {alumni.updated_at}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
