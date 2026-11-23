import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Sparkles, 
  UserCheck, 
  Briefcase, 
  Award, 
  MessageSquare, 
  DollarSign, 
  Building2, 
  HeartHandshake,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../services/storageService';
import { useNotification } from '../../contexts/NotificationContext';
import { AlumniProfile } from '../../types';
import { Badge } from '../../components/common/Badge';

interface TracerStudyWizardPageProps {
  onNavigate: (path: string) => void;
}

export const TracerStudyWizardPage: React.FC<TracerStudyWizardPageProps> = ({ onNavigate }) => {
  const { user, alumniProfile } = useAuth();
  const { showToast } = useNotification();
  const activeSurvey = StorageService.getActiveSurvey();
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
      updated_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0],
    };

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(currentAlumni.status_tracer === 'Sudah Mengisi');

  // Form State across the 8 steps
  const [answers, setAnswers] = useState<{
    nama: string;
    nisn: string;
    angkatan: number;
    jurusan: string;
    email: string;
    phone: string;
    domisili: string;
    status_aktivitas: string;
    waktu_tunggu: string;
    instansi_nama: string;
    posisi_prodi: string;
    lokasi_instansi: string;
    tingkat_relevansi: string;
    kesesuaian_keahlian: string;
    rentang_pendapatan: string;
    keterampilan_bermanfaat: string;
    keterampilan_perlu_ditambah: string;
    saran_fasilitas: string;
    rating_sekolah: number;
  }>({
    // Step 1: Data Diri
    nama: currentAlumni.name,
    nisn: currentAlumni.nisn,
    angkatan: currentAlumni.angkatan,
    jurusan: currentAlumni.jurusan,
    email: currentAlumni.email,
    phone: currentAlumni.phone,
    domisili: currentAlumni.domisili,

    // Step 2: Status Setelah Lulus
    status_aktivitas: currentAlumni.status_karir || 'Bekerja',
    waktu_tunggu: '1 - 3 bulan',

    // Step 3: Pekerjaan / Pendidikan
    instansi_nama: currentAlumni.job_company || currentAlumni.edu_university || currentAlumni.biz_name || 'PT Telkom Indonesia',
    posisi_prodi: currentAlumni.job_position || currentAlumni.edu_major || currentAlumni.biz_field || 'Junior Web Developer',
    lokasi_instansi: currentAlumni.job_location || 'Jakarta Selatan',

    // Step 4: Relevansi Pekerjaan dengan Jurusan
    tingkat_relevansi: 'Sangat Erat (Sesuai 100%)',
    kesesuaian_keahlian: 'Tinggi',

    // Step 5: Pendapatan Bulanan
    rentang_pendapatan: 'Rp 4.500.000 - Rp 7.500.000',

    // Step 6: Kompetensi
    keterampilan_bermanfaat: 'Pemrograman Web (React, TypeScript), Penggunaan Git GitHub, dan Komunikasi Tim',
    keterampilan_perlu_ditambah: 'Pendidikan Cloud DevOps, Docker, dan Bahasa Inggris Profesional',

    // Step 7: Saran untuk Sekolah
    saran_fasilitas: 'Perbanyak alat praktik komputer dengan spesifikasi tinggi dan perbanyak kuliah tamu dari praktisi industri tech.',
    rating_sekolah: 5
  });

  const steps = [
    { number: 1, title: 'Data Diri' },
    { number: 2, title: 'Status Lulus' },
    { number: 3, title: 'Instansi' },
    { number: 4, title: 'Relevansi' },
    { number: 5, title: 'Pendapatan' },
    { number: 6, title: 'Kompetensi' },
    { number: 7, title: 'Saran' },
    { number: 8, title: 'Review' }
  ];

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveDraft = () => {
    StorageService.saveSubmission({
      survey_id: activeSurvey?.id || 1,
      alumni_id: currentAlumni.id,
      alumni_name: currentAlumni.name,
      angkatan: currentAlumni.angkatan,
      jurusan: currentAlumni.jurusan,
      status: 'Draft',
      submitted_at: new Date().toISOString(),
      answers
    });
    showToast('info', 'Draf kuesioner Anda berhasil disimpan!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSubmission({
      survey_id: activeSurvey?.id || 1,
      alumni_id: currentAlumni.id,
      alumni_name: currentAlumni.name,
      angkatan: currentAlumni.angkatan,
      jurusan: currentAlumni.jurusan,
      status: 'Sudah Mengisi',
      submitted_at: new Date().toISOString(),
      answers
    });

    StorageService.addAuditLog(user?.name || currentAlumni.name, 'ALUMNI', 'Mengirimkan kuesioner Tracer Study resmi');
    setIsSubmitted(true);
    showToast('success', 'Terima kasih! Data tracer study berhasil dikirim.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={isSubmitted ? 'success' : 'warning'}>
                {isSubmitted ? 'Sudah Terkirim' : 'Belum Selesai'}
              </Badge>
              <span className="text-xs text-slate-400">
                Deadline: {activeSurvey?.deadline || '31 Oktober 2026'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {activeSurvey?.title || 'Tracer Study Alumni Angkatan 2025'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeSurvey?.description}
            </p>
          </div>

          {!isSubmitted && (
            <button
              onClick={handleSaveDraft}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-center"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draf</span>
            </button>
          )}
        </div>

        {/* Stepper Wizard Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((s, idx) => (
              <React.Fragment key={s.number}>
                <div className="flex flex-col items-center min-w-[60px] text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      currentStep === s.number
                        ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                        : currentStep > s.number || isSubmitted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {currentStep > s.number || isSubmitted ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <span className={`text-[10px] font-semibold mt-1.5 whitespace-nowrap ${currentStep === s.number ? 'text-emerald-800' : 'text-slate-400'}`}>
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > s.number || isSubmitted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Success Celebration View */}
      {isSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-emerald-950">
              Terima kasih! Data Tracer Study Berhasil Dikirim
            </h3>
            <p className="text-xs text-emerald-800/90 max-w-md mx-auto mt-1 leading-relaxed">
              Jawaban Anda telah tercatat secara resmi di database sekolah untuk kebutuhan akreditasi mutu dan penyesuaian kurikulum vokasi.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setIsSubmitted(false)}
              className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold hover:bg-emerald-100/50 transition-colors"
            >
              Perbarui Jawaban
            </button>
            <button
              onClick={() => onNavigate('/alumni/dashboard')}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Wizard Form Card */}
      {!isSubmitted && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
          {/* STEP 1: Data Diri */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" /> Langkah 1: Konfirmasi Biodata Diri
              </h3>
              <p className="text-xs text-slate-500">Periksa kembali data diri Anda di bawah ini:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={answers.nama}
                    onChange={(e) => setAnswers({ ...answers, nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    disabled
                    value={answers.nisn}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Angkatan</label>
                  <input
                    type="text"
                    disabled
                    value={answers.angkatan}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jurusan</label>
                  <input
                    type="text"
                    disabled
                    value={answers.jurusan}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Aktif</label>
                  <input
                    type="email"
                    value={answers.email}
                    onChange={(e) => setAnswers({ ...answers, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp Aktif</label>
                  <input
                    type="text"
                    value={answers.phone}
                    onChange={(e) => setAnswers({ ...answers, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Status Setelah Lulus */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700" /> Langkah 2: Status Aktivitas Setelah Lulus
              </h3>

              <div className="space-y-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-2">
                    Apa aktivitas utama Anda saat ini? *
                  </label>
                  <div className="space-y-2">
                    {[
                      'Bekerja (Karyawan/Pegawai)',
                      'Melanjutkan Pendidikan (Kuliah)',
                      'Berwirausaha / Buka Usaha Sendiri',
                      'Sedang Mencari Pekerjaan',
                      'Belum Memungkinkan Bekerja'
                    ].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          answers.status_aktivitas === opt
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="status_aktivitas"
                          checked={answers.status_aktivitas === opt}
                          onChange={() => setAnswers({ ...answers, status_aktivitas: opt })}
                          className="w-4 h-4 text-emerald-700 focus:ring-emerald-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block font-semibold text-slate-800 mb-1.5">
                    Berapa lama masa tunggu Anda sejak lulus hingga mendapatkan pekerjaan / memulai kuliah?
                  </label>
                  <select
                    value={answers.waktu_tunggu}
                    onChange={(e) => setAnswers({ ...answers, waktu_tunggu: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Langsung sebelum wisuda">Langsung bekerja sebelum wisuda (hasil PKL/rekruitmen)</option>
                    <option value="Kurang dari 1 bulan">Kurang dari 1 bulan</option>
                    <option value="1 - 3 bulan">1 - 3 bulan</option>
                    <option value="3 - 6 bulan">3 - 6 bulan</option>
                    <option value="Lebih dari 6 bulan">Lebih dari 6 bulan</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Pekerjaan / Pendidikan */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" /> Langkah 3: Informasi Instansi / Kampus / Usaha
              </h3>

              <div className="space-y-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Nama Perusahaan / Universitas / Usaha Saat Ini *
                  </label>
                  <input
                    type="text"
                    required
                    value={answers.instansi_nama}
                    onChange={(e) => setAnswers({ ...answers, instansi_nama: e.target.value })}
                    placeholder="Contoh: PT Telkom Indonesia / ITB / Koding Studio"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Jabatan / Program Studi / Jenis Usaha *
                  </label>
                  <input
                    type="text"
                    required
                    value={answers.posisi_prodi}
                    onChange={(e) => setAnswers({ ...answers, posisi_prodi: e.target.value })}
                    placeholder="Contoh: Junior Web Developer / Teknik Informatika / Web Agency"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Kota / Lokasi Instansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={answers.lokasi_instansi}
                    onChange={(e) => setAnswers({ ...answers, lokasi_instansi: e.target.value })}
                    placeholder="Contoh: Jakarta Selatan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Relevansi dengan Jurusan */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" /> Langkah 4: Relevansi Pekerjaan dengan Jurusan
              </h3>

              <div className="space-y-4 text-xs pt-2">
                <label className="block font-semibold text-slate-800 mb-2">
                  Seberapa erat hubungan antara kompetensi keahlian semasa di SMK dengan pekerjaan/kuliah Anda saat ini? *
                </label>
                <div className="space-y-2">
                  {[
                    'Sangat Erat (Sesuai 100%)',
                    'Cukup Erat (Terkait sebagian)',
                    'Kurang Erat',
                    'Tidak Erat Sama Sekali'
                  ].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        answers.tingkat_relevansi === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tingkat_relevansi"
                        checked={answers.tingkat_relevansi === opt}
                        onChange={() => setAnswers({ ...answers, tingkat_relevansi: opt })}
                        className="w-4 h-4 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Pendapatan Bulanan */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" /> Langkah 5: Rentang Pendapatan Rata-Rata
              </h3>
              <p className="text-xs text-slate-500">
                Data ini murni digunakan untuk penilaian rata-rata gaji awal lulusan dalam borang akreditasi sekolah secara anonim.
              </p>

              <div className="space-y-2 text-xs pt-2">
                {[
                  '< Rp 2.500.000',
                  'Rp 2.500.000 - Rp 4.500.000 (UMR)',
                  'Rp 4.500.000 - Rp 7.500.000',
                  '> Rp 7.500.000',
                  'Belum Berpenghasilan / Sedang Kuliah Penuh'
                ].map(opt => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      answers.rentang_pendapatan === opt
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rentang_pendapatan"
                      checked={answers.rentang_pendapatan === opt}
                      onChange={() => setAnswers({ ...answers, rentang_pendapatan: opt })}
                      className="w-4 h-4 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Kompetensi */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" /> Langkah 6: Evaluasi Kompetensi & Kurikulum
              </h3>

              <div className="space-y-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Keterampilan / materi pelajaran apa yang paling bermanfaat di dunia kerja nyata? *
                  </label>
                  <textarea
                    rows={3}
                    value={answers.keterampilan_bermanfaat}
                    onChange={(e) => setAnswers({ ...answers, keterampilan_bermanfaat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Materi apa yang perlu ditambahkan sekolah agar lulusan lebih siap bersaing?
                  </label>
                  <textarea
                    rows={3}
                    value={answers.keterampilan_perlu_ditambah}
                    onChange={(e) => setAnswers({ ...answers, keterampilan_perlu_ditambah: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Saran untuk Sekolah */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-700" /> Langkah 7: Masukan & Penilaian Sekolah
              </h3>

              <div className="space-y-4 text-xs pt-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-2">
                    Tingkat kepuasan terhadap bekal pendidikan dan bimbingan karir di sekolah:
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setAnswers({ ...answers, rating_sekolah: star })}
                        className={`text-2xl transition-transform hover:scale-110 ${answers.rating_sekolah >= star ? 'text-amber-400' : 'text-slate-200'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="font-semibold text-slate-700 ml-2">
                      ({answers.rating_sekolah} dari 5 Bintang)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Saran & Kritik Membangun untuk Pengembangan Sekolah:
                  </label>
                  <textarea
                    rows={4}
                    value={answers.saran_fasilitas}
                    onChange={(e) => setAnswers({ ...answers, saran_fasilitas: e.target.value })}
                    placeholder="Tuliskan masukan untuk fasilitas lab, program PKL, atau jaringan alumni..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Review & Submit */}
          {currentStep === 8 && (
            <div className="space-y-5 animate-in fade-in">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Langkah 8: Tinjau Kembali Seluruh Jawaban
              </h3>
              <p className="text-xs text-slate-500">
                Pastikan data yang Anda isikan sudah akurat sebelum mengirimkan tracer study secara permanen.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 divide-y divide-slate-200/80">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Nama & NISN:</span>
                  <span className="font-semibold text-slate-900">{answers.nama} ({answers.nisn})</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Status Aktivitas:</span>
                  <span className="font-semibold text-slate-900">{answers.status_aktivitas}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Nama Instansi / Kampus:</span>
                  <span className="font-semibold text-slate-900">{answers.instansi_nama}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Posisi / Prodi:</span>
                  <span className="font-semibold text-slate-900">{answers.posisi_prodi}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Relevansi dengan Jurusan:</span>
                  <span className="font-semibold text-emerald-800">{answers.tingkat_relevansi}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Rentang Pendapatan:</span>
                  <span className="font-semibold text-slate-900">{answers.rentang_pendapatan}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Rating Kepuasan Sekolah:</span>
                  <span className="font-semibold text-amber-600">★ {answers.rating_sekolah} / 5</span>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {currentStep < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Lanjutkan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Submit Tracer Study</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
