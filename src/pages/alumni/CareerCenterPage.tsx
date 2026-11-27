import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  CalendarPlus, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Plus,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  X,
  Sparkles
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { CalendarService } from '../../services/calendarService';
import { JobPosting } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const PRESET_JOB_IMAGES = [
  { label: 'Web & Software', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800' },
  { label: 'Desain & Kreatif', url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800' },
  { label: 'Beasiswa Kuliah', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800' },
  { label: 'Magang Industri', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800' },
  { label: 'Bisnis & Akuntansi', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800' },
  { label: 'Seminar / Event', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800' }
];

export const AlumniCareerCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [jobs, setJobs] = useState<JobPosting[]>(() => 
    StorageService.getJobs().filter(j => j.status === 'Published')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shareFormData, setShareFormData] = useState({
    title: '',
    company: '',
    location: 'Jakarta',
    type: 'Full-time' as any,
    category: 'Lowongan kerja' as any,
    deadline: '2026-11-30',
    description: '',
    requirements: '',
    apply_url: '',
    contact_email: '',
    image: ''
  });

  const reloadJobs = () => {
    setJobs(StorageService.getJobs().filter(j => j.status === 'Published'));
  };

  useEffect(() => {
    window.addEventListener('alumnitrack_data_changed', reloadJobs);
    return () => window.removeEventListener('alumnitrack_data_changed', reloadJobs);
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchCat = selectedCategory === 'ALL' || job.category === selectedCategory;
    const matchSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        job.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAddToCalendar = (job: JobPosting) => {
    const url = CalendarService.createGoogleCalendarUrl({
      title: `[Deadline] ${job.title} di ${job.company}`,
      description: `${job.description}\n\nLamar via: ${job.apply_url || job.contact_email}`,
      location: job.location,
      startDate: job.deadline
    });
    window.open(url, '_blank');
    showToast('success', 'Membuka Google Calendar...');
  };

  const handleApplyClick = (job: JobPosting) => {
    if (job.apply_url) {
      window.open(job.apply_url, '_blank');
    } else {
      setSelectedJob(job);
    }
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
        setShareFormData(prev => ({ ...prev, image: reader.result as string }));
        showToast('success', 'Gambar brosur/poster berhasil dipilih');
      }
    };
    reader.onerror = () => {
      showToast('error', 'Gagal memproses file gambar');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSharedJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareFormData.title.trim() || !shareFormData.company.trim()) {
      showToast('error', 'Judul posisi dan Perusahaan wajib diisi');
      return;
    }

    const newJob: JobPosting = {
      id: 0,
      ...shareFormData,
      status: 'Published',
      event_date: shareFormData.deadline,
      created_at: new Date().toISOString().split('T')[0],
      posted_by: user?.name || 'Alumni'
    };

    StorageService.saveJob(newJob);
    StorageService.addAuditLog(user?.name || 'Alumni', 'ALUMNI', `Membagikan info karir baru: ${newJob.title}`);
    showToast('success', 'Info karir berhasil dipublikasikan!');
    setIsShareModalOpen(false);
    setShareFormData({
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
      image: ''
    });
    reloadJobs();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pusat Karir & Bursa Kerja Khusus (BKK)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Informasi resmi lowongan pekerjaan mitra sekolah, beasiswa kuliah vokasi, magang bersertifikat, dan event karir
          </p>
        </div>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Bagikan Info Karir</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
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
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map(job => (
          <div
            key={job.id}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden group"
          >
            {/* Flyer / Poster Image Banner */}
            {job.image ? (
              <div 
                className="relative h-44 w-full bg-slate-100 overflow-hidden cursor-pointer"
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
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/95 text-emerald-800 backdrop-blur-xs shadow-xs">
                    {job.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-300" /> {job.deadline}
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-xs">
                  <Eye className="w-3.5 h-3.5 text-emerald-300" /> Perbesar Poster
                </div>
              </div>
            ) : null}

            <div className={`p-6 space-y-3 ${job.image ? 'pt-4' : ''}`}>
              {!job.image && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">
                    {job.category}
                  </span>
                  <span className="text-xs text-rose-600 font-semibold flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3" /> {job.deadline}
                  </span>
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
                    title="Lihat Brosur / Poster"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleAddToCalendar(job)}
                  title="Tambah Pengingat ke Google Calendar"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedJob(job)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Lihat Detail
                </button>
              </div>

              <button
                onClick={() => handleApplyClick(job)}
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Daftar / Lamar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Bagikan Info Karir (Alumni Submission with Image Upload) */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Bagikan Info Karir / Lowongan / Magang"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSharedJob} className="space-y-4">
          {/* Gambar Poster Uploader */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Gambar / Poster / Brosur Lowongan</span>
                <span className="text-[11px] font-normal text-slate-400">(Sangat disarankan)</span>
              </label>
              {shareFormData.image && (
                <button
                  type="button"
                  onClick={() => setShareFormData({ ...shareFormData, image: '' })}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Hapus Gambar
                </button>
              )}
            </div>

            {/* Preview Banner */}
            {shareFormData.image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900 group">
                <img 
                  src={shareFormData.image} 
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
                    onClick={() => setPreviewImageModal({ url: shareFormData.image, title: shareFormData.title || 'Preview Gambar' })}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Perbesar
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
                  Klik untuk unggah poster / pamflet lowongan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Format JPG, PNG, atau WebP (Maks 5MB)
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

            {/* Alternatif URL atau Template */}
            <div className="space-y-1.5 pt-1">
              <input
                type="url"
                value={shareFormData.image.startsWith('data:') ? '' : shareFormData.image}
                onChange={(e) => setShareFormData({ ...shareFormData, image: e.target.value })}
                placeholder="Atau tempel link URL gambar (https://...)..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Contoh gambar:
                </span>
                {PRESET_JOB_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setShareFormData({ ...shareFormData, image: preset.url })}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Posisi / Peluang *</label>
              <input
                type="text"
                required
                value={shareFormData.title}
                onChange={(e) => setShareFormData({ ...shareFormData, title: e.target.value })}
                placeholder="Contoh: Magang Graphic Design atau Staff Akuntansi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Perusahaan / Instansi *</label>
              <input
                type="text"
                required
                value={shareFormData.company}
                onChange={(e) => setShareFormData({ ...shareFormData, company: e.target.value })}
                placeholder="Nama Perusahaan / Organisasi"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi</label>
              <input
                type="text"
                value={shareFormData.location}
                onChange={(e) => setShareFormData({ ...shareFormData, location: e.target.value })}
                placeholder="Jakarta / Bandung / Remote"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={shareFormData.category}
                onChange={(e) => setShareFormData({ ...shareFormData, category: e.target.value as any })}
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
                value={shareFormData.type}
                onChange={(e) => setShareFormData({ ...shareFormData, type: e.target.value as any })}
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
                value={shareFormData.deadline}
                onChange={(e) => setShareFormData({ ...shareFormData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Link Pendaftaran (URL) atau Email</label>
              <input
                type="text"
                value={shareFormData.apply_url}
                onChange={(e) => setShareFormData({ ...shareFormData, apply_url: e.target.value })}
                placeholder="https://... atau hrd@kantor.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
            <textarea
              rows={3}
              value={shareFormData.description}
              onChange={(e) => setShareFormData({ ...shareFormData, description: e.target.value })}
              placeholder="Tuliskan info tentang posisi, gambaran tugas, atau info pendaftaran..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Publikasikan Info Karir
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail & Apply Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={selectedJob.title}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Show Flyer if available */}
            {selectedJob.image && (
              <div 
                className="relative h-52 w-full rounded-xl overflow-hidden bg-slate-100 group cursor-pointer border border-slate-200"
                onClick={() => setPreviewImageModal({ url: selectedJob.image!, title: `${selectedJob.title} - ${selectedJob.company}` })}
              >
                <img 
                  src={selectedJob.image} 
                  alt={selectedJob.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs font-semibold">
                    <Eye className="w-4 h-4 text-emerald-300" /> Klik untuk Perbesar Poster
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedJob.company}</p>
                <p className="text-slate-500">{selectedJob.location} · {selectedJob.type}</p>
              </div>
              <Badge variant="primary">{selectedJob.category}</Badge>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Deskripsi Lengkap</span>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {selectedJob.description}
              </p>
            </div>

            {selectedJob.requirements && (
              <div>
                <span className="font-bold text-slate-900 block mb-1">Kualifikasi / Persyaratan</span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedJob.requirements}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-emerald-900 font-semibold">Tenggat Waktu: {selectedJob.deadline}</span>
              <button
                onClick={() => handleAddToCalendar(selectedJob)}
                className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
              >
                <CalendarPlus className="w-3.5 h-3.5" /> Tambahkan ke Google Calendar
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  if (selectedJob.apply_url) window.open(selectedJob.apply_url, '_blank');
                  else showToast('success', 'Silakan hubungi email: ' + (selectedJob.contact_email || 'hrd@perusahaan.com'));
                  setSelectedJob(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-2"
              >
                <span>Kirim Lamaran Sekarang</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Modal>
      )}

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
    </div>
  );
};
