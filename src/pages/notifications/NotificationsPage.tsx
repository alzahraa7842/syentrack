import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Check, 
  Briefcase, 
  GraduationCap, 
  MessageSquare, 
  Sparkles,
  ArrowRight,
  Mail,
  Send,
  ExternalLink,
  ShieldCheck,
  Calendar,
  X,
  Inbox,
  AlertCircle,
  Settings,
  Key,
  Server,
  Lock,
  HelpCircle
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmailService } from '../../services/emailService';
import { EmailNotificationLog } from '../../types';
import { RealMailService, SmtpStatus } from '../../services/realMailService';

interface NotificationsPageProps {
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, showToast } = useNotification();
  const { user } = useAuth();

  const [activeMainTab, setActiveMainTab] = useState<'in_app' | 'gmail'>('in_app');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Gmail logs
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotificationLog | null>(null);
  const [isSendingRealEmail, setIsSendingRealEmail] = useState(false);

  // SMTP Mailer State
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    user: '',
    pass: '',
    fromName: 'AlumniTrack SMKN 1',
    host: 'smtp.gmail.com',
    port: 465
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  const reloadEmailLogs = () => {
    const logs = EmailService.getEmailLogs(user?.id, user?.email, user?.role === 'ADMIN');
    setEmailLogs(logs);
  };

  const loadSmtpStatus = async () => {
    const status = await RealMailService.getStatus();
    setSmtpStatus(status);
    if (status && status.user) {
      setSmtpForm(prev => ({
        ...prev,
        user: status.user.includes('***') ? '' : status.user,
        fromName: status.fromName || prev.fromName,
        host: status.host || 'smtp.gmail.com',
        port: status.port || 465
      }));
    }
  };

  useEffect(() => {
    reloadEmailLogs();
    loadSmtpStatus();

    const handleEmailChange = () => {
      reloadEmailLogs();
    };

    window.addEventListener('alumnitrack_emails_changed', handleEmailChange);
    return () => window.removeEventListener('alumnitrack_emails_changed', handleEmailChange);
  }, [user]);

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'ALL') return true;
    if (filterType === 'UNREAD') return !n.is_read;
    return n.type === filterType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'tracer': return <GraduationCap className="w-4 h-4 text-emerald-700" />;
      case 'job': return <Briefcase className="w-4 h-4 text-sky-700" />;
      case 'forum': return <MessageSquare className="w-4 h-4 text-amber-700" />;
      default: return <Sparkles className="w-4 h-4 text-emerald-700" />;
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpForm.user || !smtpForm.pass) {
      showToast('warning', 'Harap isi email pengirim dan sandi aplikasi Gmail');
      return;
    }

    setIsSavingSmtp(true);
    const res = await RealMailService.saveConfig(smtpForm);
    setIsSavingSmtp(false);

    if (res.success) {
      showToast('success', 'Konfigurasi Pengirim Gmail berhasil disimpan! Server siap mengirim email nyata.');
      setIsSmtpModalOpen(false);
      await loadSmtpStatus();

      // Automatically trigger a test send
      handleSendTestEmail();
    } else {
      showToast('error', res.error || 'Gagal menyimpan konfigurasi');
    }
  };

  const handleSendTestEmail = async () => {
    const targetEmail = user?.email || 'alumni.siswa@gmail.com';
    const targetName = user?.name || 'Siswa Alumni';

    setIsSendingRealEmail(true);

    const log = EmailService.dispatchEmailNotification({
      recipientEmail: targetEmail,
      recipientName: targetName,
      userId: user?.id,
      subject: `[Uji Coba Resmi] Notifikasi Masuk ke Inbox Gmail Anda`,
      previewText: `Notifikasi ini dikirimkan langsung ke alamat email user yang didaftarkan (${targetEmail}).`,
      category: 'Event',
      contentMarkdown: `Halo ${targetName}, ini adalah pesan verifikasi bahwa notifikasi dari portal AlumniTrack berhasil dikirimkan ke kotak masuk akun Gmail Anda: ${targetEmail}.\n\nJika pesan ini Anda baca di aplikasi Gmail HP atau mail.google.com, pengiriman telah 100% aktif dan berjalan sempurna!`,
      actionLabel: 'Buka Portal AlumniTrack',
      actionUrl: '/notifications'
    });

    // 1. Try sending via backend SMTP (Real delivery to Gmail MX)
    const smtpRes = await RealMailService.sendRealEmail({
      to: targetEmail,
      subject: log.subject,
      html: log.body_html,
      text: log.preview_text
    });

    if (smtpRes.success) {
      showToast('success', `🎉 BERHASIL! Pesan telah dikirimkan ke kotak masuk Gmail (${targetEmail}). Silakan buka aplikasi Gmail di HP / mail.google.com Anda!`);
      setIsSendingRealEmail(false);
      reloadEmailLogs();
      return;
    }

    if (smtpRes.requiresConfig) {
      if (user?.role === 'ADMIN') {
        showToast('info', 'Silakan atur akun pengirim Gmail (SMTP) di jendela pengaturan ini untuk mengirim email.');
        setIsSmtpModalOpen(true);
      } else {
        showToast('info', 'Server SMTP sekolah belum dikonfigurasi oleh Admin.');
      }
      setIsSendingRealEmail(false);
      reloadEmailLogs();
      return;
    }

    showToast('error', smtpRes.error || 'Gagal mengirim email');
    setIsSendingRealEmail(false);
    reloadEmailLogs();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pusat Pemberitahuan & Notifikasi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Terhubung langsung dengan pesan masuk aplikasi Gmail dan notifikasi internal portal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === 'in_app' && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-700" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}

          <button
            onClick={handleSendTestEmail}
            disabled={isSendingRealEmail}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSendingRealEmail ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Kirim Tes ke Inbox Gmail Saya</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs: In-App vs Connected Gmail */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveMainTab('in_app')}
          className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'in_app'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-700" />
          <span>Notifikasi di Website</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab('gmail')}
          className={`py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'gmail'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4 text-sky-700" />
          <span>Kotak Masuk Pesan Gmail</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
            {emailLogs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: In-App Notifications */}
      {activeMainTab === 'in_app' && (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs text-xs font-medium">
            {[
              { id: 'ALL', label: 'Semua Notifikasi' },
              { id: 'UNREAD', label: 'Belum Dibaca' },
              { id: 'tracer', label: 'Tracer Study' },
              { id: 'job', label: 'Peluang Karir & Event' },
              { id: 'announcement', label: 'Pengumuman' },
              { id: 'forum', label: 'Forum Diskusi' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {filteredNotifs.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-sm">Tidak ada notifikasi</p>
                <p className="text-xs text-slate-400 mt-0.5">Semua pesan dan pengingat Anda telah terkelola</p>
              </div>
            ) : (
              filteredNotifs.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) onNavigate(notif.link);
                  }}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notif.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {notif.title}
                        </h3>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {notif.message}
                      </p>
                      <span className="text-[11px] text-slate-400 block tabular-nums pt-0.5">
                        {notif.created_at}
                      </span>
                    </div>
                  </div>

                  {notif.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                        onNavigate(notif.link!);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Connected Google Gmail Dispatch */}
      {activeMainTab === 'gmail' && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Alamat Gmail Akun Anda:</span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 font-bold text-xs">
                      {user?.email || 'alumni.siswa@gmail.com'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Saat ada pemberitahuan event/lowongan atau pengingat, pesan akan dikirimkan ke alamat Gmail di atas.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://mail.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka mail.google.com</span>
                </a>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setIsSmtpModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Atur Pengirim Gmail (SMTP)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Delivery State Info */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
              smtpStatus?.configured 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {smtpStatus?.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {smtpStatus?.configured 
                      ? '✓ Server Pengirim Email Aktif & Siap Mengirim ke Kotak Masuk Gmail Anda'
                      : '⚡ Agar email BENAR-BENAR MASUK ke kotak masuk aplikasi Gmail di HP/Laptop:'}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {smtpStatus?.configured
                      ? `Email notifikasi resmi akan otomatis dikirimkan lewat server SMTP (${smtpStatus.user}) ke kotak masuk Gmail Anda setiap kali ada pembaruan.`
                      : 'Server Google Gmail membutuhkan otorisasi pengirim resmi (Sandi Aplikasi Gmail). Klik tombol "Atur Pengirim Gmail (SMTP)" di atas untuk memasukkan Sandi Aplikasi (App Password) akun Gmail pengirim sekolah dalam 1 menit.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Logs List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {emailLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Belum ada email yang terkirim</p>
                <p className="text-xs text-slate-400 mt-1">
                  Klik tombol <em>Kirim Tes ke Inbox Gmail Saya</em> di atas untuk mencoba pengiriman email pemberitahuan resmi.
                </p>
              </div>
            ) : (
              emailLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedEmail(log)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {log.category}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {log.subject}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {log.preview_text}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span>Penerima: <strong className="text-slate-600">{log.recipient_email}</strong></span>
                        <span>·</span>
                        <span className="tabular-nums">{log.sent_at}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {log.real_gmail_sent ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        ✓ Terkirim ke Inbox
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                        Tercatat
                      </span>
                    )}

                    {log.gmail_compose_url && (
                      <a
                        href={log.gmail_compose_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Buka langsung di aplikasi Gmail (Web/HP)"
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka di Gmail</span>
                      </a>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmail(log);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Lihat Format</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <Modal
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          title={`Format Pesan Email: ${selectedEmail.subject}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Meta bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-slate-600">
              <div>
                <p>Kepada: <strong className="text-slate-900">{selectedEmail.recipient_name}</strong> ({selectedEmail.recipient_email})</p>
                <p>Pengirim: <strong>BKK & Guru BK Sekolah</strong></p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block tabular-nums">{selectedEmail.sent_at}</span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {selectedEmail.real_gmail_sent ? '✓ Terkirim ke Server Gmail Google' : '✓ Siap Dikirim ke Inbox'}
                </span>
              </div>
            </div>

            {/* Email HTML Container */}
            <div 
              className="p-2 border border-slate-200 rounded-2xl bg-slate-50/50"
              dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
            />

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {selectedEmail.gmail_compose_url && (
                  <a
                    href={selectedEmail.gmail_compose_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Pesan Ini Langsung di Gmail Web / HP</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                {selectedEmail.event_link && (
                  <button
                    onClick={() => {
                      const link = selectedEmail.event_link!;
                      setSelectedEmail(null);
                      onNavigate(link);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Buka Halaman Terkait</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* SMTP Configuration Modal */}
      {isSmtpModalOpen && (
        <Modal
          isOpen={isSmtpModalOpen}
          onClose={() => setIsSmtpModalOpen(false)}
          title="Konfigurasi Server Pengirim Email (Gmail SMTP)"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-sky-700" />
                <span>Cara agar notifikasi langsung masuk ke inbox Gmail Anda:</span>
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-sky-900 leading-relaxed">
                <li>Buka Akun Google: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="underline font-bold text-sky-700">myaccount.google.com/security</a></li>
                <li>Pastikan <strong>Verifikasi 2 Langkah</strong> aktif.</li>
                <li>Cari menu <strong>Sandi Aplikasi</strong> (App Password), buat sandi baru (beri nama "AlumniTrack").</li>
                <li>Salin <strong>16 digit sandi</strong> yang diberikan Google dan tempel di form di bawah ini.</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Akun Pengirim (Gmail) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: bkk.smkn1@gmail.com"
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sandi Aplikasi Gmail (16 Digit App Password) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={smtpForm.pass}
                  onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Bukan kata sandi login biasa, melainkan 16 digit Sandi Aplikasi dari Google Account Security.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pengirim Resmi
                  </label>
                  <input
                    type="text"
                    value={smtpForm.fromName}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SMTP Host & Port
                  </label>
                  <input
                    type="text"
                    disabled
                    value="smtp.gmail.com:465 (SSL)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSmtpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSavingSmtp}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                {isSavingSmtp ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Simpan & Kirim Email Nyata Sekarang</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
