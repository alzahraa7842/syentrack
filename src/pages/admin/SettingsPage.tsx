import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  BellRing, 
  Save, 
  Send, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  Link as LinkIcon
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { SchoolSettings } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { compressImageFile } from '../../utils/imageUtils';
import { DEFAULT_HERO_IMAGE, resolveAssetUrl } from '../../constants/assets';

const HERO_PRESETS = [
  { label: 'Foto Default Sekolah', url: DEFAULT_HERO_IMAGE },
  { label: 'Karir & Profesional', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80' },
  { label: 'Wisuda & Kampus', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80' },
  { label: 'Teknologi & Industri', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80' }
];

export const SettingsPage: React.FC = () => {
  const { showToast, sendBroadcast } = useNotification();
  const [settings, setSettings] = useState<SchoolSettings>(StorageService.getSchoolSettings());
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [heroUrlInput, setHeroUrlInput] = useState('');
  const [previewImgError, setPreviewImgError] = useState(false);
  const isDirtyRef = useRef(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    const sync = () => {
      if (!isDirtyRef.current) {
        setSettings(StorageService.getSchoolSettings());
      }
    };
    window.addEventListener('alumnitrack_data_changed', sync);
    return () => window.removeEventListener('alumnitrack_data_changed', sync);
  }, []);

  const updateSettingsField = (patch: Partial<SchoolSettings>) => {
    isDirtyRef.current = true;
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleHeroPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Ukuran foto maksimal 10MB');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Harap pilih file gambar (JPG, PNG, WEBP)');
      e.target.value = '';
      return;
    }
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 800,
        quality: 0.85,
      });
      const saved = StorageService.saveSchoolSettings({ ...settings, landing_hero_image: compressed });
      isDirtyRef.current = false;
      setSettings(saved);
      setPreviewImgError(false);
      StorageService.addAuditLog('Admin', 'ADMIN', 'Mengunggah dan memperbarui foto utama Landing Page');
      showToast('success', 'Foto Landing Page berhasil diubah dan langsung diterapkan!');
    } catch {
      showToast('error', 'Gagal memproses berkas gambar');
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyHeroUrl = () => {
    if (!heroUrlInput.trim()) {
      showToast('error', 'Masukkan URL foto terlebih dahulu');
      return;
    }
    const saved = StorageService.saveSchoolSettings({ ...settings, landing_hero_image: heroUrlInput.trim() });
    isDirtyRef.current = false;
    setSettings(saved);
    setPreviewImgError(false);
    StorageService.addAuditLog('Admin', 'ADMIN', 'Mengubah URL foto utama Landing Page');
    showToast('success', 'Foto Landing Page berhasil diperbarui!');
    setHeroUrlInput('');
  };

  const handleSelectHeroPreset = (url: string) => {
    const saved = StorageService.saveSchoolSettings({ ...settings, landing_hero_image: url });
    isDirtyRef.current = false;
    setSettings(saved);
    setPreviewImgError(false);
    StorageService.addAuditLog('Admin', 'ADMIN', 'Mengubah foto utama Landing Page dari galeri preset');
    showToast('success', 'Foto Landing Page berhasil diganti!');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = StorageService.saveSchoolSettings(settings);
    isDirtyRef.current = false;
    setSettings(saved);
    StorageService.addAuditLog('Admin', 'ADMIN', 'Memperbarui profil sekolah, foto landing page, dan preferensi tracer study');
    showToast('success', 'Pengaturan sekolah & tampilan landing page berhasil disimpan');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast('error', 'Judul dan pesan siaran wajib diisi');
      return;
    }
    sendBroadcast(broadcastTitle, broadcastMessage);
    StorageService.addAuditLog('Admin', 'ADMIN', `Mengirim broadcast siaran: ${broadcastTitle}`);
    setBroadcastTitle('');
    setBroadcastMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sekolah & Preferensi Sistem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Konfigurasi identitas lembaga, logo kop surat, jadwal pengingat otomatis, dan siaran pengumuman
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: School Profile & Reminder Settings */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Section 1: Profil Sekolah */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-emerald-700" /> Profil Lembaga & Identitas Sekolah
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Resmi Sekolah *</label>
                  <input
                    type="text"
                    required
                    value={settings.name}
                    onChange={(e) => updateSettingsField({ name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NPSN</label>
                  <input
                    type="text"
                    value={settings.npsn}
                    onChange={(e) => updateSettingsField({ npsn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran Aktif</label>
                  <input
                    type="text"
                    value={settings.academic_year}
                    onChange={(e) => updateSettingsField({ academic_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Slogan / Tagline Lembaga</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => updateSettingsField({ tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => updateSettingsField({ address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Resmi Sekolah</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSettingsField({ email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp BKK</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => updateSettingsField({ phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Foto & Tampilan Landing Page */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-700" /> Foto Utama Landing Page (Hero Section)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah foto yang tampil di halaman depan (Landing Page) dengan mengunggah foto sekolah/alumni, memasukkan URL gambar, atau memilih galeri preset.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                {/* Live Preview */}
                <div className="md:col-span-5">
                  <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">Pratinjau di Landing Page</span>
                  <div className="relative rounded-xl overflow-hidden shadow-md border border-slate-200 aspect-16/10 bg-slate-900">
                    {!previewImgError && (
                      <img
                        src={resolveAssetUrl(settings.landing_hero_image, DEFAULT_HERO_IMAGE)}
                        alt="Pratinjau Hero Landing Page"
                        className="w-full h-full object-cover opacity-90"
                        onError={() => setPreviewImgError(true)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                        {settings.name}
                      </span>
                      <p className="text-xs font-bold leading-snug line-clamp-2">
                        {settings.landing_hero_caption || 'Mewujudkan Lulusan Siap Kerja, Berdaya Saing & Berakhlak Mulia'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="md:col-span-7 space-y-3 text-xs">
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleHeroPhotoUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => heroInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Unggah Foto Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectHeroPreset(DEFAULT_HERO_IMAGE)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Default</span>
                    </button>
                  </div>

                  {/* URL Input */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Atau Tempel URL Foto</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="url"
                          value={heroUrlInput}
                          onChange={(e) => setHeroUrlInput(e.target.value)}
                          placeholder="https://contoh.com/foto-sekolah.jpg"
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyHeroUrl}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Picker */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">Pilihan Cepat Galeri</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {HERO_PRESETS.map((preset) => {
                        const isActive = resolveAssetUrl(settings.landing_hero_image, DEFAULT_HERO_IMAGE) === preset.url;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleSelectHeroPreset(preset.url)}
                            className={`group relative rounded-lg overflow-hidden border-2 aspect-16/10 transition-all cursor-pointer ${
                              isActive ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 text-white text-[9px] font-semibold px-1 py-0.5 truncate">
                              {preset.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Caption Input */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teks Keterangan Foto Hero</label>
                    <input
                      type="text"
                      value={settings.landing_hero_caption || ''}
                      onChange={(e) => updateSettingsField({ landing_hero_caption: e.target.value })}
                      placeholder="Mewujudkan Lulusan Siap Kerja, Berdaya Saing & Berakhlak Mulia"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Jadwal Pengingat Tracer Study Otomatis (Cron Simulation) */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <BellRing className="w-4 h-4 text-emerald-700" /> Otomasi Pengingat Tracer Study
              </h3>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 text-xs">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.reminder_7_days}
                    onChange={(e) => updateSettingsField({ reminder_7_days: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Pengingat H-7 Deadline</span>
                    <p className="text-slate-500 text-[11px]">"Tracer Study akan ditutup dalam 7 hari."</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.reminder_3_days}
                    onChange={(e) => updateSettingsField({ reminder_3_days: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Pengingat H-3 Deadline</span>
                    <p className="text-slate-500 text-[11px]">"Segera lengkapi Tracer Study Anda untuk pendataan akreditasi."</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.reminder_1_day}
                    onChange={(e) => updateSettingsField({ reminder_1_day: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Pengingat H-1 (Batas Akhir)</span>
                    <p className="text-slate-500 text-[11px]">"Besok adalah batas akhir pengisian Tracer Study."</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Broadcast Notification Tool */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-700" /> Siaran Notifikasi Massal (Broadcast)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kirimkan pengumuman serentak yang akan muncul di bilah lonceng notifikasi seluruh akun alumni.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lowongan Baru Mitra Astra Graphia"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pesan Lengkap</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan isi pesan siaran ke seluruh alumni..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Siaran Sekarang</span>
              </button>
            </form>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4" /> Keamanan & Hak Akses
            </span>
            <p className="text-emerald-800/90 leading-relaxed">
              Semua perubahan pengaturan dan siaran tercatat secara kronologis di Audit Log demi transparansi tata kelola sekolah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
