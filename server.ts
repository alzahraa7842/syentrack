import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

const SETTINGS_FILE = path.join(process.cwd(), '.smtp-config.json');

function getSmtpSettings(): SmtpSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading SMTP settings:', e);
  }

  return {
    enabled: !!process.env.SMTP_USER,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_PORT || '465') === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'AlumniTrack SMKN 1',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'bkk.alumnitrack@gmail.com'
  };
}

function saveSmtpSettings(settings: SmtpSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // GET Current SMTP Status
  app.get('/api/smtp/status', (req, res) => {
    const settings = getSmtpSettings();
    res.json({
      configured: !!(settings.user && settings.pass),
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      user: settings.user ? settings.user.replace(/(.{3})(.*)(@.*)/, '$1***$3') : '',
      fromName: settings.fromName,
      fromEmail: settings.fromEmail
    });
  });

  // SAVE SMTP Config
  app.post('/api/smtp/config', (req, res) => {
    try {
      const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;
      const current = getSmtpSettings();
      const updated: SmtpSettings = {
        enabled: enabled ?? true,
        host: host || current.host || 'smtp.gmail.com',
        port: Number(port) || current.port || 465,
        secure: secure ?? (Number(port) === 465),
        user: user !== undefined ? user : current.user,
        pass: pass ? pass : current.pass, // Only update pass if provided
        fromName: fromName || current.fromName || 'AlumniTrack SMKN 1',
        fromEmail: fromEmail || user || current.fromEmail
      };

      saveSmtpSettings(updated);
      res.json({ success: true, message: 'Konfigurasi SMTP berhasil disimpan' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // SEND REAL EMAIL TO GMAIL
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text, fromName } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ success: false, error: 'Parameter to, subject, and content wajib diisi' });
    }

    const settings = getSmtpSettings();

    if (!settings.user || !settings.pass) {
      return res.status(400).json({
        success: false,
        requiresConfig: true,
        error: 'Server SMTP belum dikonfigurasi. Masukkan Akun Gmail Pengirim & Sandi Aplikasi (App Password) di menu Pengaturan Sistem agar email nyata dapat dikirim ke kotak masuk Gmail.'
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: settings.host || 'smtp.gmail.com',
        port: Number(settings.port) || 465,
        secure: Number(settings.port) === 465,
        auth: {
          user: settings.user,
          pass: settings.pass
        }
      });

      const senderDisplay = `"${fromName || settings.fromName}" <${settings.fromEmail || settings.user}>`;

      const info = await transporter.sendMail({
        from: senderDisplay,
        to,
        subject,
        text: text || subject,
        html: html || `<p>${text}</p>`
      });

      console.log(`[SMTP] Email successfully sent to ${to}, MessageID: ${info.messageId}`);

      return res.json({
        success: true,
        messageId: info.messageId,
        message: `Email nyata berhasil dikirim ke ${to} dan masuk ke inbox Gmail penerima!`
      });
    } catch (error: any) {
      console.error('[SMTP ERROR]', error);
      return res.status(500).json({
        success: false,
        error: `Gagal mengirim email ke server Google Gmail: ${error.message}`
      });
    }
  });

  // Mount Vite in dev mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlumniTrack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
