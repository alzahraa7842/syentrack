import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowLeft, 
  Save, 
  RotateCcw,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AlumniProfile, CareerStatus, TracerStatus } from '../../types';
import { StorageService } from '../../services/storageService';
import { useNotification } from '../../contexts/NotificationContext';
import { AVATAR_COWO, AVATAR_CEWE } from '../../constants/avatars';

interface ImportAlumniPageProps {
  onNavigate: (path: string) => void;
}

interface ParsedRow {
  id: string;
  nama: string;
  nisn: string;
  email: string;
  angkatan: number;
  jurusan: string;
  domisili: string;
  status_karir: string;
  isValid: boolean;
  errors: string[];
}

export const ImportAlumniPage: React.FC<ImportAlumniPageProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSuccessImported, setIsSuccessImported] = useState(false);

  // Template Download
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama: 'Rian Kurniawan',
        nisn: '0058192039',
        email: 'rian.kurniawan@gmail.com',
        angkatan: 2025,
        jurusan: 'PPLG',
        domisili: 'Jakarta',
        status_karir: 'Bekerja'
      },
      {
        nama: 'Nabila Putri',
        nisn: '0058192040',
        email: 'nabila.putri@gmail.com',
        angkatan: 2025,
        jurusan: 'DKV',
        domisili: 'Bogor',
        status_karir: 'Kuliah'
      },
      {
        nama: 'Bayu Saputra',
        nisn: '0058192041',
        email: 'bayu.saputra@gmail.com',
        angkatan: 2024,
        jurusan: 'AKL',
        domisili: 'Tangerang',
        status_karir: 'Wirausaha'
      },
      {
        nama: 'Siti Rahayu',
        nisn: '0058192042',
        email: 'siti.rahayu@gmail.com',
        angkatan: 2025,
        jurusan: 'Bisnis Ritel',
        domisili: 'Bekasi',
        status_karir: 'Bekerja'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Alumni');
    XLSX.writeFile(wb, 'Format_Import_Data_AlumniTrack.xlsx');
    showToast('info', 'Template format import berhasil diunduh');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setIsSuccessImported(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json<any>(ws);

        const existingAlumni = StorageService.getAlumniList();
        const existingNisns = new Set(existingAlumni.map(a => a.nisn));

        const processed: ParsedRow[] = rawData.map((row, idx) => {
          const errors: string[] = [];
          const nama = row.nama || row.Nama || row['Nama Lengkap'] || '';
          const nisn = (row.nisn || row.NISN || '').toString().trim();
          const email = (row.email || row.Email || '').toString().trim();
          const angkatan = parseInt(row.angkatan || row.Angkatan || '2025');
          let rawJurusan = (row.jurusan || row.Jurusan || 'PPLG').toString().trim();
          let jurusan = rawJurusan.toUpperCase();
          if (jurusan.includes('TKJ')) {
            jurusan = 'PPLG';
          } else if (jurusan.includes('RITEL') || jurusan === 'BR' || jurusan.includes('BISNIS RITEL')) {
            jurusan = 'Bisnis Ritel';
          } else if (['PPLG', 'DKV', 'MPLB', 'AKL'].includes(jurusan)) {
            // Keep standard uppercase
          } else {
            jurusan = rawJurusan; // fallback to original input
          }
          const domisili = (row.domisili || row.Domisili || 'Jakarta').toString().trim();
          const status_karir = (row.status_karir || row['Status Karir'] || 'Bekerja').toString().trim();

          if (!nama) errors.push('Nama wajib diisi');
          if (!nisn) {
            errors.push('NISN wajib diisi');
          } else if (nisn.length < 8) {
            errors.push('NISN minimal 8 digit');
          } else if (existingNisns.has(nisn)) {
            errors.push('NISN sudah terdaftar di sistem');
          }

          if (email && !email.includes('@')) {
            errors.push('Format email tidak valid');
          }

          return {
            id: `row-${idx}`,
            nama,
            nisn,
            email,
            angkatan: isNaN(angkatan) ? 2025 : angkatan,
            jurusan,
            domisili,
            status_karir,
            isValid: errors.length === 0,
            errors
          };
        });

        setParsedRows(processed);
        showToast('success', `Berhasil memproses ${processed.length} baris dari file`);
      } catch (err) {
        showToast('error', 'Gagal membaca format file. Pastikan format .xlsx atau .csv sesuai.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const handleUpdateRow = (id: string, field: keyof ParsedRow, value: any) => {
    setParsedRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      // Re-validate
      const errors: string[] = [];
      if (!updated.nama) errors.push('Nama wajib diisi');
      if (!updated.nisn) errors.push('NISN wajib diisi');
      updated.isValid = errors.length === 0;
      updated.errors = errors;
      return updated;
    }));
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('error', 'Tidak ada data valid yang dapat diimpor');
      return;
    }

    const payload: Partial<AlumniProfile>[] = validRows.map((row) => ({
      name: row.nama,
      nisn: row.nisn,
      angkatan: row.angkatan,
      jurusan: row.jurusan,
      email: row.email || `${row.nisn}@alumni.sch.id`,
      phone: '0812-0000-0000',
      domisili: row.domisili,
      status_karir: row.status_karir as CareerStatus,
      status_tracer: 'Belum Mengisi',
      privacy_setting: 'PUBLIC',
      avatar:
        row.nama.toLowerCase().includes('siti') ||
        row.nama.toLowerCase().includes('putri') ||
        row.nama.toLowerCase().includes('rahayu') ||
        row.nama.toLowerCase().includes('anisa') ||
        row.nama.toLowerCase().includes('dewi') ||
        row.nama.toLowerCase().includes('zahra')
          ? AVATAR_CEWE
          : AVATAR_COWO,
    }));

    setIsImporting(true);
    try {
      const res = await StorageService.importAlumniBatchAsync(payload);
      if (!res.ok) {
        showToast('error', res.error || 'Gagal mengimpor data alumni ke database');
        return;
      }
      StorageService.addAuditLog(
        'Admin',
        'ADMIN',
        `Import massal data alumni: berhasil menyimpan ${res.importedCount} data`
      );
      setIsSuccessImported(true);
      showToast(
        'success',
        `${res.importedCount} data alumni berhasil disimpan permanen ke database!`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const errorCount = parsedRows.filter(r => !r.isValid).length;
  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => onNavigate('/admin/alumni')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Data Alumni
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Import Massal Data Alumni
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Unggah file Excel (.xlsx, .xls) atau CSV untuk penambahan data lulusan secara cepat
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-emerald-700" />
          <span>Unduh Template Format</span>
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dashed border-slate-300 text-center space-y-4 hover:border-emerald-600 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-sm font-bold text-slate-900">
            Pilih file spreadsheet atau seret ke area ini
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Format yang didukung: <strong>.xlsx, .xls, .csv</strong> dengan header: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">nama, nisn, email, angkatan, jurusan, domisili, status_karir</code>
          </p>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors">
            <span>Pilih File Dari Komputer</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700 font-mono">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {/* Preview Table & Validation Summary */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Preview & Validasi Data</h3>
              <div className="flex items-center gap-4 text-xs mt-1">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {validCount} Baris Valid
                </span>
                {errorCount > 0 && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {errorCount} Baris Perlu Diperbaiki
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setParsedRows([]); setFile(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batalkan
              </button>
              <button
                onClick={handleCommitImport}
                disabled={validCount === 0 || isSuccessImported || isImporting}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isSuccessImported ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>
                  {isImporting
                    ? 'Mengimpor ke Database...'
                    : isSuccessImported
                      ? 'Data Selesai Diimpor!'
                      : `Import ${validCount} Data Valid`}
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">NISN</th>
                  <th className="py-2.5 px-3">Angkatan</th>
                  <th className="py-2.5 px-3">Jurusan</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Domisili</th>
                  <th className="py-2.5 px-3">Status Karir</th>
                  <th className="py-2.5 px-3">Catatan Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((row) => (
                  <tr key={row.id} className={!row.isValid ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                    <td className="py-2 px-3 text-center">
                      {row.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 inline" />
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.nama}
                        onChange={(e) => handleUpdateRow(row.id, 'nama', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.nisn}
                        onChange={(e) => handleUpdateRow(row.id, 'nisn', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-200 font-mono text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.angkatan}
                        onChange={(e) => handleUpdateRow(row.id, 'angkatan', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.jurusan}
                        onChange={(e) => handleUpdateRow(row.id, 'jurusan', e.target.value)}
                        className="w-28 px-2 py-1 rounded border border-slate-200 text-xs bg-white font-semibold"
                      >
                        <option value="PPLG">PPLG</option>
                        <option value="DKV">DKV</option>
                        <option value="MPLB">MPLB</option>
                        <option value="AKL">AKL</option>
                        <option value="BR (Bisnis Ritel)">BR (Bisnis Ritel)</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => handleUpdateRow(row.id, 'email', e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.domisili}
                        onChange={(e) => handleUpdateRow(row.id, 'domisili', e.target.value)}
                        className="w-24 px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.status_karir}
                        onChange={(e) => handleUpdateRow(row.id, 'status_karir', e.target.value)}
                        className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                      >
                        <option value="Bekerja">Bekerja</option>
                        <option value="Kuliah">Kuliah</option>
                        <option value="Wirausaha">Wirausaha</option>
                        <option value="Mencari Kerja">Mencari Kerja</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-rose-600 font-medium">
                      {row.errors.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
