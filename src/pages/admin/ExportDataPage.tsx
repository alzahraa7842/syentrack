import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  ArrowLeft, 
  CheckCircle2, 
  Users,
  Printer
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { ExportService } from '../../services/exportService';
import { useNotification } from '../../contexts/NotificationContext';

interface ExportDataPageProps {
  onNavigate: (path: string) => void;
}

export const ExportDataPage: React.FC<ExportDataPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const schoolSettings = StorageService.getSchoolSettings();
  const allAlumni = StorageService.getAlumniList();

  const [selectedAngkatan, setSelectedAngkatan] = useState('ALL');
  const [selectedJurusan, setSelectedJurusan] = useState('ALL');
  const [selectedStatusKarir, setSelectedStatusKarir] = useState('ALL');

  // Filtered dataset
  const filteredAlumni = useMemo(() => {
    return allAlumni.filter(a => {
      const matchAngkatan = selectedAngkatan === 'ALL' || a.angkatan.toString() === selectedAngkatan;
      const matchJurusan = selectedJurusan === 'ALL' || a.jurusan === selectedJurusan || (selectedJurusan === 'BR' && (a.jurusan.includes('BR') || a.jurusan.includes('Bisnis Ritel')));
      const matchStatus = selectedStatusKarir === 'ALL' || a.status_karir === selectedStatusKarir;
      return matchAngkatan && matchJurusan && matchStatus;
    });
  }, [allAlumni, selectedAngkatan, selectedJurusan, selectedStatusKarir]);

  const filterSummary = `Angkatan: ${selectedAngkatan} · Jurusan: ${selectedJurusan} · Status: ${selectedStatusKarir}`;

  const handleExportExcel = () => {
    ExportService.exportAlumniToExcel(
      filteredAlumni, 
      schoolSettings, 
      `Laporan_TracerStudy_${selectedAngkatan}_${selectedJurusan}.xlsx`
    );
    StorageService.addAuditLog('Admin', 'ADMIN', `Export Excel: ${filteredAlumni.length} alumni (${filterSummary})`);
    showToast('success', 'File Excel multi-sheet berhasil dibuat dan diunduh');
  };

  const handleExportCSV = () => {
    ExportService.exportAlumniToCSV(
      filteredAlumni, 
      `Data_Alumni_${selectedAngkatan}_${selectedJurusan}.csv`
    );
    StorageService.addAuditLog('Admin', 'ADMIN', `Export CSV: ${filteredAlumni.length} alumni (${filterSummary})`);
    showToast('success', 'File CSV berhasil diunduh');
  };

  const handleExportPDF = () => {
    const activeGuruBk = StorageService.getActiveGuruBk();
    ExportService.exportAlumniToPDF(
      filteredAlumni, 
      schoolSettings, 
      filterSummary, 
      `Laporan_Resmi_Tracer_Study_${schoolSettings.academic_year.replace('/', '-')}.pdf`,
      activeGuruBk
    );
    StorageService.addAuditLog('Admin', 'ADMIN', `Export PDF Resmi: ${filteredAlumni.length} alumni (Penerbit: ${activeGuruBk.name})`);
    showToast('success', `Laporan PDF resmi (${activeGuruBk.name}) berhasil dibuat dan diunduh`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('/admin/alumni')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Manajemen Alumni
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Pusat Export Laporan & Rekapitulasi Data
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Ekspor data lulusan dan statistik tracer study ke dalam format Excel (.xlsx), CSV, atau PDF siap cetak untuk akreditasi
        </p>
      </div>

      {/* Filter Section Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" /> Tentukan Kriteria Filter Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Angkatan (Tahun Lulus)</label>
            <select
              value={selectedAngkatan}
              onChange={(e) => setSelectedAngkatan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Angkatan</option>
              <option value="2025">Angkatan 2025</option>
              <option value="2024">Angkatan 2024</option>
              <option value="2023">Angkatan 2023</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jurusan / Konsentrasi Keahlian</label>
            <select
              value={selectedJurusan}
              onChange={(e) => setSelectedJurusan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Jurusan</option>
              <option value="PPLG">PPLG</option>
              <option value="DKV">DKV</option>
              <option value="MPLB">MPLB</option>
              <option value="AKL">AKL</option>
              <option value="BR">BR (Bisnis Ritel)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Karir</label>
            <select
              value={selectedStatusKarir}
              onChange={(e) => setSelectedStatusKarir(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Status Karir</option>
              <option value="Bekerja">Bekerja</option>
              <option value="Kuliah">Kuliah</option>
              <option value="Wirausaha">Wirausaha</option>
              <option value="Mencari Kerja">Mencari Kerja</option>
            </select>
          </div>
        </div>

        {/* Filter Impact Indicator */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total record yang akan diekspor: <strong className="text-slate-900 tabular-nums">{filteredAlumni.length}</strong> alumni
          </span>
          <span className="text-emerald-700 font-medium">
            {filterSummary}
          </span>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Option */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Dokumen PDF Resmi</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Format siap cetak lengkap dengan Kop Surat Sekolah, tanggal resmi, ringkasan persentase, dan tabel data alumni rapi untuk kebutuhan akreditasi.
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Unduh PDF Resmi
          </button>
        </div>

        {/* Excel Option */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Microsoft Excel (.xlsx)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buku kerja Excel dengan multi-sheet (Sheet 1: Data Lengkap Karir, Sheet 2: Ringkasan Eksekutif & Statistik Akreditasi) untuk analisis lanjutan.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Unduh Excel (.xlsx)
          </button>
        </div>

        {/* CSV Option */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Comma Separated (.csv)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Format data mentah universal teks berpemisah koma untuk integrasi sistem database sekolah atau pengolahan di tools statistik lainnya.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" /> Unduh File CSV
          </button>
        </div>
      </div>
    </div>
  );
};
