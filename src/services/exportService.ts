import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlumniProfile, SchoolSettings, GuruBkProfile } from '../types';
import { StorageService } from './storageService';

export const ExportService = {
  // Export to Excel (.xlsx)
  exportAlumniToExcel: (alumniList: AlumniProfile[], schoolSettings: SchoolSettings, fileName = 'Data_Alumni_TracerStudy.xlsx') => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Data Alumni & Karir
    const dataAlumni = alumniList.map((a, index) => ({
      'No': index + 1,
      'Nama Lengkap': a.name,
      'NISN': a.nisn,
      'Angkatan': a.angkatan,
      'Jurusan': a.jurusan,
      'Email': a.email,
      'Nomor HP': a.phone,
      'Domisili': a.domisili,
      'Status Karir': a.status_karir,
      'Status Tracer': a.status_tracer,
      'Perusahaan/Kampus/Usaha': a.job_company || a.edu_university || a.biz_name || '-',
      'Posisi/Prodi/Bidang': a.job_position || a.edu_major || a.biz_field || '-',
      'Lokasi': a.job_location || a.edu_location || a.biz_location || '-',
      'Terakhir Diperbarui': a.updated_at
    }));
    const wsAlumni = XLSX.utils.json_to_sheet(dataAlumni);
    XLSX.utils.book_append_sheet(wb, wsAlumni, 'Data Alumni');

    // Sheet 2: Ringkasan Statistik
    const total = alumniList.length;
    const bekerja = alumniList.filter(a => a.status_karir === 'Bekerja').length;
    const kuliah = alumniList.filter(a => a.status_karir === 'Kuliah').length;
    const wirausaha = alumniList.filter(a => a.status_karir === 'Wirausaha').length;
    const mencari = alumniList.filter(a => a.status_karir === 'Mencari Kerja').length;
    const sudahTracer = alumniList.filter(a => a.status_tracer === 'Sudah Mengisi').length;

    const summaryData = [
      { 'Indikator': 'Nama Sekolah', 'Nilai': schoolSettings.name },
      { 'Indikator': 'Tahun Ajaran', 'Nilai': schoolSettings.academic_year },
      { 'Indikator': 'Total Alumni Terdaftar', 'Nilai': total },
      { 'Indikator': 'Bekerja', 'Nilai': `${bekerja} (${total ? ((bekerja / total) * 100).toFixed(1) : 0}%)` },
      { 'Indikator': 'Melanjutkan Kuliah', 'Nilai': `${kuliah} (${total ? ((kuliah / total) * 100).toFixed(1) : 0}%)` },
      { 'Indikator': 'Berwirausaha', 'Nilai': `${wirausaha} (${total ? ((wirausaha / total) * 100).toFixed(1) : 0}%)` },
      { 'Indikator': 'Mencari Kerja / Lainnya', 'Nilai': `${mencari} (${total ? ((mencari / total) * 100).toFixed(1) : 0}%)` },
      { 'Indikator': 'Response Rate Tracer Study', 'Nilai': `${sudahTracer} dari ${total} (${total ? ((sudahTracer / total) * 100).toFixed(1) : 0}%)` },
      { 'Indikator': 'Tanggal Unduh', 'Nilai': new Date().toLocaleString('id-ID') }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

    // Generate and download
    XLSX.writeFile(wb, fileName);
  },

  // Export to CSV
  exportAlumniToCSV: (alumniList: AlumniProfile[], fileName = 'Data_Alumni.csv') => {
    const data = alumniList.map((a, i) => ({
      'No': i + 1,
      'Nama': a.name,
      'NISN': a.nisn,
      'Angkatan': a.angkatan,
      'Jurusan': a.jurusan,
      'Email': a.email,
      'No_HP': a.phone,
      'Domisili': a.domisili,
      'Status_Karir': a.status_karir,
      'Status_Tracer': a.status_tracer,
      'Instansi': a.job_company || a.edu_university || a.biz_name || '',
      'Peran': a.job_position || a.edu_major || a.biz_field || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export to PDF
  exportAlumniToPDF: (
    alumniList: AlumniProfile[], 
    schoolSettings: SchoolSettings, 
    filterTitle = 'Semua Alumni',
    fileName = 'Laporan_Tracer_Study.pdf',
    guruBk?: GuruBkProfile
  ) => {
    const activeGuruBk = guruBk || StorageService.getActiveGuruBk();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const total = alumniList.length;
    const bekerja = alumniList.filter(a => a.status_karir === 'Bekerja').length;
    const kuliah = alumniList.filter(a => a.status_karir === 'Kuliah').length;
    const wirausaha = alumniList.filter(a => a.status_karir === 'Wirausaha').length;
    const belumBekerja = total - (bekerja + kuliah + wirausaha);
    const responseRate = total ? Math.round((alumniList.filter(a => a.status_tracer === 'Sudah Mengisi').length / total) * 100) : 0;

    // Header / Kop Sekolah
    doc.setFillColor(6, 78, 59); // Emerald-900
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolSettings.name.toUpperCase(), 14, 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${schoolSettings.address} · Telp: ${schoolSettings.phone} · Web: ${schoolSettings.website}`, 14, 18);

    // Document Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL TRACER STUDY & REKAP KARIR ALUMNI', 14, 34);

    // Meta details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Kriteria Filter: ${filterTitle}`, 14, 40);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 45);
    doc.text(`Tahun Ajaran: ${schoolSettings.academic_year}`, 140, 40);
    doc.text(`Total Sampel: ${total} Alumni`, 140, 45);

    // Summary Box
    doc.setFillColor(240, 253, 244); // Emerald-50
    doc.setDrawColor(187, 247, 208); // Emerald-200
    doc.roundedRect(14, 49, 182, 16, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bekerja: ${bekerja} (${total ? Math.round((bekerja / total) * 100) : 0}%)`, 18, 59);
    doc.text(`Kuliah: ${kuliah} (${total ? Math.round((kuliah / total) * 100) : 0}%)`, 55, 59);
    doc.text(`Wirausaha: ${wirausaha} (${total ? Math.round((wirausaha / total) * 100) : 0}%)`, 90, 59);
    doc.text(`Blm Bekerja: ${belumBekerja} (${total ? Math.round((belumBekerja / total) * 100) : 0}%)`, 128, 59);
    doc.text(`Response: ${responseRate}%`, 170, 59);

    // Table Content
    const tableRows = alumniList.map((a, index) => [
      (index + 1).toString(),
      a.name,
      a.nisn,
      a.angkatan.toString(),
      a.jurusan,
      a.status_karir,
      a.job_company || a.edu_university || a.biz_name || '-',
      a.domisili
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['No', 'Nama', 'NISN', 'Angk.', 'Jurusan', 'Status Karir', 'Instansi / Kampus', 'Domisili']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105], // Emerald-600
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 18 },
        5: { cellWidth: 24 },
        6: { cellWidth: 36 },
        7: { cellWidth: 22 }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount} · Diterbitkan oleh Guru BK: ${activeGuruBk.name} · ${schoolSettings.name}`,
          14,
          290
        );
      }
    });

    // Tanda Tangan & Keterangan Pengesahan Resmi
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    let signY = finalY + 10;
    if (signY > 225) {
      doc.addPage();
      signY = 30;
    }

    const signX = 128;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`${activeGuruBk.city || 'Jakarta'}, ${dateFormatted}`, signX, signY);
    signY += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Diterbitkan oleh Guru BK:', signX, signY);
    signY += 20;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(activeGuruBk.name, signX, signY);
    doc.setDrawColor(100, 116, 139);
    doc.line(signX, signY + 1, signX + 54, signY + 1);
    signY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(activeGuruBk.title || 'Guru Bimbingan Konseling / BKK', signX, signY);
    if (activeGuruBk.nip) {
      signY += 4;
      doc.text(`NIP. ${activeGuruBk.nip}`, signX, signY);
    }

    doc.save(fileName);
  }
};
