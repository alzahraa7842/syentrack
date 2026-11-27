import React, { useState, useRef, useEffect } from 'react';
import { 
  UserCheck, 
  Briefcase, 
  GraduationCap, 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  Save, 
  Shield, 
  Linkedin, 
  ExternalLink, 
  Check, 
  Download,
  AlertCircle,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../services/storageService';
import { AlumniProfile, CareerStatus, CareerHistoryItem, DocumentFile, PrivacySetting } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { compressImageFile } from '../../utils/imageUtils';
import { resolveAssetUrl } from '../../constants/assets';

export const AlumniProfilePage: React.FC = () => {
  const { user, alumniProfile, refreshUser } = useAuth();
  const { showToast } = useNotification();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoImgError, setPhotoImgError] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const isDirtyRef = useRef(false);

  // Primary active alumni data
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
      avatar: user?.avatar,
      updated_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
    };
  const [profile, setProfile] = useState<AlumniProfile>({ ...currentAlumni });
  const [careerHistories, setCareerHistories] = useState<CareerHistoryItem[]>(
    StorageService.getCareerHistories(currentAlumni.id)
  );
  const [documents, setDocuments] = useState<DocumentFile[]>(
    StorageService.getDocuments(currentAlumni.id)
  );

  // Modal State for Adding/Editing Career History
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFormData, setHistoryFormData] = useState({
    year_start: 2024,
    year_end: 2025,
    is_current: false,
    position: '',
    company: '',
    description: ''
  });

  // Document Upload State
  const [selectedDocCategory, setSelectedDocCategory] = useState<'CV' | 'Portfolio' | 'Sertifikat' | 'Dokumen Lain'>('CV');

  useEffect(() => {
    setPhotoImgError(false);
  }, [profile.avatar]);

  useEffect(() => {
    const sync = () => {
      setCareerHistories(StorageService.getCareerHistories(currentAlumni.id));
      setDocuments(StorageService.getDocuments(currentAlumni.id));
      setProfile((prev) => {
        if (prev.id === 999) {
          const fresh = StorageService.getAlumniById(currentAlumni.id);
          if (fresh) return { ...fresh };
        }
        return prev;
      });
    };
    sync();
    window.addEventListener('alumnitrack_data_changed', sync);
    return () => window.removeEventListener('alumnitrack_data_changed', sync);
  }, [currentAlumni.id]);

  useEffect(() => {
    if (!alumniProfile) return;
    setProfile((prev) => {
      if (prev.id === 999 && alumniProfile.id !== 999) {
        return { ...alumniProfile };
      }
      if (!isDirtyRef.current && alumniProfile.id === prev.id && alumniProfile.avatar !== prev.avatar) {
        return { ...prev, avatar: alumniProfile.avatar };
      }
      return prev;
    });
  }, [alumniProfile]);

  const reloadData = () => {
    const updated = StorageService.getAlumniById(currentAlumni.id);
    if (updated) setProfile({ ...updated });
    setCareerHistories(StorageService.getCareerHistories(currentAlumni.id));
    setDocuments(StorageService.getDocuments(currentAlumni.id));
    refreshUser();
  };

  const persistAvatar = async (newAvatar: string, auditMsg: string, toastMsg: string) => {
    const previousAvatar = profile.avatar;
    const updatedProfile: AlumniProfile = { ...profile, avatar: newAvatar };
    setProfile(updatedProfile);
    setPhotoImgError(false);

    const res = await StorageService.saveAlumniAsync(updatedProfile);
    if (!res.ok) {
      setProfile((prev) => ({ ...prev, avatar: previousAvatar }));
      showToast('error', res.error || 'Gagal menyimpan foto profil ke database');
      return;
    }

    setProfile(res.data);
    StorageService.addAuditLog(user?.name || res.data.name, 'ALUMNI', auditMsg);
    refreshUser();
    showToast('success', toastMsg);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
      });
      await persistAvatar(
        compressedDataUrl,
        'Mengunggah dan mengganti foto profil pribadi',
        'Foto profil berhasil diganti dan tersimpan permanen!'
      );
    } catch {
      showToast('error', 'Gagal memproses berkas gambar');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleApplyPhotoUrl = async () => {
    if (!photoUrlInput.trim()) {
      showToast('error', 'Masukkan URL foto terlebih dahulu');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      await persistAvatar(
        photoUrlInput.trim(),
        'Mengubah foto profil pribadi via tautan URL',
        'Foto profil dari tautan berhasil diganti dan tersimpan permanen!'
      );
      setPhotoUrlInput('');
      setShowUrlInput(false);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      await persistAvatar(
        '',
        'Menghapus foto profil pribadi',
        'Foto profil telah dihapus dan tersimpan'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await StorageService.saveAlumniAsync(profile);
      if (!res.ok) {
        showToast('error', res.error || 'Gagal menyimpan perubahan profil ke database');
        return;
      }
      isDirtyRef.current = false;
      setProfile(res.data);
      StorageService.addAuditLog(user?.name || res.data.name, 'ALUMNI', 'Memperbarui profil karir dan foto pribadi');
      showToast('success', 'Profil karir dan foto Anda berhasil disimpan ke database!');
      refreshUser();
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddCareerHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyFormData.position.trim() || !historyFormData.company.trim()) {
      showToast('error', 'Posisi dan Perusahaan wajib diisi');
      return;
    }

    StorageService.saveCareerHistory({
      alumni_id: currentAlumni.id,
      year_start: historyFormData.year_start,
      year_end: historyFormData.is_current ? undefined : historyFormData.year_end,
      is_current: historyFormData.is_current,
      position: historyFormData.position,
      company: historyFormData.company,
      description: historyFormData.description
    });

    showToast('success', 'Riwayat karir berhasil ditambahkan');
    setIsHistoryModalOpen(false);
    reloadData();
  };

  const handleDeleteHistory = (id: number) => {
    StorageService.deleteCareerHistory(id);
    showToast('info', 'Riwayat karir dihapus');
    reloadData();
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ukuran file melebihi batas maksimal 5MB');
      return;
    }

    // Validate mime
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showToast('error', 'Format tidak didukung. Harap unggah PDF, JPG, atau PNG.');
      return;
    }

    StorageService.saveDocument({
      alumni_id: currentAlumni.id,
      name: file.name,
      category: selectedDocCategory,
      file_size_kb: Math.round(file.size / 1024),
      upload_date: new Date().toISOString().split('T')[0],
      file_url: '#',
      mime_type: file.type
    });

    showToast('success', `Berkas ${file.name} berhasil diunggah!`);
    reloadData();
  };

  const handleDeleteDoc = (id: number) => {
    StorageService.deleteDocument(id);
    showToast('info', 'Berkas dokumen telah dihapus');
    reloadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Profil Karir & Pengaturan Akun Saya
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Perbarui data aktivitas terkini, riwayat pengalaman profesional, dan kelola privasi direktori alumni
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Utama */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            {/* 1. Data Diri */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-emerald-700" /> Data Pribadi & Kontak
              </h3>

              {/* Fitur Tambah Foto Profil Pribadi (Karakter Kartun Dihapus) */}
              <div className="mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/90">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Foto Preview */}
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-md bg-gradient-to-br from-emerald-600 to-slate-800 flex items-center justify-center">
                      {profile.avatar && !photoImgError ? (
                        <img
                          src={resolveAssetUrl(profile.avatar)}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          onError={() => setPhotoImgError(true)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white">
                          <User className="w-10 h-10 opacity-80" />
                          <span className="text-[10px] font-bold tracking-wider mt-0.5 uppercase">
                            {profile.name.substring(0, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white shadow-md transition-colors cursor-pointer"
                      title="Ganti Foto Langsung"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Kontrol Unggah Foto */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Foto Profil Alumni
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Pilih foto baru (JPG, PNG, atau WEBP) — foto akan otomatis dioptimalkan, langsung terganti, dan tersimpan.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {/* Hidden File Input */}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => photoInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isUploadingPhoto ? 'Menyimpan...' : 'Ganti Foto Profil'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{showUrlInput ? 'Tutup URL' : 'Gunakan Link URL'}</span>
                      </button>

                      {profile.avatar && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Foto</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Image URL Input */}
                    {showUrlInput && (
                      <div className="pt-2 flex items-center gap-2 animate-in fade-in">
                        <input
                          type="url"
                          value={photoUrlInput}
                          onChange={(e) => setPhotoUrlInput(e.target.value)}
                          placeholder="Tempelkan URL foto langsung (https://...)"
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPhotoUrl}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                        >
                          Terapkan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN (Nomor Induk Siswa Nasional)</label>
                  <input
                    type="text"
                    disabled
                    value={profile.nisn}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100/70 font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Angkatan (Tahun Lulus)</label>
                  <input
                    type="number"
                    disabled
                    value={profile.angkatan}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100/70 font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jurusan / Konsentrasi Keahlian</label>
                  <input
                    type="text"
                    disabled
                    value={profile.jurusan}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Aktif *</label>
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP Aktif *</label>
                  <input
                    type="text"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Domisili Tempat Tinggal Saat Ini</label>
                  <select
                    value={profile.domisili}
                    onChange={(e) => setProfile({ ...profile, domisili: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Jakarta">Jakarta</option>
                    <option value="Bogor">Bogor</option>
                    <option value="Depok">Depok</option>
                    <option value="Tangerang">Tangerang</option>
                    <option value="Bekasi">Bekasi</option>
                    <option value="Luar Jabodetabek">Luar Jabodetabek</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Profil LinkedIn (URL)</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={profile.linkedin_url || ''}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* 2. Status Karir Saat Ini (Conditional Form) */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-emerald-700" /> Status Karir Saat Ini
              </h3>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Aktivitas Utama</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Bekerja', 'Kuliah', 'Wirausaha', 'Mencari Kerja'] as CareerStatus[]).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setProfile({ ...profile, status_karir: status })}
                      className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        profile.status_karir === status
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Form: Bekerja */}
              {profile.status_karir === 'Bekerja' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs">
                  <span className="font-bold text-slate-800 block">Detail Tempat Bekerja</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan / Kantor *</label>
                      <input
                        type="text"
                        required
                        value={profile.job_company || ''}
                        onChange={(e) => setProfile({ ...profile, job_company: e.target.value })}
                        placeholder="Contoh: PT Telkom Indonesia"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jabatan / Posisi *</label>
                      <input
                        type="text"
                        required
                        value={profile.job_position || ''}
                        onChange={(e) => setProfile({ ...profile, job_position: e.target.value })}
                        placeholder="Contoh: Junior Web Developer"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bidang Industri</label>
                      <input
                        type="text"
                        value={profile.job_industry || ''}
                        onChange={(e) => setProfile({ ...profile, job_industry: e.target.value })}
                        placeholder="Contoh: Teknologi Informasi & Telekomunikasi"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lokasi Kerja</label>
                      <input
                        type="text"
                        value={profile.job_location || ''}
                        onChange={(e) => setProfile({ ...profile, job_location: e.target.value })}
                        placeholder="Contoh: Jakarta Selatan"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jenis Hubungan Kerja</label>
                      <select
                        value={profile.job_type || 'Full-time'}
                        onChange={(e) => setProfile({ ...profile, job_type: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="Full-time">Full-time (Karyawan Tetap/Kontrak)</option>
                        <option value="Part-time">Part-time (Paruh Waktu)</option>
                        <option value="Freelance">Freelance (Lepas)</option>
                        <option value="Kontrak">Kontrak Proyek</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Bekerja</label>
                      <input
                        type="date"
                        value={profile.job_start_date || ''}
                        onChange={(e) => setProfile({ ...profile, job_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Form: Kuliah */}
              {profile.status_karir === 'Kuliah' && (
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-4 text-xs">
                  <span className="font-bold text-sky-900 block">Detail Pendidikan Lanjutan</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Universitas / Politeknik *</label>
                      <input
                        type="text"
                        required
                        value={profile.edu_university || ''}
                        onChange={(e) => setProfile({ ...profile, edu_university: e.target.value })}
                        placeholder="Contoh: Institut Teknologi Bandung"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Program Studi / Jurusan *</label>
                      <input
                        type="text"
                        required
                        value={profile.edu_major || ''}
                        onChange={(e) => setProfile({ ...profile, edu_major: e.target.value })}
                        placeholder="Contoh: Teknik Informatika"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jenjang Pendidikan</label>
                      <select
                        value={profile.edu_degree || 'S1'}
                        onChange={(e) => setProfile({ ...profile, edu_degree: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white"
                      >
                        <option value="D3">D3 (Diploma Tiga)</option>
                        <option value="D4">D4 (Sarjana Terapan)</option>
                        <option value="S1">S1 (Sarjana)</option>
                        <option value="S2">S2 (Magister)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kota Kampus</label>
                      <input
                        type="text"
                        value={profile.edu_location || ''}
                        onChange={(e) => setProfile({ ...profile, edu_location: e.target.value })}
                        placeholder="Contoh: Bandung, Jawa Barat"
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Form: Wirausaha */}
              {profile.status_karir === 'Wirausaha' && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-4 text-xs">
                  <span className="font-bold text-amber-900 block">Detail Usaha Mandiri</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Usaha / Brand *</label>
                      <input
                        type="text"
                        required
                        value={profile.biz_name || ''}
                        onChange={(e) => setProfile({ ...profile, biz_name: e.target.value })}
                        placeholder="Contoh: Koding Creative Studio"
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bidang Usaha</label>
                      <input
                        type="text"
                        value={profile.biz_field || ''}
                        onChange={(e) => setProfile({ ...profile, biz_field: e.target.value })}
                        placeholder="Contoh: Jasa Pembuatan Website & Aplikasi"
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lokasi Usaha</label>
                      <input
                        type="text"
                        value={profile.biz_location || ''}
                        onChange={(e) => setProfile({ ...profile, biz_location: e.target.value })}
                        placeholder="Contoh: Depok, Jawa Barat"
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tahun Mulai Beroperasi</label>
                      <input
                        type="number"
                        value={profile.biz_start_year || 2025}
                        onChange={(e) => setProfile({ ...profile, biz_start_year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pengaturan Privasi Direktori */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-700" /> Pengaturan Privasi Direktori Alumni
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Tentukan siapa saja yang dapat menemukan profil Anda di direktori alumni sekolah
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { value: 'PUBLIC', label: 'Publik untuk Alumni', desc: 'Dapat dicari oleh sesama alumni terdaftar' },
                  { value: 'ADMIN_ONLY', label: 'Hanya Admin & Guru', desc: 'Hanya Guru BK & Operator yang melihat' },
                  { value: 'HIDDEN', label: 'Sembunyikan Profil', desc: 'Tidak ditampilkan di halaman pencarian' }
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      profile.privacy_setting === opt.value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy"
                      value={opt.value}
                      checked={profile.privacy_setting === opt.value}
                      onChange={() => setProfile({ ...profile, privacy_setting: opt.value as PrivacySetting })}
                      className="sr-only"
                    />
                    <span className="block font-bold">{opt.label}</span>
                    <span className="block text-[11px] text-slate-500 mt-1 font-normal">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
              </button>
            </div>
          </form>

          {/* 4. Riwayat Karir Timeline (Section 17) */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" /> Riwayat Karir & Pengalaman Kerja
                </h3>
                <p className="text-xs text-slate-500">Tambahkan perjalanan karir dari magang hingga pekerjaan saat ini</p>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Riwayat</span>
              </button>
            </div>

            {careerHistories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada riwayat karir yang ditambahkan. Klik tombol "+ Tambah Riwayat" di atas.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {careerHistories.map(item => (
                  <div key={item.id} className="relative group">
                    <div className={`absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${item.is_current ? 'bg-emerald-600 ring-emerald-200' : 'bg-slate-400 ring-slate-100'}`} />
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-emerald-800 tabular-nums">
                            {item.year_start} — {item.is_current ? 'Sekarang' : item.year_end}
                          </span>
                          {item.is_current && <Badge variant="success">Posisi Saat Ini</Badge>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{item.position}</h4>
                        <p className="text-xs font-medium text-slate-600">{item.company}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Hapus Pengalaman"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: File Upload (CV, Portfolio, Sertifikat) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" /> Berkas Portofolio & CV
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unggah CV, portofolio karya, atau sertifikat uji kompetensi (BNSP) untuk memudahkan perekrutan.
            </p>

            {/* Upload Area */}
            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-3">
              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Kategori Dokumen</label>
                <select
                  value={selectedDocCategory}
                  onChange={(e) => setSelectedDocCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="CV">Curriculum Vitae (CV)</option>
                  <option value="Portfolio">Portofolio Desain / Karya</option>
                  <option value="Sertifikat">Sertifikat Keahlian / BNSP</option>
                  <option value="Dokumen Lain">Dokumen Pendukung</option>
                </select>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Berkas (Maks. 5MB)</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">Format: PDF, JPG, PNG</p>
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold text-slate-800 block">Berkas Tersimpan ({documents.length})</span>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada berkas terunggah.</p>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                        PDF
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 tabular-nums">
                          {doc.category} · {(doc.file_size_kb / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => showToast('info', `Mengunduh berkas ${doc.name}...`)}
                        className="p-1 text-slate-500 hover:text-emerald-700"
                        title="Unduh"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Career History */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Tambah Riwayat Pengalaman Karir"
        maxWidth="md"
      >
        <form onSubmit={handleAddCareerHistory} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Posisi / Jabatan *</label>
            <input
              type="text"
              required
              value={historyFormData.position}
              onChange={(e) => setHistoryFormData({ ...historyFormData, position: e.target.value })}
              placeholder="Contoh: Frontend Developer Intern"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan / Organisasi *</label>
            <input
              type="text"
              required
              value={historyFormData.company}
              onChange={(e) => setHistoryFormData({ ...historyFormData, company: e.target.value })}
              placeholder="Contoh: PT Barito Cyber Solusindo"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tahun Mulai</label>
              <input
                type="number"
                value={historyFormData.year_start}
                onChange={(e) => setHistoryFormData({ ...historyFormData, year_start: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            {!historyFormData.is_current && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Selesai</label>
                <input
                  type="number"
                  value={historyFormData.year_end}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, year_end: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={historyFormData.is_current}
                onChange={(e) => setHistoryFormData({ ...historyFormData, is_current: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>Saya masih bekerja di posisi ini saat ini</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat Tanggung Jawab</label>
            <textarea
              rows={3}
              value={historyFormData.description}
              onChange={(e) => setHistoryFormData({ ...historyFormData, description: e.target.value })}
              placeholder="Jelaskan peran, teknologi yang digunakan, atau pencapaian Anda..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              Simpan Riwayat
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
