import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Edit, 
  Sliders, 
  FileText,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import { TracerSurvey, AlumniProfile } from '../../types';
import { StorageService } from '../../services/storageService';
import { EmailService } from '../../services/emailService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';

interface TracerStudyPageProps {
  onNavigate: (path: string) => void;
}

export const TracerStudyPage: React.FC<TracerStudyPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const schoolSettings = StorageService.getSchoolSettings();
  const [surveys, setSurveys] = useState<TracerSurvey[]>(StorageService.getSurveys());
  const [alumniList, setAlumniList] = useState<AlumniProfile[]>(StorageService.getAlumniList());

  // Batch Multi-Select state
  const [selectedAlumniIds, setSelectedAlumniIds] = useState<number[]>([]);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setSurveys(StorageService.getSurveys());
      setAlumniList(StorageService.getAlumniList());
    };
    window.addEventListener('alumnitrack_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('alumnitrack_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<TracerSurvey | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_angkatan: 2025,
    deadline: '2026-10-31',
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
    total_target: 1205
  });

  const reloadSurveys = () => {
    setSurveys(StorageService.getSurveys());
  };

  const handleOpenAddModal = () => {
    setEditingSurvey(null);
    setFormData({
      title: 'Tracer Study Alumni Angkatan 2025/2026',
      description: 'Pendataan kondisi alumni setelah lulus dari sekolah untuk pemetaan kurikulum dan akreditasi.',
      target_angkatan: 2025,
      deadline: '2026-10-31',
      status: 'Aktif',
      total_target: 1205
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (survey: TracerSurvey) => {
    setEditingSurvey(survey);
    setFormData({
      title: survey.title,
      description: survey.description,
      target_angkatan: survey.target_angkatan,
      deadline: survey.deadline,
      status: survey.status,
      total_target: survey.total_target
    });
    setIsModalOpen(true);
  };

  const handleSaveSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('error', 'Judul Tracer Study wajib diisi');
      return;
    }

    if (editingSurvey) {
      const updated: TracerSurvey = {
        ...editingSurvey,
        ...formData
      };
      StorageService.saveSurvey(updated);
      StorageService.addAuditLog('Admin', 'ADMIN', `Memperbarui Tracer Study: ${updated.title}`);
      showToast('success', 'Tracer Study berhasil diperbarui');
    } else {
      const newSurvey: TracerSurvey = {
        id: 0,
        ...formData,
        created_at: new Date().toISOString().split('T')[0]
      };
      StorageService.saveSurvey(newSurvey);
      StorageService.addAuditLog('Admin', 'ADMIN', `Membuat Tracer Study Baru: ${newSurvey.title}`);
      showToast('success', 'Tracer Study baru berhasil dibuat');
    }

    setIsModalOpen(false);
    reloadSurveys();
  };

  const handleToggleStatus = (survey: TracerSurvey) => {
    const updated: TracerSurvey = {
      ...survey,
      status: survey.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    };
    StorageService.saveSurvey(updated);
    showToast('info', `Status ${survey.title} diubah menjadi ${updated.status}`);
    reloadSurveys();
  };

  const handleSendReminder = (alumni: AlumniProfile) => {
    EmailService.dispatchEmailNotification({
      recipientEmail: alumni.email,
      recipientName: alumni.name,
      userId: alumni.user_id,
      subject: `[PENTING] Pengingat Pengisian Tracer Study - ${schoolSettings.name}`,
      previewText: `Mohon kesediaan Anda mengisi kuesioner tracer study sebelum batas waktu berakhir.`,
      category: 'Tracer Study',
      contentMarkdown: `Halo ${alumni.name}, kami memohon kesediaan Anda menyisihkan waktu sejenak untuk melengkapi kuesioner Tracer Study resmi sekolah. Data Anda sangat krusial bagi akreditasi dan penyaluran karier alumni baru.`,
      actionLabel: 'Isi Kuesioner Sekarang',
      actionUrl: '/alumni/tracer-study'
    });

    showToast('success', `Pengingat resmi berhasil dikirim langsung ke email terdaftar: ${alumni.email}`);
  };

  const handleBroadcastReminder = () => {
    const sentCount = EmailService.broadcastToAlumniEmails({
      subject: `[SIARAN RESMI] Pengingat Pengisian Tracer Study Sekolah - ${schoolSettings.name}`,
      previewText: `Batas pengisian kuesioner penelusuran tamatan akan segera berakhir.`,
      category: 'Tracer Study',
      contentMarkdown: `Pemberitahuan kepada seluruh alumni: Harap segera mengisi dan memperbarui kuesioner Tracer Study pada portal resmi sekolah sebelum tenggat waktu berakhir.`,
      actionLabel: 'Buka Kuesioner Tracer Study',
      actionUrl: '/alumni/tracer-study'
    });

    StorageService.sendBroadcastNotification(
      'Pengingat Pengisian Tracer Study',
      'Batas pengisian kuesioner tracer study segera berakhir. Mohon seluruh alumni melengkapi kuesioner.',
      'ALUMNI'
    );

    showToast('success', `Pengingat berhasil disiarkan & dikirimkan ke ${sentCount} email user alumni yang terdaftar!`);
  };

  // Batch Selection Handlers
  const isAllSelected = alumniList.length > 0 && alumniList.every(a => selectedAlumniIds.includes(a.id));
  const isSomeSelected = alumniList.some(a => selectedAlumniIds.includes(a.id));

  const handleToggleSelect = (id: number) => {
    setSelectedAlumniIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAlumniIds([]);
    } else {
      setSelectedAlumniIds(alumniList.map(a => a.id));
    }
  };

  const handleBatchResetConfirm = () => {
    selectedAlumniIds.forEach(id => {
      const alum = StorageService.getAlumniById(id);
      if (alum) {
        StorageService.saveAlumni({ ...alum, status_tracer: 'Belum Mengisi' });
      }
    });
    StorageService.addAuditLog('Admin BK', 'ADMIN', `Mereset/menghapus respon tracer study untuk ${selectedAlumniIds.length} alumni`);
    showToast('success', `${selectedAlumniIds.length} status respon tracer study berhasil direset/dihapus`);
    setSelectedAlumniIds([]);
    setIsBatchDeleteDialogOpen(false);
    setAlumniList(StorageService.getAlumniList());
  };

  const handleBatchSendReminder = () => {
    const selectedAlums = alumniList.filter(a => selectedAlumniIds.includes(a.id));
    selectedAlums.forEach(a => {
      EmailService.dispatchEmailNotification({
        recipientEmail: a.email,
        recipientName: a.name,
        subject: `[PENGINGAT] Pengisian Tracer Study - ${schoolSettings.name}`,
        previewText: `Pengingat pengisian tracer study alumni ${schoolSettings.name}.`,
        category: 'Tracer Study',
        contentMarkdown: `Halo ${a.name}, mohon luangkan waktu untuk mengisi kuesioner Tracer Study resmi sekolah untuk akreditasi.`,
        actionLabel: 'Isi Tracer Study',
        actionUrl: '/alumni/tracer-study'
      });
    });
    showToast('success', `Pengingat email berhasil dikirim ke ${selectedAlums.length} alumni terpilih!`);
  };

  // Calculations for Monitoring Table
  const sudahCount = alumniList.filter(a => a.status_tracer === 'Sudah Mengisi').length;
  const belumCount = alumniList.filter(a => a.status_tracer !== 'Sudah Mengisi').length;
  const targetTotal = alumniList.length || 1;
  const completionPercentage = Math.round((sudahCount / targetTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen & Monitoring Tracer Study
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola periode survei penelusuran lulusan, tentukan tenggat waktu, dan pantau respons alumni
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('/admin/tracer-study/builder')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>Desain Kuesioner</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Periode Baru</span>
          </button>
        </div>
      </div>

      {/* Survey Periods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {surveys.map(survey => {
          const isCurrentActive = survey.status === 'Aktif';

          return (
            <div
              key={survey.id}
              className={`bg-white rounded-2xl p-6 border shadow-xs transition-all flex flex-col justify-between ${
                isCurrentActive ? 'border-emerald-500/80 ring-2 ring-emerald-500/10' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={isCurrentActive ? 'success' : 'neutral'}>
                    {survey.status}
                  </Badge>
                  <span className="text-xs text-slate-400 tabular-nums">
                    Target: Angkatan {survey.target_angkatan}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {survey.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {survey.description}
                </p>

                <div className="pt-2 flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Batas: <strong>{survey.deadline}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Target: <strong>{survey.total_target} Alumni</strong>
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(survey)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title="Edit Periode"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('/admin/tracer-study/builder')}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                    title="Edit Kuesioner Pertanyaan"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleToggleStatus(survey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isCurrentActive
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {isCurrentActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monitoring Card: Response Progress */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Monitoring Keterisian Tracer Study Berjalan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi ketercapaian target responden untuk kebutuhan akreditasi sekolah
            </p>
          </div>

          <button
            onClick={handleBroadcastReminder}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-center shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Pengingat Masal</span>
          </button>
        </div>

        {/* Big Progress Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 tabular-nums">
            <span>Persentase Pengisian: {completionPercentage}%</span>
            <span>{sudahCount} dari {targetTotal} alumni terdaftar</span>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>✓ {sudahCount} sudah mengisi</span>
            <span className="text-rose-600 font-semibold">⚠ {belumCount} belum mengisi</span>
          </div>
        </div>

        {/* Multi-Select Action Toolbar */}
        {selectedAlumniIds.length > 0 && (
          <div className="bg-emerald-950 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 border border-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-800/80 text-emerald-200 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {selectedAlumniIds.length} alumni terpilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchSendReminder}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Kirim Pengingat ({selectedAlumniIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchDeleteDialogOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset / Hapus Respon ({selectedAlumniIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAlumniIds([])}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-800 text-emerald-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Monitoring Alumni Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = !isAllSelected && isSomeSelected;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    aria-label="Pilih semua alumni"
                    className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Nama Alumni</th>
                <th className="py-2.5 px-3">Angkatan</th>
                <th className="py-2.5 px-3">Jurusan</th>
                <th className="py-2.5 px-3">Status Pengisian</th>
                <th className="py-2.5 px-3">Tanggal Update</th>
                <th className="py-2.5 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alumniList.map(alumni => {
                const isSelected = selectedAlumniIds.includes(alumni.id);
                return (
                  <tr 
                    key={alumni.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(alumni.id)}
                        aria-label={`Pilih ${alumni.name}`}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{alumni.name}</td>
                    <td className="py-2.5 px-3 tabular-nums">{alumni.angkatan}</td>
                    <td className="py-2.5 px-3">{alumni.jurusan}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={alumni.status_tracer === 'Sudah Mengisi' ? 'success' : 'danger'}>
                        {alumni.status_tracer}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 tabular-nums">{alumni.updated_at}</td>
                    <td className="py-2.5 px-3 text-right">
                      {alumni.status_tracer !== 'Sudah Mengisi' ? (
                        <button
                          onClick={() => handleSendReminder(alumni)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] transition-colors cursor-pointer"
                          title={`Kirim notifikasi email ke: ${alumni.email}`}
                        >
                          Kirim Pengingat
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">Selesai</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Period Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSurvey ? 'Edit Periode Tracer Study' : 'Buat Periode Tracer Study Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSurvey} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Tracer Study *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Angkatan</label>
              <input
                type="number"
                value={formData.target_angkatan}
                onChange={(e) => setFormData({ ...formData, target_angkatan: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Jumlah Alumni</label>
              <input
                type="number"
                value={formData.total_target}
                onChange={(e) => setFormData({ ...formData, total_target: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Waktu (Deadline)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Periode</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
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
              Simpan Periode
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Reset / Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBatchDeleteDialogOpen}
        onClose={() => setIsBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchResetConfirm}
        title={`Reset / Hapus Respon ${selectedAlumniIds.length} Alumni`}
        message={`Apakah Anda yakin ingin mereset dan menghapus data pengisian tracer study untuk ${selectedAlumniIds.length} alumni terpilih? Status mereka akan dikembalikan ke 'Belum Mengisi'.`}
        confirmLabel={`Ya, Hapus/Reset (${selectedAlumniIds.length})`}
        cancelLabel="Batal"
        isDestructive={true}
      />
    </div>
  );
};
