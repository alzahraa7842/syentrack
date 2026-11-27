import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Archive, 
  CheckCircle2,
  CalendarPlus,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  X,
  Sparkles
} from 'lucide-react';
import { JobPosting } from '../../types';
import { StorageService } from '../../services/storageService';
import { CalendarService } from '../../services/calendarService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';

const PRESET_JOB_IMAGES = [
  { label: 'Web & Software', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800' },
  { label: 'Desain & Kreatif', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800' },
  { label: 'Beasiswa Kuliah', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800' },
  { label: 'Magang Industri', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800' },
  { label: 'Bisnis & Akuntansi', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800' },
  { label: 'Seminar / Event', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800' }
];

export const JobManagementPage: React.FC = () => {
  const { showToast } = useNotification();
  const [jobs, setJobs] = useState<JobPosting[]>(StorageService.getJobs());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobPosting | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: 'Jakarta (Hybrid)',
    type: 'Full-time' as any,
    category: 'Lowongan kerja' as any,
    deadline: '2026-11-30',
    description: '',
    requirements: '',
    apply_url: '',
    contact_email: '',
    status: 'Published' as any,
    event_date: '2026-11-30',
    image: ''
  });

  const reloadJobs = () => {
    setJobs(StorageService.getJobs());
  };

  useEffect(() => {
    window.addEventListener('alumnitrack_data_changed', reloadJobs);
    return () => window.removeEventListener('alumnitrack_data_changed', reloadJobs);
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchCategory = selectedCategory === 'ALL' || job.category === selectedCategory;
    const matchSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        job.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      company: '',
      location: 'Jakarta',
      type: 'Full-time',
      category: 'Lowongan kerja',
      deadline: '2026-11-30',
      description: '',
      requirements: '',
      apply_url: '',
      contact_email: '',
      status: 'Published',
      event_date: '2026-11-30',
      image: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      category: job.category,
      deadline: job.deadline,
      description: job.description,
      requirements: job.requirements || '',
      apply_url: job.apply_url || '',
      contact_email: job.contact_email || '',
      status: job.status,
      event_date: job.event_date || job.deadline,
      image: job.image || ''
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Silakan pilih file gambar yang valid (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ukuran gambar maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
        showToast('success', 'Gambar brosur/poster berhasil dipilih');
      }
    };
    reader.onerror = () => {
      showToast('error', 'Gagal memproses file gambar');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.company.trim()) {
      showToast('error', 'Judul dan Nama Perusahaan/Instansi wajib diisi');
      return;
    }

    if (editingJob) {
      const updated: JobPosting = {
        ...editingJob,
        ...formData
      };
      StorageService.saveJob(updated);
      StorageService.addAuditLog('Admin', 'ADMIN', `Memperbarui posting karir: ${updated.title}`);
      showToast('success', 'Posting karir berhasil diperbarui');
    } else {
      const newJob: JobPosting = {
        id: 0,
        ...formData,
        created_at: new Date().toISOString().split('T')[0]
      };
      StorageService.saveJob(newJob);
      StorageService.addAuditLog('Admin', 'ADMIN', `Membuat posting karir baru: ${newJob.title}`);
      showToast('success', 'Peluang karir baru berhasil dipublikasikan');
    }

    setIsModalOpen(false);
    reloadJobs();
  };

  const handleToggleArchive = (job: JobPosting) => {
    const nextStatus = job.status === 'Archived' ? 'Published' : 'Archived';
    StorageService.saveJob({ ...job, status: nextStatus });
    showToast('info', `Status lowongan diubah menjadi ${nextStatus}`);
    reloadJobs();
  };

  const handleDeleteJob = () => {
    if (jobToDelete) {
      StorageService.deleteJob(jobToDelete.id);
      StorageService.addAuditLog('Admin', 'ADMIN', `Menghapus lowongan: ${jobToDelete.title}`);
      showToast('success', 'Posting lowongan telah dihapus');
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
      reloadJobs();
    }
  };

  const handleAddToGoogleCalendar = (job: JobPosting) => {
    const calendarUrl = CalendarService.createGoogleCalendarUrl({
      title: `[Deadline] ${job.title} - ${job.company}`,
      description: `${job.description}\n\nLamar via: ${job.apply_url || job.contact_email || 'Portal Alumni'}`,
      location: job.location,
      startDate: job.deadline
    });
    window.open(calendarUrl, '_blank');
    showToast('success', 'Membuka Google Calendar...');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pusat Karir & Bursa Kerja Khusus (BKK)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Publikasikan lowongan kerja mitra industri, beasiswa perguruan tinggi, magang kerja, dan event webinar karir
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Lowongan / Event</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lowongan atau perusahaan..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium w-full sm:w-auto">
          {['ALL', 'Lowongan kerja', 'Beasiswa', 'Magang', 'Event', 'Pelatihan'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map(job => (
          <div
            key={job.id}
            className={`bg-white rounded-2xl border shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-all overflow-hidden ${
              job.status === 'Archived' ? 'opacity-60 bg-slate-50/50' : 'border-slate-200'
            }`}
          >
            {/* Poster / Flyer Header */}
            {job.image ? (
              <div 
                className="relative h-44 w-full bg-slate-100 overflow-hidden group cursor-pointer"
                onClick={() => setPreviewImageModal({ url: job.image!, title: `${job.title} - ${job.company}` })}
              >
                <img 
                  src={job.image} 
                  alt={job.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20" />
                
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/90 text-slate-800 backdrop-blur-xs shadow-xs">
                    {job.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <Badge variant={job.status === 'Published' ? 'success' : 'neutral'}>
                    {job.status}
                  </Badge>
                </div>

                <div className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-xs">
                  <Eye className="w-3 h-3" /> Perbesar Poster
                </div>
              </div>
            ) : null}

            <div className={`p-6 space-y-3 ${job.image ? 'pt-4' : ''}`}>
              {!job.image && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">
                    {job.category}
                  </span>
                  <Badge variant={job.status === 'Published' ? 'success' : 'neutral'}>
                    {job.status}
                  </Badge>
                </div>
              )}

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {job.title}
              </h3>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {job.company}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {job.location} ({job.type})
                </p>
                <p className="flex items-center gap-2 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Batas Akhir: <strong>{job.deadline}</strong>
                </p>
              </div>

              <p className="text-xs text-slate-500 pt-2 line-clamp-3 leading-relaxed border-t border-slate-100">
                {job.description}
              </p>
            </div>

            <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
              <div className="flex items-center gap-1">
                {job.image && (
                  <button
                    onClick={() => setPreviewImageModal({ url: job.image!, title: `${job.title} - ${job.company}` })}
                    title="Lihat Gambar Poster"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleAddToGoogleCalendar(job)}
                  title="Tambahkan ke Google Calendar"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEditModal(job)}
                  title="Edit Lowongan"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-slate-100 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setJobToDelete(job);
                    setIsDeleteDialogOpen(true);
                  }}
                  title="Hapus Lowongan"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleToggleArchive(job)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {job.status === 'Archived' ? 'Publikasikan' : 'Arsipkan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJob ? 'Edit Informasi Karir' : 'Buat Lowongan / Beasiswa / Event Baru'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveJob} className="space-y-4">
          {/* Gambar / Poster Lowongan Section */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Gambar / Poster / Brosur Lowongan</span>
                <span className="text-[11px] font-normal text-slate-400">(Opsional)</span>
              </label>
              {formData.image && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Hapus Gambar
                </button>
              )}
            </div>

            {/* Preview Banner if image selected */}
            {formData.image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900 group">
                <img 
                  src={formData.image} 
                  alt="Preview Poster" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-100 flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Ganti Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImageModal({ url: formData.image, title: formData.title || 'Preview Gambar' })}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Lihat Ukuran Penuh
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors"
              >
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">
                  Klik untuk unggah poster / foto brosur lowongan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Format PNG, JPG, JPEG, atau WebP (Maks 5MB)
                </p>
              </div>
            )}

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload}
            />

            {/* Input URL Alternatif */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={formData.image.startsWith('data:') ? '' : formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Atau tempel tautan URL gambar flyer (https://...)..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Contoh gambar:
                </span>
                {PRESET_JOB_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, image: preset.url })}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Posisi / Program *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Junior Frontend Web Developer"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Perusahaan / Penyelenggara *</label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="PT Telkom Indonesia"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Jakarta Selatan (Hybrid)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="Lowongan kerja">Lowongan kerja</option>
                <option value="Beasiswa">Beasiswa</option>
                <option value="Magang">Magang</option>
                <option value="Event">Event</option>
                <option value="Pelatihan">Pelatihan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Pekerjaan</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Akhir (Deadline)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan Pendaftaran (URL)</label>
              <input
                type="url"
                value={formData.apply_url}
                onChange={(e) => setFormData({ ...formData, apply_url: e.target.value })}
                placeholder="https://karir.perusahaan.com/apply"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Lowongan</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Jelaskan ruang lingkup pekerjaan atau detail event..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kualifikasi / Persyaratan (Opsional)</label>
            <textarea
              rows={2}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="Contoh: Menguasai dasar Git, lulusan SMK PPLG/DKV..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Simpan & Publikasikan
            </button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Preview Modal */}
      {previewImageModal && (
        <Modal
          isOpen={!!previewImageModal}
          onClose={() => setPreviewImageModal(null)}
          title={previewImageModal.title}
          maxWidth="3xl"
        >
          <div className="space-y-4">
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img 
                src={previewImageModal.url} 
                alt={previewImageModal.title} 
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">{previewImageModal.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteJob}
        title="Konfirmasi Hapus Lowongan"
        message={`Apakah Anda yakin ingin menghapus "${jobToDelete?.title}"? Data lowongan ini tidak akan dapat diakses alumni lagi.`}
      />
    </div>
  );
};
