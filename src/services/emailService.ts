import { EmailNotificationLog, User } from '../types';
import { StorageService } from './storageService';

const EMAIL_LOGS_KEY = 'alumnitrack_email_logs';

export const EmailService = {
  getEmailLogs: (userId?: number, userEmail?: string, isAdmin: boolean = false): EmailNotificationLog[] => {
    try {
      const data = localStorage.getItem(EMAIL_LOGS_KEY);
      let all: EmailNotificationLog[] = data ? JSON.parse(data) : [];
      if (!data || all.length === 0) {
        all = [
          {
            id: 'mail_seed_1',
            user_id: 2,
            recipient_email: 'budi.santoso@alumni.sch.id',
            recipient_name: 'Budi Santoso',
            subject: '[PENTING] Pembukaan Tracer Study 2026 & Pengisian Karir',
            preview_text: 'Selamat datang! Mohon segera lengkapi survei tracer study resmi sekolah.',
            body_html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #047857; color: white; padding: 20px;">
                  <h2 style="margin: 0; font-size: 18px;">Pemberitahuan Tracer Study Resmi</h2>
                </div>
                <div style="padding: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
                  <p>Halo, <strong>Budi Santoso</strong> 👋</p>
                  <p>Kuesioner Tracer Study resmi telah dibuka. Mohon kesediaan Anda menyisihkan waktu 5-7 menit melengkapi data untuk akreditasi sekolah.</p>
                  <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Email ini dikirim otomatis ke alamat email yang Anda daftarkan di sistem.</p>
                </div>
              </div>
            `,
            sent_at: '2026-03-10 09:00:00',
            category: 'Tracer Study',
            status: 'Terkirim',
            event_link: '/alumni/tracer-study'
          },
          {
            id: 'mail_seed_2',
            user_id: 2,
            recipient_email: 'budi.santoso@alumni.sch.id',
            recipient_name: 'Budi Santoso',
            subject: '[Peluang Karir] Lowongan Junior Web Developer di PT Astra Graphia',
            preview_text: 'Pusat karir telah merilis lowongan yang cocok dengan kompetensi keahlian jurusan PPLG.',
            body_html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background: #047857; color: white; padding: 20px;">
                  <h2 style="margin: 0; font-size: 18px;">Lowongan Baru Sesuai Profil Keahlian</h2>
                </div>
                <div style="padding: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
                  <p>Halo, <strong>Budi Santoso</strong> 👋</p>
                  <p>PT Astra Graphia membuka lowongan Junior Web Developer untuk lulusan SMK. Silakan cek detail kualifikasi dan ajukan lamaran Anda.</p>
                  <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Email ini dikirim otomatis ke alamat email yang Anda daftarkan di sistem.</p>
                </div>
              </div>
            `,
            sent_at: '2026-03-12 11:30:00',
            category: 'Lowongan',
            status: 'Terkirim',
            event_link: '/alumni/jobs'
          }
        ];
        localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(all));
      }

      if (isAdmin) {
        return all;
      }

      if (userEmail) {
        const cleanEmail = userEmail.toLowerCase().trim();
        return all.filter(l => l.recipient_email.toLowerCase().trim() === cleanEmail || (userId && l.user_id === userId));
      }
      return all;
    } catch {
      return [];
    }
  },

  /**
   * Dispatch an official email notification to connected Google / Gmail student accounts
   */
  dispatchEmailNotification: (params: {
    recipientEmail: string;
    recipientName: string;
    userId?: number;
    subject: string;
    previewText: string;
    category: 'Event' | 'Lowongan' | 'Pengumuman' | 'Tracer Study' | 'Sistem';
    contentMarkdown: string;
    actionLabel?: string;
    actionUrl?: string;
  }): EmailNotificationLog => {
    const schoolSettings = StorageService.getSchoolSettings();
    const id = `mail_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const timeFormatted = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #064e3b, #047857); padding: 24px; color: #ffffff;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; margin-bottom: 4px;">Pemberitahuan Resmi AlumniTrack</div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${schoolSettings.name}</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Pusat Karir, BKK & Tracer Study</p>
        </div>
        <div style="padding: 28px 24px; color: #1e293b; line-height: 1.6; font-size: 14px;">
          <p style="margin-top: 0; font-weight: 600; font-size: 15px;">Halo, ${params.recipientName} 👋</p>
          <p style="color: #475569; margin-bottom: 20px;">${params.contentMarkdown}</p>
          ${params.actionUrl ? `
            <div style="margin: 28px 0; text-align: center;">
              <a href="${params.actionUrl}" style="background-color: #047857; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 13px; box-shadow: 0 2px 4px rgba(4, 120, 87, 0.2);">
                ${params.actionLabel || 'Buka di Portal AlumniTrack'} →
              </a>
            </div>
          ` : ''}
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">Email ini dikirimkan otomatis ke akun Google/Gmail terhubung Anda (<strong>${params.recipientEmail}</strong>) karena Anda terdaftar sebagai alumni aktif.</p>
            <p style="margin: 4px 0 0 0;">Salam hangat,<br/><strong>Tim BKK & Guru BK ${schoolSettings.name}</strong></p>
          </div>
        </div>
      </div>
    `;

    const plainBodyText = `Halo ${params.recipientName},\n\n${params.contentMarkdown}\n\nPemberitahuan resmi dari ${schoolSettings.name}.\nBuka portal: ${window.location.origin}${params.actionUrl || '/notifications'}`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(params.recipientEmail)}&su=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(plainBodyText)}`;

    const logEntry: EmailNotificationLog = {
      id,
      user_id: params.userId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      subject: params.subject,
      preview_text: params.previewText,
      body_html: bodyHtml,
      sent_at: timeFormatted,
      category: params.category,
      status: 'Terkirim',
      event_link: params.actionUrl,
      gmail_compose_url: gmailComposeUrl,
      real_gmail_sent: false
    };

    // 1. Try sending real email via backend SMTP (Nodemailer)
    import('./realMailService').then(({ RealMailService }) => {
      RealMailService.sendRealEmail({
        to: params.recipientEmail,
        subject: params.subject,
        html: bodyHtml,
        text: `${params.subject}\n\n${params.contentMarkdown}\n\n${schoolSettings.name}`
      }).then(res => {
        if (res.success) {
          logEntry.real_gmail_sent = true;
          try {
            const logs = EmailService.getEmailLogs(undefined, undefined, true);
            const idx = logs.findIndex(l => l.id === id);
            if (idx >= 0) {
              logs[idx].real_gmail_sent = true;
              localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
              window.dispatchEvent(new Event('alumnitrack_emails_changed'));
            }
          } catch (e) {
            console.error(e);
          }
        }
      }).catch(err => console.error('Error background sending SMTP real email:', err));
    }).catch(e => console.error(e));

    // 2. Also try Google Workspace OAuth token if active
    import('./googleAuthService').then(({ getGoogleAccessToken, sendRealGmailEmail }) => {
      const token = getGoogleAccessToken();
      if (token) {
        sendRealGmailEmail({
          to: params.recipientEmail,
          subject: params.subject,
          htmlBody: bodyHtml
        }).then(res => {
          if (res.success) {
            logEntry.real_gmail_sent = true;
            try {
              const logs = EmailService.getEmailLogs(undefined, undefined, true);
              const idx = logs.findIndex(l => l.id === id);
              if (idx >= 0) {
                logs[idx].real_gmail_sent = true;
                localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
                window.dispatchEvent(new Event('alumnitrack_emails_changed'));
              }
            } catch (e) {
              console.error(e);
            }
          }
        }).catch(err => console.error('Error background sending real email:', err));
      }
    }).catch(e => console.error(e));

    try {
      const logs = EmailService.getEmailLogs(undefined, undefined, true);
      logs.unshift(logEntry);
      // Keep up to 200 logs
      if (logs.length > 200) logs.splice(200);
      localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
      window.dispatchEvent(new Event('alumnitrack_emails_changed'));
    } catch (e) {
      console.error('Error saving email notification log:', e);
    }

    return logEntry;
  },

  /**
   * Broadcast an email notification to all alumni with connected Google accounts or registered emails
   */
  broadcastToAlumniEmails: (params: {
    subject: string;
    previewText: string;
    category: 'Event' | 'Lowongan' | 'Pengumuman' | 'Tracer Study' | 'Sistem';
    contentMarkdown: string;
    actionLabel?: string;
    actionUrl?: string;
  }): number => {
    const users = StorageService.getUsers().filter(u => u.role === 'ALUMNI' && u.isActive);
    let sentCount = 0;

    users.forEach(u => {
      // Prioritize sending to Google accounts or students with email notifications enabled
      if (u.email && (u.is_google_user || u.receive_email_notifications !== false)) {
        EmailService.dispatchEmailNotification({
          recipientEmail: u.email,
          recipientName: u.name,
          userId: u.id,
          subject: params.subject,
          previewText: params.previewText,
          category: params.category,
          contentMarkdown: params.contentMarkdown,
          actionLabel: params.actionLabel,
          actionUrl: params.actionUrl
        });
        sentCount++;
      }
    });

    return sentCount;
  }
};
