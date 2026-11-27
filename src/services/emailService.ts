import { EmailNotificationLog } from '../types';
import { StorageService } from './storageService';
import { RealMailService } from './realMailService';

export const EmailService = {
  getEmailLogs: (
    userId?: number,
    userEmail?: string,
    isAdmin: boolean = false
  ): EmailNotificationLog[] => {
    const all = StorageService.getEmailLogs();
    if (isAdmin) return all;
    if (userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      return all.filter(
        (l) =>
          l.recipient_email.toLowerCase().trim() === cleanEmail ||
          (userId && l.user_id === userId)
      );
    }
    return all;
  },

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
          <p style="margin-top: 0; font-weight: 600; font-size: 15px;">Halo, ${params.recipientName}</p>
          <p style="color: #475569; margin-bottom: 20px;">${params.contentMarkdown}</p>
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">Email ini dikirimkan otomatis ke alamat terdaftar Anda (<strong>${params.recipientEmail}</strong>).</p>
            <p style="margin: 4px 0 0 0;">Salam hangat,<br/><strong>Tim BKK & Guru BK ${schoolSettings.name}</strong></p>
          </div>
        </div>
      </div>
    `;

    const plainBodyText = `Halo ${params.recipientName},\n\n${params.contentMarkdown}\n\nPemberitahuan resmi dari ${schoolSettings.name}.`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      params.recipientEmail
    )}&su=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(plainBodyText)}`;

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
      real_gmail_sent: false,
    };

    StorageService.saveEmailLog(logEntry);

    RealMailService.sendRealEmail({
      to: params.recipientEmail,
      subject: params.subject,
      html: bodyHtml,
      text: `${params.subject}\n\n${params.contentMarkdown}\n\n${schoolSettings.name}`,
    })
      .then((res) => {
        if (res.success) {
          StorageService.saveEmailLog({ ...logEntry, real_gmail_sent: true });
        }
      })
      .catch((err) => console.error('Error background sending SMTP real email:', err));

    return logEntry;
  },

  broadcastToAlumniEmails: (params: {
    subject: string;
    previewText: string;
    category: 'Event' | 'Lowongan' | 'Pengumuman' | 'Tracer Study' | 'Sistem';
    contentMarkdown: string;
    actionLabel?: string;
    actionUrl?: string;
  }): number => {
    const users = StorageService.getUsers().filter((u) => u.role === 'ALUMNI' && u.isActive);
    let sentCount = 0;

    users.forEach((u) => {
      if (u.email && u.receive_email_notifications !== false) {
        EmailService.dispatchEmailNotification({
          recipientEmail: u.email,
          recipientName: u.name,
          userId: u.id,
          subject: params.subject,
          previewText: params.previewText,
          category: params.category,
          contentMarkdown: params.contentMarkdown,
          actionLabel: params.actionLabel,
          actionUrl: params.actionUrl,
        });
        sentCount++;
      }
    });

    return sentCount;
  },
};
