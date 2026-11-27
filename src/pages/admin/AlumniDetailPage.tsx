import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Calendar, 
  ExternalLink, 
  Download, 
  FileText, 
  Award, 
  Linkedin,
  ShieldCheck
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Badge } from '../../components/common/Badge';
import { useNotification } from '../../contexts/NotificationContext';
import { AVATAR_COWO } from '../../constants/avatars';

interface AlumniDetailPageProps {
  alumniId: number;
  onNavigate: (path: string) => void;
}

export const AlumniDetailPage: React.FC<AlumniDetailPageProps> = ({ alumniId, onNavigate }) => {
  const { showToast } = useNotification();
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    const sync = () => setSyncTick(t => t + 1);
    window.addEventListener('alumnitrack_data_changed', sync);
    return () => window.removeEventListener('alumnitrack_data_changed', sync);
  }, []);

  const alumni = StorageService.getAlumniById(alumniId);
  const careerHistories = StorageService.getCareerHistories(alumniId);
  const documents = StorageService.getDocuments(alumniId);

  if (!alumni) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800">Alumni Tidak Ditemukan</h3>
        <p className="text-xs text-slate-500 mt-1">Data alumni yang Anda cari mungkin telah dihapus.</p>
        <button
          onClick={() => onNavigate('/admin/alumni')}
          className="mt-4 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
        >
          Kembali ke Daftar Alumni
        </button>
      </div>
    );
  }

  const handleDownloadFile = (docName: string) => {
    showToast('info', `Mengunduh berkas ${docName}...`);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('/admin/alumni')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Data Alumni
        </button>

        <div className="flex items-center gap-2">
          <Badge variant={alumni.privacy_setting === 'PUBLIC' ? 'success' : 'neutral'}>
            Privasi: {alumni.privacy_setting}
          </Badge>
          <Badge variant={alumni.status_tracer === 'Sudah Mengisi' ? 'success' : 'danger'}>
            Tracer: {alumni.status_tracer}
          </Badge>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <img
            src={alumni.avatar || AVATAR_COWO}
            alt={alumni.name}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-md"
          />

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {alumni.name}
              </h2>
              <Badge variant={
                alumni.status_karir === 'Bekerja' ? 'success' :
                alumni.status_karir === 'Kuliah' ? 'info' :
                alumni.status_karir === 'Wirausaha' ? 'warning' : 'neutral'
              }>
                {alumni.status_karir}
              </Badge>
            </div>

            <p className="text-xs font-medium text-slate-500">
              Lulusan Angkatan <span className="font-bold text-slate-800 tabular-nums">{alumni.angkatan}</span> · Konsentrasi Keahlian <span className="font-bold text-slate-800">{alumni.jurusan}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> NISN: {alumni.nisn}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {alumni.domisili}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {alumni.email}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {alumni.phone}
              </span>
            </div>
          </div>
        </div>

        {alumni.linkedin_url && (
          <a
            href={alumni.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold flex items-center gap-2 self-center sm:self-auto transition-colors"
          >
            <Linkedin className="w-4 h-4 text-sky-700" />
            <span>Lihat Profil LinkedIn</span>
            <ExternalLink className="w-3 h-3 text-sky-600" />
          </a>
        )}
      </div>

      {/* Grid: Detail Karir Saat Ini & Riwayat Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Data Karir / Pendidikan Saat Ini */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-700" /> Status Karir Saat Ini
            </h3>

            {alumni.status_karir === 'Bekerja' && (
              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Perusahaan</span>
                  <span className="font-semibold text-slate-900">{alumni.job_company || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Posisi / Jabatan</span>
                  <span className="font-semibold text-slate-900">{alumni.job_position || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Bidang Industri</span>
                  <span className="font-semibold text-slate-900">{alumni.job_industry || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Lokasi Kerja</span>
                  <span className="font-semibold text-slate-900">{alumni.job_location || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Jenis Pekerjaan</span>
                  <span className="font-semibold text-slate-900">{alumni.job_type || 'Full-time'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Tanggal Mulai Bekerja</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{alumni.job_start_date || '-'}</span>
                </div>
              </div>
            )}

            {alumni.status_karir === 'Kuliah' && (
              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Perguruan Tinggi</span>
                  <span className="font-semibold text-slate-900">{alumni.edu_university || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Program Studi</span>
                  <span className="font-semibold text-slate-900">{alumni.edu_major || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Jenjang Pendidikan</span>
                  <span className="font-semibold text-slate-900">{alumni.edu_degree || 'S1'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Kota / Lokasi Kampus</span>
                  <span className="font-semibold text-slate-900">{alumni.edu_location || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Tahun Masuk</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{alumni.edu_start_year || '-'}</span>
                </div>
              </div>
            )}

            {alumni.status_karir === 'Wirausaha' && (
              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Nama Usaha / Bisnis</span>
                  <span className="font-semibold text-slate-900">{alumni.biz_name || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Bidang Usaha</span>
                  <span className="font-semibold text-slate-900">{alumni.biz_field || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Lokasi Usaha</span>
                  <span className="font-semibold text-slate-900">{alumni.biz_location || '-'}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Tahun Mulai</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{alumni.biz_start_year || '-'}</span>
                </div>
              </div>
            )}

            {alumni.status_karir === 'Mencari Kerja' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Alumni sedang aktif mencari kesempatan kerja atau pelatihan lanjutan yang sesuai dengan kompetensi jurusan {alumni.jurusan}.
              </div>
            )}
          </div>

          {/* Dokumen Portofolio & CV */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" /> Berkas Portofolio, CV & Sertifikat
            </h3>

            {documents.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                Belum ada dokumen yang diunggah oleh alumni.
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map(doc => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        PDF
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{doc.name}</p>
                        <p className="text-[11px] text-slate-400 tabular-nums">
                          {doc.category} · {(doc.file_size_kb / 1024).toFixed(2)} MB · {doc.upload_date}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadFile(doc.name)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Unduh Berkas"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Riwayat Karir Timeline */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" /> Riwayat Perjalanan Karir (Timeline)
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">
              {careerHistories.length} Pengalaman
            </span>
          </div>

          {careerHistories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada riwayat karir tambahan yang dicatat alumni.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {careerHistories.map(item => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${item.is_current ? 'bg-emerald-600 ring-emerald-200' : 'bg-slate-400 ring-slate-100'}`} />

                  <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 group-hover:border-slate-300 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 tabular-nums">
                        {item.year_start} — {item.is_current ? 'Sekarang' : item.year_end}
                      </span>
                      {item.is_current && (
                        <Badge variant="success">Posisi Saat Ini</Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.position}
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {item.company}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
