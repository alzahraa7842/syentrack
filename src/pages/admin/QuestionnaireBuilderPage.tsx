import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  CheckCircle2, 
  HelpCircle, 
  Sliders, 
  Eye, 
  Save, 
  Layers
} from 'lucide-react';
import { TracerQuestion, QuestionType } from '../../types';
import { StorageService } from '../../services/storageService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useNotification } from '../../contexts/NotificationContext';

interface QuestionnaireBuilderPageProps {
  onNavigate: (path: string) => void;
}

export const QuestionnaireBuilderPage: React.FC<QuestionnaireBuilderPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const activeSurvey = StorageService.getActiveSurvey();
  const surveyId = activeSurvey?.id || 1;

  const [questions, setQuestions] = useState<TracerQuestion[]>(StorageService.getQuestions(surveyId));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TracerQuestion | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    section: string;
    question_text: string;
    question_type: QuestionType;
    required: boolean;
    options: string;
  }>({
    section: 'Status Setelah Lulus',
    question_text: '',
    question_type: 'radio',
    required: true,
    options: 'Bekerja\nKuliah\nWirausaha\nMencari Pekerjaan\nLainnya'
  });

  const reloadQuestions = () => {
    setQuestions(StorageService.getQuestions(surveyId));
  };

  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      section: 'Relevansi & Kompetensi',
      question_text: '',
      question_type: 'radio',
      required: true,
      options: 'Pilihan 1\nPilihan 2\nPilihan 3'
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (q: TracerQuestion) => {
    setEditingQuestion(q);
    setFormData({
      section: q.section || 'Umum',
      question_text: q.question_text,
      question_type: q.question_type,
      required: q.required,
      options: q.options ? q.options.join('\n') : ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question_text.trim()) {
      showToast('error', 'Teks pertanyaan wajib diisi');
      return;
    }

    const needsOptions = ['radio', 'checkbox', 'dropdown'].includes(formData.question_type);
    const parsedOptions = needsOptions
      ? formData.options.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined;

    if (editingQuestion) {
      const updated: TracerQuestion = {
        ...editingQuestion,
        section: formData.section,
        question_text: formData.question_text,
        question_type: formData.question_type,
        required: formData.required,
        options: parsedOptions
      };
      StorageService.saveQuestion(updated);
      showToast('success', 'Pertanyaan berhasil diperbarui');
    } else {
      const newQuestion: TracerQuestion = {
        id: 0,
        survey_id: surveyId,
        section: formData.section,
        question_text: formData.question_text,
        question_type: formData.question_type,
        required: formData.required,
        order: questions.length + 1,
        options: parsedOptions
      };
      StorageService.saveQuestion(newQuestion);
      showToast('success', 'Pertanyaan baru berhasil ditambahkan');
    }

    setIsEditModalOpen(false);
    reloadQuestions();
  };

  const handleDeleteQuestion = (id: number) => {
    StorageService.deleteQuestion(id);
    showToast('info', 'Pertanyaan telah dihapus');
    reloadQuestions();
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const list = [...questions];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Update order numbers
    list.forEach((q, idx) => {
      q.order = idx + 1;
      StorageService.saveQuestion(q);
    });

    setQuestions(list);
    showToast('info', 'Urutan pertanyaan diperbarui');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate('/admin/tracer-study')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Tracer Study
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Desain Formulir Kuesioner Tracer Study
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Kustomisasi instrumen kuesioner kelulusan (teks, pilihan ganda, rating, dropdown, upload, dan bobot evaluasi)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4 text-emerald-700" />
            <span>Preview Kuesioner</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pertanyaan</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4 flex-1">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                {index + 1}
              </span>

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {question.section && (
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                      {question.section}
                    </span>
                  )}
                  <Badge variant="neutral">
                    Tipe: {question.question_type.toUpperCase()}
                  </Badge>
                  {question.required ? (
                    <span className="text-xs text-rose-600 font-semibold">* Wajib Diisi</span>
                  ) : (
                    <span className="text-xs text-slate-400">Opsional</span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {question.question_text}
                </h4>

                {question.options && question.options.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {question.options.map((opt, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Reorder, Edit, Delete */}
            <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
              <button
                disabled={index === 0}
                onClick={() => handleMoveOrder(index, 'up')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Pindah ke Atas"
              >
                <MoveUp className="w-4 h-4" />
              </button>
              <button
                disabled={index === questions.length - 1}
                onClick={() => handleMoveOrder(index, 'down')}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Pindah ke Bawah"
              >
                <MoveDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleOpenEditModal(question)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Edit
              </button>

              <button
                onClick={() => handleDeleteQuestion(question.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Hapus Pertanyaan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingQuestion ? 'Edit Pertanyaan Kuesioner' : 'Tambah Pertanyaan Baru'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori / Bagian Kuesioner</label>
            <input
              type="text"
              required
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="Contoh: Relevansi Pekerjaan dengan Jurusan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan *</label>
            <textarea
              rows={2}
              required
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              placeholder="Tuliskan pertanyaan yang ditujukan kepada alumni..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Input</label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value as QuestionType })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="text">Teks Singkat (Text)</option>
                <option value="textarea">Teks Panjang (Textarea)</option>
                <option value="radio">Pilihan Tunggal (Radio)</option>
                <option value="checkbox">Pilihan Jamak (Checkbox)</option>
                <option value="dropdown">Dropdown</option>
                <option value="rating">Rating (Skala 1 - 5)</option>
                <option value="number">Angka (Number)</option>
                <option value="date">Tanggal (Date)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                />
                <span>Pertanyaan Wajib Diisi</span>
              </label>
            </div>
          </div>

          {['radio', 'checkbox', 'dropdown'].includes(formData.question_type) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilihan Jawaban (Satu pilihan per baris)
              </label>
              <textarea
                rows={4}
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                placeholder="Pilihan 1&#10;Pilihan 2&#10;Pilihan 3"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Simpan Pertanyaan
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Simulasi Tampilan Formulir Alumni"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
            Berikut adalah simulasi bagaimana alumni akan melihat kuesioner ini di portal mereka.
          </div>

          <div className="space-y-5">
            {questions.map((q, idx) => (
              <div key={q.id} className="space-y-2 pb-4 border-b border-slate-100">
                <label className="block text-xs font-semibold text-slate-900">
                  {idx + 1}. {q.question_text} {q.required && <span className="text-rose-600">*</span>}
                </label>

                {q.question_type === 'text' && (
                  <input
                    type="text"
                    disabled
                    placeholder="Jawaban teks singkat..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                )}

                {q.question_type === 'textarea' && (
                  <textarea
                    rows={2}
                    disabled
                    placeholder="Tuliskan jawaban Anda secara rinci..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  />
                )}

                {q.question_type === 'radio' && q.options && (
                  <div className="space-y-1.5 pl-1">
                    {q.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="radio" disabled name={`preview-radio-${q.id}`} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.question_type === 'dropdown' && q.options && (
                  <select disabled className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50">
                    <option>-- Pilih Opsi Jawaban --</option>
                    {q.options.map((opt, i) => (
                      <option key={i}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.question_type === 'rating' && (
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} className="text-xl text-amber-400">★</span>
                    ))}
                    <span className="text-xs text-slate-400">(Skala 1 - 5)</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
