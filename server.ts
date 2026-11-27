import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  getDbState,
  mutateDb,
  pgOps,
  isNeonConfigured,
  StoredUser,
} from './src/server/db.ts';
import {
  User,
  AlumniProfile,
  CareerHistoryItem,
  DocumentFile,
  TracerSurvey,
  TracerQuestion,
  TracerSubmission,
  JobPosting,
  ForumPost,
  NotificationItem,
  AuditLog,
  SchoolSettings,
  GuruBkProfile,
  EmailNotificationLog,
} from './src/types/index.ts';

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

interface TokenPayload {
  uid: number;
  role: 'ADMIN' | 'ALUMNI';
  email: string;
  exp: number;
}

interface AuthRequest extends Request {
  authUser?: User;
}

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SETTINGS_FILE = path.join(process.cwd(), '.smtp-config.json');

// SSE Subscribers for real-time updates
const sseClients = new Set<Response>();

function broadcastRealtimeChange(scope: string = 'all') {
  const payload = `event: change\ndata: ${JSON.stringify({ scope, ts: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function verifyConstantString(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function signToken(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toPublicUser(u: StoredUser): User {
  const { password_hash: _ph, password: _pw, ...safe } = u;
  return safe;
}

function sanitizeSafeUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function nextId(existingIds: number[]): number {
  const max = existingIds.reduce((m, v) => (v > m ? v : m), 0);
  return max + 1;
}

function generateUniqueNisn(seed: string, existingNisns: Set<string>): string {
  const base = Math.abs(
    Array.from(seed).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1000000, 100000)
  );
  let candidate = `0059${String(base).padStart(6, '0')}`;
  let offset = 1;
  while (existingNisns.has(candidate)) {
    candidate = `0059${String((base + offset) % 1000000).padStart(6, '0')}`;
    offset++;
  }
  return candidate;
}

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
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'bkk.alumnitrack@gmail.com',
  };
}

function saveSmtpSettings(settings: SmtpSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan' });
  }
  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Sesi telah berakhir atau tidak valid' });
  }
  try {
    const state = await getDbState();
    const user = state.users.find((u) => u.id === decoded.uid);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Akun tidak aktif atau tidak ditemukan' });
    }
    req.authUser = toPublicUser(user);
    next();
  } catch (err) {
    console.error('Auth lookup error:', err);
    return res.status(500).json({ success: false, error: 'Gagal memverifikasi sesi pengguna' });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Akses khusus Administrator / Guru BK' });
    }
    next();
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // --- REAL-TIME SSE STREAM ---
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ engine: isNeonConfigured() ? 'neon-pg' : 'local-store' })}\n\n`);

    sseClients.add(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // --- PUBLIC NON-PII LANDING PAGE DATA ---
  app.get('/api/public/landing', async (_req, res) => {
    try {
      const state = await getDbState();
      const publicCareerStats = state.profiles.map((p) => ({
        alumni_id: p.id,
        status_karir: p.status_karir,
        angkatan: p.angkatan,
        jurusan: p.jurusan,
        updated_at: p.updated_at,
      }));
      const publicJobs = state.jobs.filter((j) => j.status === 'Published');
      res.json({
        settings: state.settings,
        publicCareerStats,
        publicJobs,
      });
    } catch (err: any) {
      console.error('Public landing error:', err);
      res.status(500).json({ error: 'Gagal memuat data publik' });
    }
  });

  // --- AUTHENTICATION ---
  app.get('/api/auth/admin-status', async (_req, res) => {
    try {
      const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE?.trim());
      const state = await getDbState();
      const hasAdminHash = state.users.some((u) => u.role === 'ADMIN' && Boolean(u.password_hash));
      res.json({
        needsBootstrap: !hasEnvPasscode && !hasAdminHash,
      });
    } catch (err) {
      console.error('Admin status check error:', err);
      res.status(500).json({ needsBootstrap: false });
    }
  });

  app.post('/api/auth/bootstrap-admin', async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password Admin minimal 6 karakter.' });
    }

    if (process.env.ADMIN_PASSCODE?.trim()) {
      return res.status(409).json({
        success: false,
        message: 'Password Admin sudah diatur melalui konfigurasi server (ADMIN_PASSCODE).',
      });
    }

    try {
      const result = await mutateDb(async (state, pool) => {
        const alreadyClaimed = state.users.some(
          (u) => u.role === 'ADMIN' && Boolean(u.password_hash)
        );
        if (alreadyClaimed) {
          return { conflict: true as const };
        }

        const adminUser = state.users.find((u) => u.role === 'ADMIN');
        if (!adminUser) {
          return { missing: true as const };
        }

        adminUser.password_hash = hashPassword(password);
        adminUser.updated_at = new Date().toISOString();

        if (pool) {
          await pgOps.upsertUser(pool, adminUser);
        }

        const safeUser = toPublicUser(adminUser);
        const token = signToken({
          uid: safeUser.id,
          role: safeUser.role,
          email: safeUser.email,
          exp: Date.now() + 24 * 60 * 60 * 1000,
        });

        return { conflict: false as const, missing: false as const, token, user: safeUser };
      });

      if (result.conflict) {
        return res.status(409).json({
          success: false,
          message: 'Password Admin sudah diklaim sebelumnya. Silakan login menggunakan password tersebut.',
        });
      }
      if (result.missing) {
        return res.status(404).json({ success: false, message: 'Akun Admin belum tersedia.' });
      }

      return res.json({
        success: true,
        message: 'Password Admin berhasil ditetapkan! Selamat datang.',
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      console.error('Bootstrap admin error:', err);
      return res.status(500).json({ success: false, message: 'Gagal menyimpan password Admin.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/NISN dan password wajib diisi.' });
    }

    try {
      const state = await getDbState();
      const lowerId = identifier.toLowerCase();

      let matchedUser = state.users.find(
        (u) =>
          u.email.trim().toLowerCase() === lowerId ||
          (u.nisn && u.nisn.trim().toLowerCase() === lowerId)
      );

      if (!matchedUser) {
        const matchedProfile = state.profiles.find(
          (p) =>
            p.email.trim().toLowerCase() === lowerId ||
            p.nisn.trim().toLowerCase() === lowerId
        );
        if (matchedProfile) {
          matchedUser = state.users.find((u) => u.id === matchedProfile.user_id);
        }
      }

      if (!matchedUser) {
        return res.status(401).json({
          success: false,
          message: 'Email atau NISN tidak ditemukan. Jika Anda alumni baru, silakan daftar terlebih dahulu.',
        });
      }

      if (!matchedUser.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Akun Anda sedang dinonaktifkan. Hubungi Guru BK / Admin Sekolah.',
        });
      }

      if (matchedUser.role === 'ADMIN') {
        const envPass = process.env.ADMIN_PASSCODE?.trim();
        if (envPass) {
          if (!verifyConstantString(password, envPass)) {
            return res.status(401).json({ success: false, message: 'Password Admin salah.' });
          }
        } else if (matchedUser.password_hash) {
          if (!verifyPassword(password, matchedUser.password_hash)) {
            return res.status(401).json({ success: false, message: 'Password Admin salah.' });
          }
        } else {
          return res.status(401).json({
            success: false,
            message: 'Password Admin belum ditetapkan. Silakan lengkapi Setup Password Admin di halaman login.',
          });
        }
      } else {
        if (!matchedUser.password_hash) {
          return res.status(401).json({
            success: false,
            message:
              'Akun contoh belum memiliki kata sandi. Silakan daftar akun baru melalui tab Daftar Akun Alumni Baru.',
          });
        }
        if (!verifyPassword(password, matchedUser.password_hash)) {
          return res.status(401).json({ success: false, message: 'Password yang Anda masukkan salah.' });
        }
      }

      const safeUser = toPublicUser(matchedUser);
      const profile =
        safeUser.role === 'ALUMNI'
          ? state.profiles.find((p) => p.user_id === safeUser.id) || null
          : null;

      const token = signToken({
        uid: safeUser.id,
        role: safeUser.role,
        email: safeUser.email,
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        message: `Selamat datang, ${safeUser.name}!`,
        token,
        user: safeUser,
        alumniProfile: profile,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat proses login.' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawNisn = typeof req.body?.nisn === 'string' ? req.body.nisn.trim() : '';
    const angkatan = Number(req.body?.angkatan) || 2025;
    const jurusan = typeof req.body?.jurusan === 'string' && req.body.jurusan.trim() ? req.body.jurusan.trim() : 'PPLG';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : '';
    const receiveEmail = req.body?.receive_email_notifications ?? true;

    if (!name || !email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Nama lengkap dan email valid wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    try {
      const result = await mutateDb(async (state, pool) => {
        const emailExists = state.users.some((u) => u.email.trim().toLowerCase() === email);
        if (emailExists) {
          return { conflict: 'Email ini sudah terdaftar pada akun yang sudah ada. Silakan masuk atau gunakan email lain.' };
        }

        const existingNisns = new Set(
          [...state.users.map((u) => u.nisn || ''), ...state.profiles.map((p) => p.nisn || '')].filter(Boolean)
        );
        if (rawNisn && existingNisns.has(rawNisn)) {
          return { conflict: 'NISN ini sudah terdaftar pada akun lain.' };
        }

        const finalNisn = rawNisn || generateUniqueNisn(email, existingNisns);
        const newUserId = nextId(state.users.map((u) => u.id));
        const newProfileId = nextId(state.profiles.map((p) => p.id));
        const nowIso = new Date().toISOString();
        const today = nowIso.split('T')[0];

        const newUser: StoredUser = {
          id: newUserId,
          name: name.slice(0, 120),
          email: email.slice(0, 160),
          nisn: finalNisn,
          role: 'ALUMNI',
          password_hash: hashPassword(password),
          avatar,
          isActive: true,
          is_google_user: false,
          receive_email_notifications: Boolean(receiveEmail),
          created_at: nowIso,
          updated_at: nowIso,
        };

        const newProfile: AlumniProfile = {
          id: newProfileId,
          user_id: newUserId,
          name: newUser.name,
          nisn: finalNisn,
          angkatan,
          jurusan,
          email: newUser.email,
          phone,
          domisili: 'Jakarta',
          status_karir: 'Mencari Kerja',
          status_tracer: 'Belum Mengisi',
          privacy_setting: 'PUBLIC',
          avatar,
          is_google_user: false,
          receive_email_notifications: Boolean(receiveEmail),
          created_at: today,
          updated_at: today,
        };

        state.users.push(newUser);
        state.profiles.unshift(newProfile);

        if (pool) {
          await pgOps.upsertUser(pool, newUser);
          await pgOps.upsertProfile(pool, newProfile);
        }

        const safeUser = toPublicUser(newUser);
        const token = signToken({
          uid: safeUser.id,
          role: safeUser.role,
          email: safeUser.email,
          exp: Date.now() + 24 * 60 * 60 * 1000,
        });

        return { token, user: safeUser, profile: newProfile };
      });

      if ('conflict' in result && result.conflict) {
        return res.status(409).json({ success: false, message: result.conflict });
      }

      broadcastRealtimeChange('profiles');
      return res.json({
        success: true,
        message: 'Pendaftaran akun baru berhasil!',
        token: result.token,
        user: result.user,
        alumniProfile: result.profile,
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ success: false, message: 'Gagal mendaftarkan akun baru.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const state = await getDbState();
      const user = req.authUser!;
      const alumniProfile =
        user.role === 'ALUMNI'
          ? state.profiles.find((p) => p.user_id === user.id) || null
          : null;
      res.json({ user, alumniProfile });
    } catch {
      res.status(500).json({ error: 'Gagal memuat sesi pengguna' });
    }
  });

  // --- ROLE-SCOPED APPLICATION DATA ---
  app.get('/api/data', requireAuth, async (req: AuthRequest, res) => {
    try {
      const state = await getDbState();
      const user = req.authUser!;
      const isAdmin = user.role === 'ADMIN';

      if (isAdmin) {
        return res.json({
          users: state.users.map(toPublicUser),
          profiles: state.profiles,
          histories: state.histories,
          documents: state.documents,
          surveys: state.surveys,
          questions: state.questions,
          submissions: state.submissions,
          jobs: state.jobs,
          forum: state.forum.map((f) => ({
            ...f,
            liked_by_user: (f.liked_by_uids || []).includes(String(user.id)),
          })),
          notifications: state.notifications.map((n) => ({
            ...n,
            is_read: n.is_read || (n.read_by_uids || []).includes(String(user.id)),
          })),
          audit: state.audit,
          settings: state.settings,
          guruBk: state.guruBk,
          emailLogs: state.emailLogs,
        });
      }

      const ownProfile = state.profiles.find((p) => p.user_id === user.id);
      const visibleProfiles = state.profiles.filter(
        (p) => p.user_id === user.id || p.privacy_setting === 'PUBLIC'
      );
      const visibleProfileIds = new Set(visibleProfiles.map((p) => p.id));
      const ownIdStr = String(user.id);

      return res.json({
        users: [user],
        profiles: visibleProfiles,
        histories: state.histories.filter((h) => visibleProfileIds.has(h.alumni_id)),
        documents: ownProfile ? state.documents.filter((d) => d.alumni_id === ownProfile.id) : [],
        surveys: state.surveys,
        questions: state.questions,
        submissions: ownProfile ? state.submissions.filter((s) => s.alumni_id === ownProfile.id) : [],
        jobs: state.jobs.filter((j) => j.status === 'Published'),
        forum: state.forum.map((f) => ({
          ...f,
          liked_by_user: (f.liked_by_uids || []).includes(ownIdStr),
        })),
        notifications: state.notifications
          .filter(
            (n) =>
              n.user_id === user.id ||
              n.target_role === 'ALL' ||
              n.target_role === 'ALUMNI'
          )
          .map((n) => ({
            ...n,
            is_read: (n.read_by_uids || []).includes(ownIdStr) || (n.user_id === user.id && n.is_read),
          })),
        audit: [],
        settings: state.settings,
        guruBk: [state.guruBk.find((g) => g.is_default) || state.guruBk[0]].filter(Boolean),
        emailLogs: state.emailLogs.filter(
          (l) =>
            l.user_id === user.id ||
            l.recipient_email.toLowerCase() === user.email.toLowerCase()
        ),
      });
    } catch (err) {
      console.error('GET /api/data error:', err);
      res.status(500).json({ error: 'Gagal memuat data sistem' });
    }
  });

  // --- ALUMNI CRUD ---
  app.put('/api/alumni', requireAuth, async (req: AuthRequest, res) => {
    try {
      const payload = req.body as AlumniProfile;
      const caller = req.authUser!;

      const saved = await mutateDb(async (state, pool) => {
        const existing = payload.id ? state.profiles.find((p) => p.id === Number(payload.id)) : undefined;

        if (caller.role !== 'ADMIN') {
          if (!existing || existing.user_id !== caller.id) {
            return { forbidden: true as const };
          }
        }

        const profileId = existing ? existing.id : nextId(state.profiles.map((p) => p.id));
        const userId = existing
          ? existing.user_id
          : payload.user_id && payload.user_id > 0
            ? Number(payload.user_id)
            : nextId(state.users.map((u) => u.id));
        const today = new Date().toISOString().split('T')[0];

        const cleanProfile: AlumniProfile = {
          ...payload,
          id: profileId,
          user_id: userId,
          jurusan:
            payload.jurusan && payload.jurusan.toUpperCase().includes('TKJ')
              ? 'PPLG'
              : payload.jurusan || 'PPLG',
          linkedin_url: sanitizeSafeUrl(payload.linkedin_url),
          created_at: existing?.created_at || payload.created_at || today,
          updated_at: today,
        };
        delete cleanProfile.password;

        if (existing) {
          state.profiles = state.profiles.map((p) => (p.id === profileId ? cleanProfile : p));
        } else {
          state.profiles.unshift(cleanProfile);
        }

        const linkedUser = state.users.find((u) => u.id === userId);
        if (linkedUser) {
          linkedUser.name = cleanProfile.name;
          linkedUser.nisn = cleanProfile.nisn;
          linkedUser.avatar = cleanProfile.avatar ?? linkedUser.avatar;
          linkedUser.receive_email_notifications = cleanProfile.receive_email_notifications;
          linkedUser.updated_at = new Date().toISOString();
          if (pool) await pgOps.upsertUser(pool, linkedUser);
        } else if (caller.role === 'ADMIN') {
          const newUser: StoredUser = {
            id: userId,
            name: cleanProfile.name,
            email: cleanProfile.email.toLowerCase(),
            nisn: cleanProfile.nisn,
            role: 'ALUMNI',
            avatar: cleanProfile.avatar || '',
            isActive: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          state.users.push(newUser);
          if (pool) await pgOps.upsertUser(pool, newUser);
        }

        if (pool) {
          await pgOps.upsertProfile(pool, cleanProfile);
        }

        return { forbidden: false as const, profile: cleanProfile };
      });

      if (saved.forbidden) {
        return res.status(403).json({ error: 'Tidak memiliki izin mengubah profil alumni lain' });
      }

      broadcastRealtimeChange('profiles');
      return res.json(saved.profile);
    } catch (err) {
      console.error('PUT /api/alumni error:', err);
      res.status(500).json({ error: 'Gagal menyimpan data alumni' });
    }
  });

  app.delete('/api/alumni/:id', requireAdmin, async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) return res.status(400).json({ error: 'ID tidak valid' });

    await mutateDb(async (state, pool) => {
      state.profiles = state.profiles.filter((p) => p.id !== targetId);
      state.histories = state.histories.filter((h) => h.alumni_id !== targetId);
      state.documents = state.documents.filter((d) => d.alumni_id !== targetId);
      if (pool) {
        await pool.query('DELETE FROM at_alumni_profiles WHERE id = $1', [targetId]);
        await pool.query('DELETE FROM at_career_histories WHERE alumni_id = $1', [targetId]);
        await pool.query('DELETE FROM at_documents WHERE alumni_id = $1', [targetId]);
      }
    });
    broadcastRealtimeChange('profiles');
    res.json({ success: true });
  });

  app.post('/api/alumni/batch-delete', requireAdmin, async (req, res) => {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter(Number.isFinite)
      : [];
    if (ids.length === 0) return res.json({ deleted: 0 });

    const idSet = new Set(ids);
    const deletedCount = await mutateDb(async (state, pool) => {
      const before = state.profiles.length;
      state.profiles = state.profiles.filter((p) => !idSet.has(p.id));
      state.histories = state.histories.filter((h) => !idSet.has(h.alumni_id));
      state.documents = state.documents.filter((d) => !idSet.has(d.alumni_id));
      if (pool) {
        await pool.query('DELETE FROM at_alumni_profiles WHERE id = ANY($1::bigint[])', [ids]);
        await pool.query('DELETE FROM at_career_histories WHERE alumni_id = ANY($1::bigint[])', [ids]);
        await pool.query('DELETE FROM at_documents WHERE alumni_id = ANY($1::bigint[])', [ids]);
      }
      return before - state.profiles.length;
    });
    broadcastRealtimeChange('profiles');
    res.json({ deleted: deletedCount });
  });

  // --- CAREER HISTORIES ---
  app.put('/api/histories', requireAuth, async (req: AuthRequest, res) => {
    const item = req.body as CareerHistoryItem;
    const caller = req.authUser!;

    const result = await mutateDb(async (state, pool) => {
      const ownerProfile = state.profiles.find((p) => p.id === Number(item.alumni_id));
      if (caller.role !== 'ADMIN' && (!ownerProfile || ownerProfile.user_id !== caller.id)) {
        return { forbidden: true as const };
      }

      const id = item.id && item.id > 0 ? Number(item.id) : nextId(state.histories.map((h) => h.id));
      const saved: CareerHistoryItem = { ...item, id };
      const idx = state.histories.findIndex((h) => h.id === id);
      if (idx >= 0) state.histories[idx] = saved;
      else state.histories.push(saved);

      if (pool) {
        await pool.query(
          `INSERT INTO at_career_histories (id, alumni_id, year_start, year_end, is_current, position, company, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET year_start=EXCLUDED.year_start, year_end=EXCLUDED.year_end, is_current=EXCLUDED.is_current, position=EXCLUDED.position, company=EXCLUDED.company, description=EXCLUDED.description`,
          [saved.id, saved.alumni_id, saved.year_start, saved.year_end ?? null, saved.is_current, saved.position, saved.company, saved.description || null]
        );
      }
      return { forbidden: false as const, saved };
    });

    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('histories');
    res.json(result.saved);
  });

  app.delete('/api/histories/:id', requireAuth, async (req: AuthRequest, res) => {
    const targetId = Number(req.params.id);
    const caller = req.authUser!;

    const result = await mutateDb(async (state, pool) => {
      const existing = state.histories.find((h) => h.id === targetId);
      if (!existing) return { forbidden: false as const };
      const owner = state.profiles.find((p) => p.id === existing.alumni_id);
      if (caller.role !== 'ADMIN' && (!owner || owner.user_id !== caller.id)) {
        return { forbidden: true as const };
      }
      state.histories = state.histories.filter((h) => h.id !== targetId);
      if (pool) await pool.query('DELETE FROM at_career_histories WHERE id = $1', [targetId]);
      return { forbidden: false as const };
    });

    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('histories');
    res.json({ success: true });
  });

  // --- DOCUMENTS ---
  app.post('/api/documents', requireAuth, async (req: AuthRequest, res) => {
    const docItem = req.body as Omit<DocumentFile, 'id'>;
    const caller = req.authUser!;

    const result = await mutateDb(async (state, pool) => {
      const owner = state.profiles.find((p) => p.id === Number(docItem.alumni_id));
      if (caller.role !== 'ADMIN' && (!owner || owner.user_id !== caller.id)) {
        return { forbidden: true as const };
      }
      const id = nextId(state.documents.map((d) => d.id));
      const saved: DocumentFile = { ...docItem, id };
      state.documents.push(saved);

      if (pool) {
        await pool.query(
          `INSERT INTO at_documents (id, alumni_id, name, category, file_size_kb, upload_date, file_url, mime_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [saved.id, saved.alumni_id, saved.name, saved.category, saved.file_size_kb, saved.upload_date, saved.file_url, saved.mime_type]
        );
      }
      return { forbidden: false as const, saved };
    });

    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('documents');
    res.json(result.saved);
  });

  app.delete('/api/documents/:id', requireAuth, async (req: AuthRequest, res) => {
    const targetId = Number(req.params.id);
    const caller = req.authUser!;

    const result = await mutateDb(async (state, pool) => {
      const existing = state.documents.find((d) => d.id === targetId);
      if (!existing) return { forbidden: false as const };
      const owner = state.profiles.find((p) => p.id === existing.alumni_id);
      if (caller.role !== 'ADMIN' && (!owner || owner.user_id !== caller.id)) {
        return { forbidden: true as const };
      }
      state.documents = state.documents.filter((d) => d.id !== targetId);
      if (pool) await pool.query('DELETE FROM at_documents WHERE id = $1', [targetId]);
      return { forbidden: false as const };
    });

    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('documents');
    res.json({ success: true });
  });

  // --- TRACER SURVEYS & QUESTIONS ---
  app.put('/api/surveys', requireAdmin, async (req, res) => {
    const survey = req.body as TracerSurvey;
    const saved = await mutateDb(async (state, pool) => {
      const id = survey.id && survey.id > 0 ? Number(survey.id) : nextId(state.surveys.map((s) => s.id));
      const clean: TracerSurvey = { ...survey, id };
      const idx = state.surveys.findIndex((s) => s.id === id);
      if (idx >= 0) state.surveys[idx] = clean;
      else state.surveys.push(clean);

      if (pool) {
        await pool.query(
          `INSERT INTO at_tracer_surveys (id, title, description, target_angkatan, deadline, status, total_target, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, target_angkatan=EXCLUDED.target_angkatan, deadline=EXCLUDED.deadline, status=EXCLUDED.status, total_target=EXCLUDED.total_target`,
          [clean.id, clean.title, clean.description, clean.target_angkatan, clean.deadline, clean.status, clean.total_target, clean.created_at]
        );
      }
      return clean;
    });
    broadcastRealtimeChange('surveys');
    res.json(saved);
  });

  app.put('/api/questions', requireAdmin, async (req, res) => {
    const q = req.body as TracerQuestion;
    const saved = await mutateDb(async (state, pool) => {
      const id = q.id && q.id > 0 ? Number(q.id) : nextId(state.questions.map((x) => x.id));
      const clean: TracerQuestion = { ...q, id };
      const idx = state.questions.findIndex((x) => x.id === id);
      if (idx >= 0) state.questions[idx] = clean;
      else state.questions.push(clean);

      if (pool) {
        await pool.query(
          `INSERT INTO at_tracer_questions (id, survey_id, question_text, question_type, options, required, sort_order, section)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET survey_id=EXCLUDED.survey_id, question_text=EXCLUDED.question_text, question_type=EXCLUDED.question_type, options=EXCLUDED.options, required=EXCLUDED.required, sort_order=EXCLUDED.sort_order, section=EXCLUDED.section`,
          [clean.id, clean.survey_id, clean.question_text, clean.question_type, JSON.stringify(clean.options || []), clean.required, clean.order, clean.section || null]
        );
      }
      return clean;
    });
    broadcastRealtimeChange('questions');
    res.json(saved);
  });

  app.delete('/api/questions/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await mutateDb(async (state, pool) => {
      state.questions = state.questions.filter((q) => q.id !== id);
      if (pool) await pool.query('DELETE FROM at_tracer_questions WHERE id = $1', [id]);
    });
    broadcastRealtimeChange('questions');
    res.json({ success: true });
  });

  app.post('/api/questions/batch-delete', requireAdmin, async (req, res) => {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter(Number.isFinite)
      : [];
    const idSet = new Set(ids);
    const deleted = await mutateDb(async (state, pool) => {
      const before = state.questions.length;
      state.questions = state.questions.filter((q) => !idSet.has(q.id));
      if (pool && ids.length > 0) {
        await pool.query('DELETE FROM at_tracer_questions WHERE id = ANY($1::bigint[])', [ids]);
      }
      return before - state.questions.length;
    });
    broadcastRealtimeChange('questions');
    res.json({ deleted });
  });

  // --- TRACER SUBMISSIONS ---
  app.post('/api/submissions', requireAuth, async (req: AuthRequest, res) => {
    const sub = req.body as Omit<TracerSubmission, 'id'>;
    const caller = req.authUser!;

    const result = await mutateDb(async (state, pool) => {
      const owner = state.profiles.find((p) => p.id === Number(sub.alumni_id));
      if (caller.role !== 'ADMIN' && (!owner || owner.user_id !== caller.id)) {
        return { forbidden: true as const };
      }

      const existing = state.submissions.find(
        (s) => s.survey_id === Number(sub.survey_id) && s.alumni_id === Number(sub.alumni_id)
      );
      const id = existing ? existing.id : nextId(state.submissions.map((s) => s.id));
      const saved: TracerSubmission = { ...sub, id };

      if (existing) {
        state.submissions = state.submissions.map((s) => (s.id === id ? saved : s));
      } else {
        state.submissions.push(saved);
      }

      if (owner) {
        owner.status_tracer = saved.status;
        owner.updated_at = new Date().toISOString().split('T')[0];
        if (pool) await pgOps.upsertProfile(pool, owner);
      }

      if (pool) {
        await pool.query(
          `INSERT INTO at_tracer_submissions (id, survey_id, alumni_id, alumni_name, angkatan, jurusan, status, submitted_at, answers)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, submitted_at=EXCLUDED.submitted_at, answers=EXCLUDED.answers`,
          [saved.id, saved.survey_id, saved.alumni_id, saved.alumni_name, saved.angkatan, saved.jurusan, saved.status, saved.submitted_at, JSON.stringify(saved.answers || {})]
        );
      }
      return { forbidden: false as const, saved };
    });

    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('submissions');
    res.json(result.saved);
  });

  // --- JOBS ---
  app.put('/api/jobs', requireAdmin, async (req, res) => {
    const job = req.body as JobPosting;
    const saved = await mutateDb(async (state, pool) => {
      const id = job.id && job.id > 0 ? Number(job.id) : nextId(state.jobs.map((j) => j.id));
      const clean: JobPosting = {
        ...job,
        id,
        apply_url: sanitizeSafeUrl(job.apply_url),
        created_at: job.created_at || new Date().toISOString().split('T')[0],
      };
      const idx = state.jobs.findIndex((j) => j.id === id);
      if (idx >= 0) state.jobs[idx] = clean;
      else state.jobs.unshift(clean);

      if (pool) {
        await pool.query(
          `INSERT INTO at_jobs (id, title, company, location, type, category, deadline, description, requirements, apply_url, contact_email, status, event_date, created_at, image, company_logo, posted_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, company=EXCLUDED.company, location=EXCLUDED.location, type=EXCLUDED.type, category=EXCLUDED.category, deadline=EXCLUDED.deadline, description=EXCLUDED.description, requirements=EXCLUDED.requirements, apply_url=EXCLUDED.apply_url, contact_email=EXCLUDED.contact_email, status=EXCLUDED.status, event_date=EXCLUDED.event_date, image=EXCLUDED.image`,
          [clean.id, clean.title, clean.company, clean.location, clean.type, clean.category, clean.deadline, clean.description, clean.requirements || null, clean.apply_url || null, clean.contact_email || null, clean.status, clean.event_date || null, clean.created_at, clean.image || null, clean.company_logo || null, clean.posted_by || null]
        );
      }
      return clean;
    });
    broadcastRealtimeChange('jobs');
    res.json(saved);
  });

  app.delete('/api/jobs/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await mutateDb(async (state, pool) => {
      state.jobs = state.jobs.filter((j) => j.id !== id);
      if (pool) await pool.query('DELETE FROM at_jobs WHERE id = $1', [id]);
    });
    broadcastRealtimeChange('jobs');
    res.json({ success: true });
  });

  app.post('/api/jobs/batch-delete', requireAdmin, async (req, res) => {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter(Number.isFinite)
      : [];
    const idSet = new Set(ids);
    const deleted = await mutateDb(async (state, pool) => {
      const before = state.jobs.length;
      state.jobs = state.jobs.filter((j) => !idSet.has(j.id));
      if (pool && ids.length > 0) {
        await pool.query('DELETE FROM at_jobs WHERE id = ANY($1::bigint[])', [ids]);
      }
      return before - state.jobs.length;
    });
    broadcastRealtimeChange('jobs');
    res.json({ deleted });
  });

  // --- FORUM ---
  app.post('/api/forum', requireAuth, async (req: AuthRequest, res) => {
    const caller = req.authUser!;
    const body = req.body;
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const saved = await mutateDb(async (state, pool) => {
      const id = nextId(state.forum.map((p) => p.id));
      const post: ForumPost = {
        id,
        author_id: caller.id,
        author_name: caller.name,
        author_role: caller.role,
        author_avatar: caller.avatar,
        title: String(body.title || '').slice(0, 200),
        content: String(body.content || '').slice(0, 5000),
        category: body.category || 'Umum',
        likes: 0,
        liked_by_user: false,
        liked_by_uids: [],
        is_locked: Boolean(body.is_locked) && caller.role === 'ADMIN',
        created_at: timeStr,
        comments: [],
      };
      state.forum.unshift(post);
      if (pool) {
        await pool.query(
          `INSERT INTO at_forum_posts (id, author_id, author_name, author_role, author_avatar, title, content, category, likes, liked_by_uids, is_locked, created_at, comments)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [post.id, post.author_id, post.author_name, post.author_role, post.author_avatar || null, post.title, post.content, post.category, 0, '[]', post.is_locked, post.created_at, '[]']
        );
      }
      return post;
    });
    broadcastRealtimeChange('forum');
    res.json(saved);
  });

  app.post('/api/forum/:id/like', requireAuth, async (req: AuthRequest, res) => {
    const postId = Number(req.params.id);
    const uidStr = String(req.authUser!.id);
    await mutateDb(async (state, pool) => {
      const post = state.forum.find((p) => p.id === postId);
      if (!post) return;
      const set = new Set(post.liked_by_uids || []);
      if (set.has(uidStr)) {
        set.delete(uidStr);
        post.likes = Math.max(0, post.likes - 1);
      } else {
        set.add(uidStr);
        post.likes += 1;
      }
      post.liked_by_uids = Array.from(set);
      if (pool) {
        await pool.query('UPDATE at_forum_posts SET likes = $1, liked_by_uids = $2 WHERE id = $3', [
          post.likes,
          JSON.stringify(post.liked_by_uids),
          postId,
        ]);
      }
    });
    broadcastRealtimeChange('forum');
    res.json({ success: true });
  });

  app.post('/api/forum/:id/comment', requireAuth, async (req: AuthRequest, res) => {
    const postId = Number(req.params.id);
    const caller = req.authUser!;
    const content = String(req.body?.content || '').trim().slice(0, 2000);
    if (!content) return res.status(400).json({ error: 'Komentar kosong' });

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    await mutateDb(async (state, pool) => {
      const post = state.forum.find((p) => p.id === postId);
      if (!post || post.is_locked) return;
      const newComment = {
        id: Math.floor(Math.random() * 900000) + 1000,
        post_id: postId,
        author_id: caller.id,
        author_name: caller.name,
        author_role: caller.role,
        author_avatar: caller.avatar,
        content,
        created_at: timeStr,
      };
      post.comments = [...(post.comments || []), newComment];
      if (pool) {
        await pool.query('UPDATE at_forum_posts SET comments = $1 WHERE id = $2', [
          JSON.stringify(post.comments),
          postId,
        ]);
      }
    });
    broadcastRealtimeChange('forum');
    res.json({ success: true });
  });

  app.post('/api/forum/:id/lock', requireAdmin, async (req, res) => {
    const postId = Number(req.params.id);
    await mutateDb(async (state, pool) => {
      const post = state.forum.find((p) => p.id === postId);
      if (!post) return;
      post.is_locked = !post.is_locked;
      if (pool) await pool.query('UPDATE at_forum_posts SET is_locked = $1 WHERE id = $2', [post.is_locked, postId]);
    });
    broadcastRealtimeChange('forum');
    res.json({ success: true });
  });

  app.delete('/api/forum/:id', requireAuth, async (req: AuthRequest, res) => {
    const postId = Number(req.params.id);
    const caller = req.authUser!;
    const result = await mutateDb(async (state, pool) => {
      const post = state.forum.find((p) => p.id === postId);
      if (!post) return { forbidden: false as const };
      if (caller.role !== 'ADMIN' && post.author_id !== caller.id) return { forbidden: true as const };
      state.forum = state.forum.filter((p) => p.id !== postId);
      if (pool) await pool.query('DELETE FROM at_forum_posts WHERE id = $1', [postId]);
      return { forbidden: false as const };
    });
    if (result.forbidden) return res.status(403).json({ error: 'Akses ditolak' });
    broadcastRealtimeChange('forum');
    res.json({ success: true });
  });

  // --- NOTIFICATIONS ---
  app.post('/api/notifications/read/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const uidStr = String(req.authUser!.id);
    await mutateDb(async (state, pool) => {
      const n = state.notifications.find((x) => x.id === id);
      if (!n) return;
      const set = new Set(n.read_by_uids || []);
      set.add(uidStr);
      n.read_by_uids = Array.from(set);
      if (req.authUser!.role === 'ADMIN' || n.user_id === req.authUser!.id) {
        n.is_read = true;
      }
      if (pool) {
        await pool.query('UPDATE at_notifications SET is_read = $1, read_by_uids = $2 WHERE id = $3', [
          n.is_read,
          JSON.stringify(n.read_by_uids),
          id,
        ]);
      }
    });
    broadcastRealtimeChange('notifications');
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
    const uidStr = String(req.authUser!.id);
    await mutateDb(async (state, pool) => {
      for (const n of state.notifications) {
        const set = new Set(n.read_by_uids || []);
        set.add(uidStr);
        n.read_by_uids = Array.from(set);
        if (req.authUser!.role === 'ADMIN' || n.user_id === req.authUser!.id) {
          n.is_read = true;
        }
        if (pool) {
          await pool.query('UPDATE at_notifications SET is_read = $1, read_by_uids = $2 WHERE id = $3', [
            n.is_read,
            JSON.stringify(n.read_by_uids),
            n.id,
          ]);
        }
      }
    });
    broadcastRealtimeChange('notifications');
    res.json({ success: true });
  });

  app.post('/api/notifications/broadcast', requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').slice(0, 200);
    const message = String(req.body?.message || '').slice(0, 1000);
    const target_role = req.body?.target_role || 'ALL';
    if (!title || !message) return res.status(400).json({ error: 'Judul dan pesan wajib diisi' });

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const saved = await mutateDb(async (state, pool) => {
      const id = nextId(state.notifications.map((n) => n.id));
      const item: NotificationItem = {
        id,
        title,
        message,
        target_role,
        type: 'announcement',
        is_read: false,
        read_by_uids: [],
        created_at: timeStr,
      };
      state.notifications.unshift(item);
      if (pool) {
        await pool.query(
          `INSERT INTO at_notifications (id, user_id, target_role, title, message, type, is_read, read_by_uids, created_at, link)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [item.id, null, item.target_role, item.title, item.message, item.type, false, '[]', item.created_at, null]
        );
      }
      return item;
    });
    broadcastRealtimeChange('notifications');
    res.json(saved);
  });

  // --- AUDIT LOGS ---
  app.post('/api/audit', requireAuth, async (req: AuthRequest, res) => {
    const caller = req.authUser!;
    const activity = String(req.body?.activity || '').slice(0, 500);
    if (!activity) return res.status(400).json({ error: 'Aktivitas kosong' });

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;
    const item = await mutateDb(async (state, pool) => {
      const id = nextId(state.audit.map((a) => a.id));
      const log: AuditLog = {
        id,
        user_name: caller.name,
        user_role: caller.role,
        activity,
        ip: isNeonConfigured() ? 'Neon PostgreSQL' : 'AlumniTrack Server',
        timestamp: timeStr,
      };
      state.audit.unshift(log);
      if (pool) {
        await pool.query(
          `INSERT INTO at_audit_logs (id, user_name, user_role, activity, ip, timestamp) VALUES ($1,$2,$3,$4,$5,$6)`,
          [log.id, log.user_name, log.user_role, log.activity, log.ip, log.timestamp]
        );
      }
      return log;
    });
    broadcastRealtimeChange('audit');
    res.json(item);
  });

  app.delete('/api/audit/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await mutateDb(async (state, pool) => {
      state.audit = state.audit.filter((a) => a.id !== id);
      if (pool) await pool.query('DELETE FROM at_audit_logs WHERE id = $1', [id]);
    });
    broadcastRealtimeChange('audit');
    res.json({ success: true });
  });

  app.post('/api/audit/batch-delete', requireAdmin, async (req, res) => {
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter(Number.isFinite)
      : [];
    const idSet = new Set(ids);
    const deleted = await mutateDb(async (state, pool) => {
      const before = state.audit.length;
      state.audit = state.audit.filter((a) => !idSet.has(a.id));
      if (pool && ids.length > 0) {
        await pool.query('DELETE FROM at_audit_logs WHERE id = ANY($1::bigint[])', [ids]);
      }
      return before - state.audit.length;
    });
    broadcastRealtimeChange('audit');
    res.json({ deleted });
  });

  app.delete('/api/audit', requireAdmin, async (_req, res) => {
    await mutateDb(async (state, pool) => {
      state.audit = [];
      if (pool) await pool.query('DELETE FROM at_audit_logs');
    });
    broadcastRealtimeChange('audit');
    res.json({ success: true });
  });

  // --- SCHOOL SETTINGS ---
  app.put('/api/settings', requireAdmin, async (req, res) => {
    const body = req.body as SchoolSettings;
    const saved = await mutateDb(async (state, pool) => {
      const clean: SchoolSettings = {
        ...body,
        landing_hero_image: sanitizeSafeUrl(body.landing_hero_image) || '',
        logo: sanitizeSafeUrl(body.logo) || state.settings.logo,
        website: sanitizeSafeUrl(body.website) || '',
      };
      state.settings = clean;
      if (pool) {
        await pool.query(
          `INSERT INTO at_school_settings (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
          ['main', JSON.stringify(clean)]
        );
      }
      return clean;
    });
    broadcastRealtimeChange('settings');
    res.json(saved);
  });

  // --- GURU BK CRUD ---
  app.put('/api/guru-bk', requireAdmin, async (req, res) => {
    const data = req.body as Omit<GuruBkProfile, 'id' | 'updated_at'> & { id?: number };
    const today = new Date().toISOString().split('T')[0];

    const saved = await mutateDb(async (state, pool) => {
      const newId = data.id && data.id > 0 ? Number(data.id) : nextId(state.guruBk.map((g) => g.id));
      let updatedList = state.guruBk.map((item) =>
        data.is_default ? { ...item, is_default: false } : item
      );
      const item: GuruBkProfile = {
        ...data,
        id: newId,
        is_default: data.is_default ?? updatedList.length === 0,
        updated_at: today,
      };
      const idx = updatedList.findIndex((g) => g.id === newId);
      if (idx >= 0) updatedList[idx] = item;
      else updatedList.push(item);

      if (!updatedList.some((g) => g.is_default) && updatedList.length > 0) {
        updatedList[0] = { ...updatedList[0], is_default: true };
      }

      state.guruBk = updatedList;
      if (pool) {
        for (const g of updatedList) {
          await pool.query(
            `INSERT INTO at_guru_bk_profiles (id, name, nip, title, email, phone, city, avatar, is_default, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, nip=EXCLUDED.nip, title=EXCLUDED.title, email=EXCLUDED.email, phone=EXCLUDED.phone, city=EXCLUDED.city, avatar=EXCLUDED.avatar, is_default=EXCLUDED.is_default, updated_at=EXCLUDED.updated_at`,
            [g.id, g.name, g.nip || null, g.title, g.email || null, g.phone || null, g.city || null, g.avatar || '', Boolean(g.is_default), g.updated_at]
          );
        }
      }
      return item;
    });
    broadcastRealtimeChange('guruBk');
    res.json(saved);
  });

  app.post('/api/guru-bk/:id/default', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await mutateDb(async (state, pool) => {
      state.guruBk = state.guruBk.map((g) => ({ ...g, is_default: g.id === id }));
      if (pool) {
        await pool.query('UPDATE at_guru_bk_profiles SET is_default = (id = $1)', [id]);
      }
    });
    broadcastRealtimeChange('guruBk');
    res.json({ success: true });
  });

  app.delete('/api/guru-bk/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const ok = await mutateDb(async (state, pool) => {
      if (state.guruBk.length <= 1) return false;
      const filtered = state.guruBk.filter((g) => g.id !== id);
      if (filtered.length === state.guruBk.length) return false;
      if (!filtered.some((g) => g.is_default) && filtered.length > 0) {
        filtered[0] = { ...filtered[0], is_default: true };
      }
      state.guruBk = filtered;
      if (pool) {
        await pool.query('DELETE FROM at_guru_bk_profiles WHERE id = $1', [id]);
        for (const g of filtered) {
          await pool.query('UPDATE at_guru_bk_profiles SET is_default = $1 WHERE id = $2', [
            Boolean(g.is_default),
            g.id,
          ]);
        }
      }
      return true;
    });
    if (!ok) return res.status(400).json({ error: 'Minimal harus menyisakan satu profil Guru BK' });
    broadcastRealtimeChange('guruBk');
    res.json({ success: true });
  });

  // --- EMAIL LOGS ---
  app.post('/api/email-logs', requireAuth, async (req: AuthRequest, res) => {
    const log = req.body as EmailNotificationLog;
    await mutateDb(async (state, pool) => {
      state.emailLogs.unshift(log);
      if (state.emailLogs.length > 200) state.emailLogs.splice(200);
      if (pool) {
        await pool.query(
          `INSERT INTO at_email_logs (id, user_id, recipient_email, recipient_name, subject, preview_text, body_html, sent_at, category, status, event_link, real_gmail_sent, gmail_compose_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET real_gmail_sent = EXCLUDED.real_gmail_sent, status = EXCLUDED.status`,
          [log.id, log.user_id ?? null, log.recipient_email, log.recipient_name, log.subject, log.preview_text || null, log.body_html, log.sent_at, log.category || null, log.status, log.event_link || null, Boolean(log.real_gmail_sent), log.gmail_compose_url || null]
        );
      }
    });
    res.json({ success: true });
  });

  // --- SMTP ROUTES (Protected) ---
  app.get('/api/smtp/status', requireAuth, (_req, res) => {
    const settings = getSmtpSettings();
    res.json({
      configured: !!(settings.user && settings.pass),
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      user: settings.user ? settings.user.replace(/(.{3})(.*)(@.*)/, '$1***$3') : '',
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
    });
  });

  app.post('/api/smtp/config', requireAdmin, (req, res) => {
    try {
      const { host, port, secure, user, pass, fromName, fromEmail, enabled } = req.body;
      const current = getSmtpSettings();
      const updated: SmtpSettings = {
        enabled: enabled ?? true,
        host: host || current.host || 'smtp.gmail.com',
        port: Number(port) || current.port || 465,
        secure: secure ?? Number(port) === 465,
        user: user !== undefined ? user : current.user,
        pass: pass ? pass : current.pass,
        fromName: fromName || current.fromName || 'AlumniTrack SMKN 1',
        fromEmail: fromEmail || user || current.fromEmail,
      };
      saveSmtpSettings(updated);
      res.json({ success: true, message: 'Konfigurasi SMTP berhasil disimpan' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/send-email', requireAuth, async (req: AuthRequest, res) => {
    const { to, subject, html, text, fromName } = req.body;
    const caller = req.authUser!;

    if (caller.role !== 'ADMIN' && String(to || '').toLowerCase() !== caller.email.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Anda hanya dapat mengirim email uji ke alamat email Anda sendiri' });
    }

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ success: false, error: 'Parameter to, subject, and content wajib diisi' });
    }

    const settings = getSmtpSettings();
    if (!settings.user || !settings.pass) {
      return res.status(400).json({
        success: false,
        requiresConfig: true,
        error: 'Server SMTP belum dikonfigurasi.',
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: settings.host || 'smtp.gmail.com',
        port: Number(settings.port) || 465,
        secure: Number(settings.port) === 465,
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
      });

      const senderDisplay = `"${fromName || settings.fromName}" <${settings.fromEmail || settings.user}>`;
      const info = await transporter.sendMail({
        from: senderDisplay,
        to,
        subject,
        text: text || subject,
        html: html || `<p>${text}</p>`,
      });

      return res.json({
        success: true,
        messageId: info.messageId,
        message: `Email berhasil dikirim ke ${to}.`,
      });
    } catch (error: any) {
      console.error('[SMTP ERROR]', error);
      return res.status(500).json({
        success: false,
        error: `Gagal mengirim email: ${error.message}`,
      });
    }
  });

  // Mount Vite in dev mode or serve static dist in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `AlumniTrack Server running on http://0.0.0.0:${PORT} (DB: ${
        isNeonConfigured() ? 'Neon PostgreSQL' : 'Local Persistent Store'
      })`
    );
  });
}

startServer();
