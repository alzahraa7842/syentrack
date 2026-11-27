import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  FileText,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  X,
  CheckSquare,
  Square,
  Camera,
  UploadCloud
} from 'lucide-react';
import { AlumniProfile, CareerStatus, TracerStatus, User } from '../../types';
import { StorageService } from '../../services/storageService';
import { ExportService } from '../../services/exportService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../contexts/NotificationContext';
import { AVATAR_COWO } from '../../constants/avatars';
import { resolveAssetUrl } from '../../constants/assets';
import { compressImageFile } from '../../utils/imageUtils';

interface AlumniManagementPageProps {
  onNavigate: (path: string) => void;
}

export const AlumniManagementPage: React.FC<AlumniManagementPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const [schoolSettings, setSchoolSettings] = useState(StorageService.getSchoolSettings());
  const [isSaving, setIsSaving] = useState(false);

  const [alumniList, setAlumniList] = useState<AlumniProfile[]>(StorageService.getAlumniList());
  const [usersList, setUsersList] = useState<User[]>(StorageService.getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterJurusan, setFilterJurusan] = useState('ALL');
  const [filterStatusKarir, setFilterStatusKarir] = useState('ALL');
  const [filterStatusTracer, setFilterStatusTracer] = useState('ALL');

  // Multi-delete (Batch Action) State
  const [selectedAlumniIds, setSelectedAlumniIds] = useState<number[]>([]);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<AlumniProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [alumniToDelete, setAlumniToDelete] = useState<AlumniProfile | null>(null);

  // Account Status Check Modal
  const [selectedAlumniStatus, setSelectedAlumniStatus] = useState<{
    alumni: AlumniProfile;
    user?: User;
  } | null>(null);

  // Form State for Administrative Verification
  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    angkatan: 2025,
    jurusan: 'PPLG',
    email: '',
    phone: '',
    domisili: 'Jakarta',
    status_karir: 'Bekerja' as CareerStatus,
    status_tracer: 'Belum Mengisi' as TracerStatus,
    avatar: AVATAR_COWO,
    job_company: '',
    job_position: '',
    edu_university: '',
    edu_major: '',
    biz_name: '',
    biz_field: '',
  });

  const reloadData = () => {
    setAlumniList(StorageService.getAlumniList());
    setUsersList(StorageService.getUsers());
  };

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setAlumniList(StorageService.getAlumniList());
      setUsersList(StorageService.getUsers());
      setSchoolSettings(StorageService.getSchoolSettings());
    };

    window.addEventListener('alumnitrack_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filtered and Searched Data
  const filteredAlumni = useMemo(() => {
    return alumniList.filter(alumni => {
      const matchSearch = 
        alumni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alumni.nisn.includes(searchQuery) ||
        alumni.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alumni.domisili.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAngkatan = filterAngkatan === 'ALL' || alumni.angkatan.toString() === filterAngkatan;
      const matchJurusan = filterJurusan === 'ALL' || alumni.jurusan === filterJurusan || (filterJurusan === 'BR' && (alumni.jurusan.includes('BR') || alumni.jurusan.includes('Bisnis Ritel')));
      const matchStatusKarir = filterStatusKarir === 'ALL' || alumni.status_karir === filterStatusKarir;
      const matchStatusTracer = filterStatusTracer === 'ALL' || alumni.status_tracer === filterStatusTracer;

      return matchSearch && matchAngkatan && matchJurusan && matchStatusKarir && matchStatusTracer;
    });
  }, [alumniList, searchQuery, filterAngkatan, filterJurusan, filterStatusKarir, filterStatusTracer]);

  // Paginated Slice
  const totalPages = Math.ceil(filteredAlumni.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAlumni.slice(start, start + itemsPerPage);
  }, [filteredAlumni, currentPage, itemsPerPage]);

  // Batch Selection Handlers
  const isAllPageSelected = paginatedData.length > 0 && paginatedData.every(a => selectedAlumniIds.includes(a.id));
  const isSomePageSelected = paginatedData.some(a => selectedAlumniIds.includes(a.id));

  const handleToggleSelect = (id: number) => {
    setSelectedAlumniIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedData.map(a => a.id));
      setSelectedAlumniIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newSelected = new Set(selectedAlumniIds);
      paginatedData.forEach(a => newSelected.add(a.id));
      setSelectedAlumniIds(Array.from(newSelected));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedAlumniIds(filteredAlumni.map(a => a.id));
    showToast('info', `Semua ${filteredAlumni.length} alumni hasil filter terpilih`);
  };

  const handleClearSelection = () => {
    setSelectedAlumniIds([]);
  };

  const handleBatchDeleteConfirm = () => {
    if (selectedAlumniIds.length === 0) return;
    const deletedCount = StorageService.deleteMultipleAlumni(selectedAlumniIds);
    StorageService.addAuditLog('Admin BK', 'ADMIN', `Menghapus massal ${deletedCount} data alumni terpilih`);
    showToast('success', `${deletedCount} data alumni berhasil dihapus secara massal.`);
    setSelectedAlumniIds([]);
    setIsBatchDeleteDialogOpen(false);
    reloadData();
  };

  const handleOpenEditModal = (alumni: AlumniProfile) => {
    setEditingAlumni(alumni);
    setFormData({
      name: alumni.name,
      nisn: alumni.nisn,
      angkatan: alumni.angkatan,
      jurusan: alumni.jurusan,
      email: alumni.email,
      phone: alumni.phone,
      domisili: alumni.domisili,
      status_karir: alumni.status_karir,
      status_tracer: alumni.status_tracer,
      avatar: alumni.avatar ?? '',
      job_company: alumni.job_company || '',
      job_position: alumni.job_position || '',
      edu_university: alumni.edu_university || '',
      edu_major: alumni.edu_major || '',
      biz_name: alumni.biz_name || '',
      biz_field: alumni.biz_field || '',
    });
    setIsEditModalOpen(true);
  };

  const handleAdminAlumniPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran foto maksimal 10MB');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Harap pilih file gambar (JPG, PNG, atau WEBP)');
      e.target.value = '';
      return;
    }
    setIsSaving(true);
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
      });
      if (editingAlumni) {
        const updatedImmediate: AlumniProfile = {
          ...editingAlumni,
          avatar: compressed,
          updated_at: new Date().toISOString().split('T')[0],
        };
        const res = await StorageService.saveAlumniAsync(updatedImmediate);
        if (!res.ok) {
          showToast('error', res.error || 'Gagal menyimpan foto alumni ke database');
          return;
        }
        setFormData(prev => ({ ...prev, avatar: res.data.avatar ?? compressed }));
        setEditingAlumni(res.data);
        reloadData();
      } else {
        setFormData(prev => ({ ...prev, avatar: compressed }));
      }
      showToast('success', 'Foto profil alumni berhasil diganti dan tersimpan!');
    } catch {
      showToast('error', 'Gagal memproses berkas gambar');
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  const handleOpenAccountCheck = (alumni: AlumniProfile) => {
    const matchedUser = usersList.find(u => 
      u.id === alumni.user_id || 
      (u.email && u.email.toLowerCase() === alumni.email.toLowerCase()) ||
      (u.nisn && u.nisn === alumni.nisn)
    );
    setSelectedAlumniStatus({ alumni, user: matchedUser });
  };

  const handleToggleAccountActive = (user: User) => {
    const updatedUser = StorageService.toggleUserActive(user.id);
    if (updatedUser) {
      StorageService.addAuditLog(
        'Admin',
        'ADMIN',
        `Mengubah status akun ${updatedUser.name} menjadi ${updatedUser.isActive ? 'Aktif' : 'Nonaktif/Suspended'}`
      );
      showToast(
        'info',
        `Status akun ${updatedUser.name} berhasil diubah menjadi: ${updatedUser.isActive ? 'Aktif' : 'Nonaktif'}`
      );
      reloadData();
      if (selectedAlumniStatus) {
        setSelectedAlumniStatus({ ...selectedAlumniStatus, user: updatedUser });
      }
    }
  };

  const handleSaveAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlumni) return;

    if (!formData.name.trim() || !formData.nisn.trim()) {
      showToast('error', 'Nama dan NISN tidak boleh kosong');
      return;
    }

    // Update administrative details without altering password
    const updated: AlumniProfile = {
      ...editingAlumni,
      name: formData.name.trim(),
      nisn: formData.nisn.trim(),
      angkatan: formData.angkatan,
      jurusan: formData.jurusan,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      domisili: formData.domisili,
      status_karir: formData.status_karir,
      status_tracer: formData.status_tracer,
      job_company: formData.job_company,
      job_position: formData.job_position,
      edu_university: formData.edu_university,
      edu_major: formData.edu_major,
      biz_name: formData.biz_name,
      biz_field: formData.biz_field,
      avatar: formData.avatar,
      updated_at: new Date().toISOString().split('T')[0]
    };

    setIsSaving(true);
    try {
      const res = await StorageService.saveAlumniAsync(updated);
      if (!res.ok) {
        showToast('error', res.error || 'Gagal menyimpan perubahan data alumni ke database');
        return;
      }
      StorageService.addAuditLog('Admin', 'ADMIN', `Verifikasi data profil alumni: ${res.data.name} (${res.data.nisn})`);
      showToast('success', `Data alumni ${res.data.name} berhasil diperbarui dan tersimpan.`);
      setIsEditModalOpen(false);
      reloadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (alumniToDelete) {
      StorageService.deleteAlumni(alumniToDelete.id);
      StorageService.addAuditLog('Admin', 'ADMIN', `Menghapus data alumni: ${alumniToDelete.name} (${alumniToDelete.nisn})`);
      showToast('success', `Data alumni ${alumniToDelete.name} telah dihapus`);
      setIsDeleteDialogOpen(false);
      setAlumniToDelete(null);
      reloadData();
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterAngkatan('ALL');
    setFilterJurusan('ALL');
    setFilterStatusKarir('ALL');
    setFilterStatusTracer('ALL');
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    ExportService.exportAlumniToExcel(filteredAlumni, schoolSettings, `AlumniTrack_Export_${Date.now()}.xlsx`);
    StorageService.addAuditLog('Admin', 'ADMIN', `Mengunduh data alumni format Excel (${filteredAlumni.length} data)`);
    showToast('success', 'File Excel berhasil diunduh');
  };

  const handleExportCSV = () => {
    ExportService.exportAlumniToCSV(filteredAlumni, `AlumniTrack_Export_${Date.now()}.csv`);
    StorageService.addAuditLog('Admin', 'ADMIN', `Mengunduh data alumni format CSV (${filteredAlumni.length} data)`);
    showToast('success', 'File CSV berhasil diunduh');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Data Alumni & Lulusan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoring data akun terdaftar, status pengisian tracer study, dan verifikasi karir alumni
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('/admin/import')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Master Data Referensi</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh format Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh format CSV"
            >
              <FileText className="w-4 h-4 text-sky-700" />
              <span>CSV</span>
            </button>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Registrasi Mandiri Siswa</span>
          </div>
        </div>
      </div>

      {/* Security & Role Policy Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold block text-emerald-950">Kebijakan Hak Akses Akun Siswa</span>
            <p className="text-emerald-900/90 text-[11px] leading-relaxed mt-0.5">
              Setiap siswa/alumni bertanggung jawab mendaftarkan dan mengelola akun mandiri. Admin berwenang memantau data, mengecek status akun, dan mengaudit aktivitas tanpa mengubah password siswa secara sepihak.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
            Total {filteredAlumni.length} Siswa Terdata
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama, NISN, email, atau domisili..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Filter Angkatan */}
          <div>
            <select
              value={filterAngkatan}
              onChange={(e) => { setFilterAngkatan(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              <option value="ALL">Semua Angkatan</option>
              <option value="2026">Angkatan 2026</option>
              <option value="2025">Angkatan 2025</option>
              <option value="2024">Angkatan 2024</option>
              <option value="2023">Angkatan 2023</option>
              <option value="2022">Angkatan 2022</option>
            </select>
          </div>

          {/* Filter Jurusan */}
          <div>
            <select
              value={filterJurusan}
              onChange={(e) => { setFilterJurusan(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              <option value="ALL">Semua Jurusan</option>
              <option value="PPLG">PPLG</option>
              <option value="DKV">DKV</option>
              <option value="MPLB">MPLB</option>
              <option value="AKL">AKL</option>
              <option value="BR">BR (Bisnis Ritel)</option>
            </select>
          </div>

          {/* Filter Status Karir */}
          <div>
            <select
              value={filterStatusKarir}
              onChange={(e) => { setFilterStatusKarir(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              <option value="ALL">Semua Status Karir</option>
              <option value="Bekerja">Bekerja</option>
              <option value="Kuliah">Kuliah</option>
              <option value="Wirausaha">Wirausaha</option>
              <option value="Mencari Kerja">Mencari Kerja</option>
              <option value="Tidak Bekerja">Tidak Bekerja</option>
            </select>
          </div>
        </div>

        {/* Row 2 Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status Tracer:</span>
            <div className="flex items-center gap-1">
              {['ALL', 'Sudah Mengisi', 'Belum Mengisi'].map((status) => (
                <button
                  key={status}
                  onClick={() => { setFilterStatusTracer(status); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    filterStatusTracer === status
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'Semua' : status}
                </button>
              ))}
            </div>
          </div>

          {(searchQuery || filterAngkatan !== 'ALL' || filterJurusan !== 'ALL' || filterStatusKarir !== 'ALL' || filterStatusTracer !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Multi-Delete / Batch Action Toolbar */}
        {selectedAlumniIds.length > 0 && (
          <div className="bg-emerald-950 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-800/80 text-emerald-200 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {selectedAlumniIds.length} data alumni dipilih
              </span>

              {selectedAlumniIds.length < filteredAlumni.length && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs text-emerald-300 hover:text-white underline decoration-emerald-400 underline-offset-2 transition-colors cursor-pointer"
                >
                  Pilih semua ({filteredAlumni.length}) data hasil filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 rounded-xl border border-emerald-700/60 hover:bg-emerald-900/80 text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal Pilih</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchDeleteDialogOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedAlumniIds.length})</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = !isAllPageSelected && isSomePageSelected;
                      }
                    }}
                    onChange={handleToggleSelectAllPage}
                    aria-label="Pilih semua baris di halaman ini"
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 text-center w-10">No</th>
                <th className="py-3 px-3 w-12">Foto</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-3 text-center">Angkatan</th>
                <th className="py-3 px-3">Jurusan</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-3">Status Karir</th>
                <th className="py-3 px-3">Tracer Study</th>
                <th className="py-3 px-3">Akun Siswa</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">Belum ada data alumni yang cocok</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ubah kata kunci pencarian atau reset filter</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((alumni, index) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  const isSelected = selectedAlumniIds.includes(alumni.id);
                  const matchedUser = usersList.find(u => 
                    u.id === alumni.user_id || 
                    (u.email && u.email.toLowerCase() === alumni.email.toLowerCase()) ||
                    (u.nisn && u.nisn === alumni.nisn)
                  );
                  const isGoogleUser = matchedUser?.is_google_user || alumni.is_google_user;
                  const isAccountActive = matchedUser ? matchedUser.isActive : true;

                  return (
                    <tr 
                      key={alumni.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(alumni.id)}
                          aria-label={`Pilih ${alumni.name}`}
                          className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 font-mono tabular-nums">{rowNumber}</td>
                      <td className="py-3 px-3">
                        <img
                          src={resolveAssetUrl(alumni.avatar, AVATAR_COWO)}
                          alt={alumni.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 truncate max-w-[150px]">
                        {alumni.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">{alumni.nisn}</td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums">{alumni.angkatan}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{alumni.jurusan}</td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-[140px]">{alumni.email}</td>
                      <td className="py-3 px-3">
                        <Badge variant={
                          alumni.status_karir === 'Bekerja' ? 'success' :
                          alumni.status_karir === 'Kuliah' ? 'info' :
                          alumni.status_karir === 'Wirausaha' ? 'warning' : 'neutral'
                        }>
                          {alumni.status_karir}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={alumni.status_tracer === 'Sudah Mengisi' ? 'success' : 'danger'}>
                          {alumni.status_tracer}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isAccountActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            {isAccountActive ? 'Aktif' : 'Suspended'}
                          </span>
                          {isGoogleUser && (
                            <span className="p-1 rounded-md bg-slate-100 text-slate-600" title="Akun Terhubung Google / Gmail">
                              <svg className="w-3 h-3" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onNavigate(`/admin/alumni/${alumni.id}`)}
                            title="Lihat Detail Alumni"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAccountCheck(alumni)}
                            title="Cek Status Akun & Aktivitas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(alumni)}
                            title="Verifikasi / Edit Data Administrasi"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAlumniToDelete(alumni);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Hapus Data Alumni"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Menampilkan {paginatedData.length} dari {filteredAlumni.length} alumni terdata
          </span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Account Verification & Status Check Modal */}
      {selectedAlumniStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Status Akun Siswa</h3>
                  <p className="text-[11px] text-slate-500">{selectedAlumniStatus.alumni.name} (NISN: {selectedAlumniStatus.alumni.nisn})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlumniStatus(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Status Login</span>
                  <span className={`inline-flex items-center gap-1.5 font-bold mt-1 ${
                    (selectedAlumniStatus.user?.isActive ?? true) ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {(selectedAlumniStatus.user?.isActive ?? true) ? 'Akun Aktif & Mandiri' : 'Akun Dinonaktifkan'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Tautan Akun Google</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 mt-1">
                    {selectedAlumniStatus.user?.is_google_user ? '✓ Terhubung Google (Gmail)' : 'Email Mandiri'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Pengiriman Email Notifikasi</span>
                  <span className="text-emerald-800 font-semibold mt-1 block">Aktif (Terkirim Otomatis)</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">Status Kuesioner Tracer</span>
                  <span className="font-semibold text-slate-800 mt-1 block">{selectedAlumniStatus.alumni.status_tracer}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>Kebijakan Proteksi:</strong> Admin tidak memiliki akses melihat atau mengubah kata sandi siswa. Jika siswa lupa kata sandi, arahkan siswa menggunakan tombol <em>Lupa Password</em> di portal masuk.
              </div>

              {selectedAlumniStatus.user && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-slate-500">Tindakan Administratif:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAccountActive(selectedAlumniStatus.user!)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedAlumniStatus.user.isActive
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {selectedAlumniStatus.user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    <span>{selectedAlumniStatus.user.isActive ? 'Tangguhkan Akun (Suspend)' : 'Aktifkan Kembali Akun'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Administrative Details Modal (No Password Setting!) */}
      {isEditModalOpen && editingAlumni && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Verifikasi Data Administrasi: ${editingAlumni.name}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveAlumni} className="space-y-4">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Admin hanya dapat memverifikasi biodata, status karir, dan kuesioner tracer. Kata sandi tetap terlindungi dan dikelola secara mandiri oleh siswa.</span>
            </div>

            {/* Foto Profil Alumni */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-700 to-slate-800 text-white flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs">
                {formData.avatar ? (
                  <img src={resolveAssetUrl(formData.avatar)} alt={formData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold uppercase">{(formData.name || 'AL').substring(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 block">Foto Profil Alumni</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Menyimpan...' : 'Ganti Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isSaving}
                      onChange={handleAdminAlumniPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.avatar && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          if (editingAlumni) {
                            const updatedImmediate: AlumniProfile = {
                              ...editingAlumni,
                              avatar: '',
                              updated_at: new Date().toISOString().split('T')[0],
                            };
                            const res = await StorageService.saveAlumniAsync(updatedImmediate);
                            if (!res.ok) {
                              showToast('error', res.error || 'Gagal menghapus foto profil alumni');
                              return;
                            }
                            setEditingAlumni(res.data);
                            reloadData();
                          }
                          setFormData(prev => ({ ...prev, avatar: '' }));
                          showToast('info', 'Foto profil alumni dihapus dan tersimpan');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-60 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NISN *</label>
                <input
                  type="text"
                  required
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Lulus (Angkatan)</label>
                <select
                  value={formData.angkatan}
                  onChange={(e) => setFormData({ ...formData, angkatan: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                  <option value={2022}>2022</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jurusan</label>
                <select
                  value={formData.jurusan}
                  onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="PPLG">PPLG</option>
                  <option value="DKV">DKV</option>
                  <option value="MPLB">MPLB</option>
                  <option value="AKL">AKL</option>
                  <option value="BR (Bisnis Ritel)">BR (Bisnis Ritel)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon/WA</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Karir Terverifikasi</label>
                <select
                  value={formData.status_karir}
                  onChange={(e) => setFormData({ ...formData, status_karir: e.target.value as CareerStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="Bekerja">Bekerja</option>
                  <option value="Kuliah">Kuliah</option>
                  <option value="Wirausaha">Wirausaha</option>
                  <option value="Mencari Kerja">Mencari Kerja</option>
                  <option value="Tidak Bekerja">Tidak Bekerja</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Tracer Study</label>
                <select
                  value={formData.status_tracer}
                  onChange={(e) => setFormData({ ...formData, status_tracer: e.target.value as TracerStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  <option value="Sudah Mengisi">Sudah Mengisi</option>
                  <option value="Belum Mengisi">Belum Mengisi</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Single Alumni Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Alumni"
        message={`Apakah Anda yakin ingin menghapus data alumni ${alumniToDelete?.name}? Tindakan ini bersifat permanen.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        isDestructive={true}
      />

      {/* Confirm Batch Multi-Delete Dialog */}
      <ConfirmDialog
        isOpen={isBatchDeleteDialogOpen}
        onClose={() => setIsBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title={`Hapus Massal ${selectedAlumniIds.length} Data Alumni`}
        message={`Apakah Anda yakin ingin menghapus ${selectedAlumniIds.length} data alumni yang dipilih? Seluruh riwayat karir, akun siswa, dan berkas terkait akan dihapus secara permanen.`}
        confirmLabel={`Ya, Hapus ${selectedAlumniIds.length} Data Terpilih`}
        cancelLabel="Batal"
        isDestructive={true}
      />
    </div>
  );
};
