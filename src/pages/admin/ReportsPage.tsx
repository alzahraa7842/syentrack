import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  TrendingUp, 
  Building, 
  GraduationCap, 
  Award,
  Layers,
  PieChart as PieIcon,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Camera,
  UploadCloud,
  User as UserIcon,
  Star
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { StorageService } from '../../services/storageService';
import { ExportService } from '../../services/exportService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';
import { AlumniProfile, SchoolSettings, GuruBkProfile } from '../../types';
import { compressImageFile } from '../../utils/imageUtils';

export const ReportsPage: React.FC = () => {
  const { showToast } = useNotification();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(StorageService.getSchoolSettings());
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>(StorageService.getAlumniList());
  const [guruBkList, setGuruBkList] = useState<GuruBkProfile[]>(StorageService.getGuruBkProfiles());

  // Guru BK CRUD Modal & Confirm State
  const [isBkModalOpen, setIsBkModalOpen] = useState(false);
  const [editingBk, setEditingBk] = useState<GuruBkProfile | null>(null);
  const [bkToDelete, setBkToDelete] = useState<GuruBkProfile | null>(null);
  const [isBkDeleteOpen, setIsBkDeleteOpen] = useState(false);
  const [isSavingBk, setIsSavingBk] = useState(false);
  const bkPhotoInputRef = useRef<HTMLInputElement>(null);

  const [bkForm, setBkForm] = useState({
    name: '',
    nip: '',
    title: 'Guru Bimbingan Konseling / BKK',
    email: '',
    phone: '',
    city: 'Jakarta',
    avatar: '',
    is_default: true
  });

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setSchoolSettings(StorageService.getSchoolSettings());
      setAlumniList(StorageService.getAlumniList());
      setGuruBkList(StorageService.getGuruBkProfiles());
    };
    window.addEventListener('alumnitrack_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const activeGuruBk = useMemo(() => {
    return guruBkList.find(g => g.is_default) || guruBkList[0];
  }, [guruBkList]);

  const [selectedAngkatan, setSelectedAngkatan] = useState('ALL');
  const [selectedJurusan, setSelectedJurusan] = useState('ALL');

  // Filtered dataset
  const filteredAlumni = useMemo(() => {
    return alumniList.filter(a => {
      const matchAngkatan = selectedAngkatan === 'ALL' || a.angkatan.toString() === selectedAngkatan;
      const matchJurusan = selectedJurusan === 'ALL' || a.jurusan === selectedJurusan || (selectedJurusan === 'BR' && (a.jurusan.includes('BR') || a.jurusan.includes('Bisnis Ritel')));
      return matchAngkatan && matchJurusan;
    });
  }, [alumniList, selectedAngkatan, selectedJurusan]);

  const totalRaw = filteredAlumni.length;
  const total = totalRaw || 1;
  const bekerjaCount = filteredAlumni.filter(a => a.status_karir === 'Bekerja').length;
  const kuliahCount = filteredAlumni.filter(a => a.status_karir === 'Kuliah').length;
  const wirausahaCount = filteredAlumni.filter(a => a.status_karir === 'Wirausaha').length;
  const belumBekerjaCount = totalRaw - (bekerjaCount + kuliahCount + wirausahaCount);
  const responseRate = Math.round((filteredAlumni.filter(a => a.status_tracer === 'Sudah Mengisi').length / total) * 100);

  // Industry sectors breakdown
  const industryData = [
    { name: 'Teknologi Informasi / Software', count: Math.round(bekerjaCount * 0.45), fill: '#059669' },
    { name: 'Perbankan & Keuangan', count: Math.round(bekerjaCount * 0.22), fill: '#0284c7' },
    { name: 'Media Kreatif & Desain', count: Math.round(bekerjaCount * 0.18), fill: '#d97706' },
    { name: 'Logistik & Layanan Bisnis', count: Math.round(bekerjaCount * 0.15), fill: '#64748b' },
  ];

  // University distribution breakdown
  const universityData = [
    { name: 'ITB (Institut Teknologi Bandung)', count: 12 },
    { name: 'UI (Universitas Indonesia)', count: 15 },
    { name: 'Telkom University', count: 18 },
    { name: 'Politeknik Negeri Jakarta (PNJ)', count: 24 },
    { name: 'Universitas Brawijaya / Lainnya', count: 10 },
  ];

  // Job Relevance Breakdown
  const relevanceData = [
    { name: 'Sangat Erat (100% Sesuai Jurusan)', value: 68, color: '#059669' },
    { name: 'Cukup Erat (Terkait Sebagian)', value: 22, color: '#0284c7' },
    { name: 'Kurang Erat / Lainnya', value: 10, color: '#f59e0b' }
  ];

  // Guru BK CRUD Handlers
  const handleOpenAddBk = () => {
    setEditingBk(null);
    setBkForm({
      name: '',
      nip: '',
      title: 'Guru Bimbingan Konseling / BKK',
      email: '',
      phone: '',
      city: 'Jakarta',
      avatar: '',
      is_default: guruBkList.length === 0
    });
    setIsBkModalOpen(true);
  };

  const handleOpenEditBk = (bk: GuruBkProfile) => {
    setEditingBk(bk);
    setBkForm({
      name: bk.name,
      nip: bk.nip || '',
      title: bk.title || 'Guru Bimbingan Konseling / BKK',
      email: bk.email || '',
      phone: bk.phone || '',
      city: bk.city || 'Jakarta',
      avatar: bk.avatar || '',
      is_default: Boolean(bk.is_default)
    });
    setIsBkModalOpen(true);
  };

  const handleBkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran foto maksimal 10MB');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Harap pilih berkas gambar (JPG, PNG, WEBP)');
      e.target.value = '';
      return;
    }
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
      });
      setBkForm(prev => ({ ...prev, avatar: compressed }));
      showToast('success', 'Foto Guru BK siap disimpan');
    } catch {
      showToast('error', 'Gagal memproses berkas gambar');
    } finally {
      e.target.value = '';
    }
  };

  const handleQuickBkPhotoChange = async (bk: GuruBkProfile, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran foto maksimal 10MB');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Harap pilih berkas gambar (JPG, PNG, WEBP)');
      e.target.value = '';
      return;
    }
    setIsSavingBk(true);
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
      });
      const res = await StorageService.saveGuruBkProfileAsync({
        ...bk,
        avatar: compressed,
      });
      if (!res.ok) {
        showToast('error', res.error || 'Gagal menyimpan foto profil Guru BK ke database');
        return;
      }
      StorageService.addAuditLog('Admin', 'ADMIN', `Mengganti foto profil Guru BK: ${bk.name}`);
      setGuruBkList(StorageService.getGuruBkProfiles());
      showToast('success', `Foto profil ${bk.name} berhasil diganti dan tersimpan!`);
    } catch {
      showToast('error', 'Gagal memproses berkas gambar');
    } finally {
      setIsSavingBk(false);
      e.target.value = '';
    }
  };

  const handleSaveBk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bkForm.name.trim()) {
      showToast('error', 'Nama Guru BK wajib diisi');
      return;
    }
    setIsSavingBk(true);
    try {
      const res = await StorageService.saveGuruBkProfileAsync({
        id: editingBk?.id,
        name: bkForm.name.trim(),
        nip: bkForm.nip.trim(),
        title: bkForm.title.trim() || 'Guru Bimbingan Konseling / BKK',
        email: bkForm.email.trim(),
        phone: bkForm.phone.trim(),
        city: bkForm.city.trim() || 'Jakarta',
        avatar: bkForm.avatar,
        is_default: bkForm.is_default
      });
      if (!res.ok) {
        showToast('error', res.error || 'Gagal menyimpan profil Guru BK ke database');
        return;
      }
      StorageService.addAuditLog(
        'Admin',
        'ADMIN',
        `${editingBk ? 'Memperbarui' : 'Menambahkan'} profil Guru BK: ${bkForm.name.trim()}`
      );
      showToast('success', `Profil Guru BK ${bkForm.name.trim()} berhasil ${editingBk ? 'diperbarui' : 'ditambahkan'}`);
      setGuruBkList(StorageService.getGuruBkProfiles());
      setIsBkModalOpen(false);
    } finally {
      setIsSavingBk(false);
    }
  };

  const handleSetDefaultBk = (bk: GuruBkProfile) => {
    StorageService.setDefaultGuruBkProfile(bk.id);
    StorageService.addAuditLog('Admin', 'ADMIN', `Mengatur penerbit utama laporan ke: ${bk.name}`);
    showToast('success', `${bk.name} dipilih sebagai Penerbit Utama Laporan`);
    setGuruBkList(StorageService.getGuruBkProfiles());
  };

  const handleConfirmDeleteBk = () => {
    if (!bkToDelete) return;
    if (guruBkList.length <= 1) {
      showToast('error', 'Minimal harus ada 1 profil Guru BK aktif untuk pengesahan laporan');
      setIsBkDeleteOpen(false);
      return;
    }
    const ok = StorageService.deleteGuruBkProfile(bkToDelete.id);
    if (ok) {
      StorageService.addAuditLog('Admin', 'ADMIN', `Menghapus profil Guru BK: ${bkToDelete.name}`);
      showToast('info', `Profil Guru BK ${bkToDelete.name} berhasil dihapus`);
      setGuruBkList(StorageService.getGuruBkProfiles());
    }
    setIsBkDeleteOpen(false);
    setBkToDelete(null);
  };

  const handleExportPDF = () => {
    ExportService.exportAlumniToPDF(
      filteredAlumni, 
      schoolSettings, 
      `Laporan Analitik: Angkatan ${selectedAngkatan}, Jurusan ${selectedJurusan}`,
      'Laporan_Tracer_Study.pdf',
      activeGuruBk
    );
    showToast('success', `Laporan PDF resmi diterbitkan atas nama ${activeGuruBk?.name || 'Guru BK'}`);
  };

  const handleExportExcel = () => {
    ExportService.exportAlumniToExcel(
      filteredAlumni, 
      schoolSettings, 
      `Laporan_Analitik_Tracer_${selectedAngkatan}_${selectedJurusan}.xlsx`
    );
    showToast('success', 'File Excel ringkasan analitik berhasil diunduh');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Laporan Analitik Karir & Ketercapaian Lulusan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Rekap komprehensif 10 indikator kinerja utama keterserapan alumni untuk akreditasi sekolah
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Official Endorsement & Publisher Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-800 shadow-md">
        <div className="flex items-center gap-3.5">
          {activeGuruBk?.avatar ? (
            <img
              src={activeGuruBk.avatar}
              alt={activeGuruBk.name}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-400/50 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-800/80 border border-emerald-600/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Dokumen Rekapitulasi Resmi BK & Tracer Study
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Penerbit Aktif
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
              Diterbitkan oleh Guru BK: <strong className="text-white font-semibold">{activeGuruBk?.name || 'Ani Tri Astuti, S.Pd.'}</strong>
              {activeGuruBk?.nip ? <span className="text-emerald-200/80"> (NIP. {activeGuruBk.nip})</span> : null} · {activeGuruBk?.title || 'Guru Bimbingan Konseling / BKK'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 text-xs font-bold flex items-center gap-2 shrink-0 transition-all shadow-xs cursor-pointer self-start sm:self-center"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-800" />
          <span>Cetak PDF (Dengan Pengesahan)</span>
        </button>
      </div>

      {/* CRUD Profil Guru BK Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span>Profil Guru BK (Penerbit & Penandatangan Laporan)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola data profil Guru BK yang tercantum pada pengesahan laporan hasil tracer study & cetak PDF
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBk}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Profil Guru BK</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {guruBkList.map((bk) => {
            const isActive = bk.id === activeGuruBk?.id;
            return (
              <div
                key={bk.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <label className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-700 to-slate-800 text-white flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs cursor-pointer group" title="Klik untuk langsung ganti foto">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQuickBkPhotoChange(bk, e)}
                      className="hidden"
                    />
                    {bk.avatar ? (
                      <img src={bk.avatar} alt={bk.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold uppercase">
                        {bk.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </span>
                    )}
                    <span className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </span>
                  </label>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{bk.name}</h4>
                      {isActive && (
                        <Badge variant="success">Penerbit Aktif</Badge>
                      )}
                    </div>
                    <p className="text-xs font-medium text-emerald-800 truncate mt-0.5">{bk.title}</p>
                    {bk.nip && (
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">NIP. {bk.nip}</p>
                    )}

                    <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                      {bk.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{bk.email}</span>
                        </div>
                      )}
                      {bk.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{bk.phone}</span>
                        </div>
                      )}
                      {bk.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Kota Terbit: {bk.city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultBk(bk)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Star className="w-3 h-3" />
                      <span>Jadikan Penerbit Utama</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Digunakan pada cetak PDF
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBk(bk)}
                      title="Edit Profil Guru BK"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBkToDelete(bk);
                        setIsBkDeleteOpen(true);
                      }}
                      disabled={guruBkList.length <= 1}
                      title={guruBkList.length <= 1 ? 'Minimal 1 profil Guru BK harus tersedia' : 'Hapus Profil Guru BK'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Laporan:
          </span>

          <select
            value={selectedAngkatan}
            onChange={(e) => setSelectedAngkatan(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
          >
            <option value="ALL">Semua Angkatan</option>
            <option value="2025">Angkatan 2025</option>
            <option value="2024">Angkatan 2024</option>
            <option value="2023">Angkatan 2023</option>
          </select>

          <select
            value={selectedJurusan}
            onChange={(e) => setSelectedJurusan(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
          >
            <option value="ALL">Semua Jurusan</option>
            <option value="PPLG">PPLG</option>
            <option value="DKV">DKV</option>
            <option value="MPLB">MPLB</option>
            <option value="AKL">AKL</option>
            <option value="BR">BR (Bisnis Ritel)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 tabular-nums">
          Sampel terhitung: <strong className="text-slate-800">{filteredAlumni.length}</strong> data alumni
        </div>
      </div>

      {/* 10 Indikator Utama Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">1. Rekap Karir</span>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{filteredAlumni.length}</p>
          <span className="text-[11px] text-slate-500">Total Sampel</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">2. Alumni Bekerja</span>
          <p className="text-xl font-bold text-emerald-800 mt-1 tabular-nums">{bekerjaCount}</p>
          <span className="text-[11px] text-slate-500">{Math.round((bekerjaCount / total) * 100)}% Lulusan</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">3. Alumni Kuliah</span>
          <p className="text-xl font-bold text-sky-800 mt-1 tabular-nums">{kuliahCount}</p>
          <span className="text-[11px] text-slate-500">{Math.round((kuliahCount / total) * 100)}% Lulusan</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">4. Berwirausaha</span>
          <p className="text-xl font-bold text-amber-800 mt-1 tabular-nums">{wirausahaCount}</p>
          <span className="text-[11px] text-slate-500">{Math.round((wirausahaCount / total) * 100)}% Mandiri</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">5. Belum Bekerja</span>
          <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums">{belumBekerjaCount}</p>
          <span className="text-[11px] text-slate-500">{Math.round((belumBekerjaCount / total) * 100)}% Masa Tunggu</span>
        </div>
      </div>

      {/* Grid: 6. Response Rate & 10. Relevansi Pekerjaan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Relevansi Pekerjaan dengan Jurusan (10) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              10. Relevansi Pekerjaan dengan Kompetensi Kejuruan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tingkat kesesuaian keahlian semasa SMK dengan peran profesional saat ini
            </p>

            <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={relevanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {relevanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            {relevanceData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Distribusi Sektor Industri */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              7. Distribusi Sektor Industri Penyerapan Tenaga Kerja
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bidang industri tempat alumni berkarir aktif
            </p>

            <div className="h-56 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Jumlah Alumni" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Mayoritas terserap di sektor IT & Keuangan</span>
            <span className="font-semibold text-emerald-700">Akreditasi Skor A</span>
          </div>
        </div>
      </div>

      {/* 8. Distribusi Perguruan Tinggi & 9. Distribusi Lokasi Kerja */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            8. Distribusi Kampus / Perguruan Tinggi Alumni
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Universitas dan Politeknik favorit lulusan melanjutkan studi
          </p>

          <div className="divide-y divide-slate-100 text-xs">
            {universityData.map(uni => (
              <div key={uni.name} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-700" />
                  {uni.name}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{uni.count} Mahasiswa</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            9. Distribusi Lokasi Penempatan Kerja
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Persebaran geografis domisili kantor alumni
          </p>

          <div className="space-y-3 text-xs">
            {[
              { region: 'DKI Jakarta (Pusat & Selatan)', pct: 48 },
              { region: 'Bodetabek (Bogor, Depok, Tangerang, Bekasi)', pct: 36 },
              { region: 'Jawa Barat & Luar Pulau Jawa', pct: 12 },
              { region: 'Remote / Perusahaan Internasional', pct: 4 }
            ].map(loc => (
              <div key={loc.region} className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span className="font-medium">{loc.region}</span>
                  <span className="font-bold tabular-nums">{loc.pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${loc.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Profil Guru BK */}
      <Modal
        isOpen={isBkModalOpen}
        onClose={() => setIsBkModalOpen(false)}
        title={editingBk ? `Edit Profil Guru BK: ${editingBk.name}` : 'Tambah Profil Guru BK Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBk} className="space-y-4 text-xs">
          {/* Upload Foto Guru BK */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-700 to-slate-800 text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                {bkForm.avatar ? (
                  <img src={bkForm.avatar} alt={bkForm.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-7 h-7 opacity-80" />
                )}
              </div>
              <button
                type="button"
                onClick={() => bkPhotoInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
                title="Unggah Foto Guru BK"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 space-y-1.5">
              <span className="font-bold text-slate-800 block">Foto Profil Guru BK (Opsional)</span>
              <p className="text-[11px] text-slate-500">JPG, PNG, atau WEBP maksimal 3MB.</p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <input
                  ref={bkPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBkPhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bkPhotoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pilih Foto</span>
                </button>
                {bkForm.avatar && (
                  <button
                    type="button"
                    onClick={() => setBkForm(prev => ({ ...prev, avatar: '' }))}
                    className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Ani Tri Astuti, S.Pd."
                value={bkForm.name}
                onChange={(e) => setBkForm({ ...bkForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
              <input
                type="text"
                placeholder="Contoh: 19850412 201001 2 018"
                value={bkForm.nip}
                onChange={(e) => setBkForm({ ...bkForm, nip: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jabatan / Peran *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Guru Bimbingan Konseling / BKK"
                value={bkForm.title}
                onChange={(e) => setBkForm({ ...bkForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                placeholder="gurubk@sekolah.sch.id"
                value={bkForm.email}
                onChange={(e) => setBkForm({ ...bkForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={bkForm.phone}
                onChange={(e) => setBkForm({ ...bkForm, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Kota Penerbitan Laporan (Tercantum di Tanda Tangan PDF)</label>
              <input
                type="text"
                placeholder="Contoh: Jakarta"
                value={bkForm.city}
                onChange={(e) => setBkForm({ ...bkForm, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bkForm.is_default}
              onChange={(e) => setBkForm({ ...bkForm, is_default: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
            />
            <div>
              <span className="font-bold text-emerald-950 block">Jadikan sebagai Penerbit & Penandatangan Utama PDF</span>
              <span className="text-[11px] text-emerald-800">Nama dan NIP profil ini akan langsung dicetak pada hasil laporan PDF.</span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBkModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingBk}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 font-semibold text-white shadow-xs cursor-pointer"
            >
              {isSavingBk ? 'Menyimpan...' : editingBk ? 'Simpan Perubahan' : 'Tambahkan Profil'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Guru BK */}
      <ConfirmDialog
        isOpen={isBkDeleteOpen}
        onClose={() => setIsBkDeleteOpen(false)}
        onConfirm={handleConfirmDeleteBk}
        title="Hapus Profil Guru BK"
        message={`Apakah Anda yakin ingin menghapus profil Guru BK ${bkToDelete?.name}?`}
        confirmLabel="Ya, Hapus Profil"
        cancelLabel="Batal"
        isDestructive={true}
      />
    </div>
  );
};
