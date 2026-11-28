import fs from 'fs';
import os from 'os';
import path from 'path';
import { Pool } from 'pg';
import type {
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
} from '../types/index.ts';
import {
  INITIAL_USERS,
  INITIAL_ALUMNI_PROFILES,
  INITIAL_CAREER_HISTORIES,
  INITIAL_DOCUMENTS,
  INITIAL_TRACER_SURVEYS,
  INITIAL_TRACER_QUESTIONS,
  INITIAL_JOB_POSTINGS,
  INITIAL_FORUM_POSTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_GURU_BK_PROFILES,
} from '../data/initialData.ts';
import {
  DEFAULT_HERO_IMAGE,
  DEFAULT_SCHOOL_LOGO,
  resolveAssetUrl,
} from '../constants/assets.ts';

export interface StoredUser extends User {
  password_hash?: string;
}

export interface DatabaseState {
  users: StoredUser[];
  profiles: AlumniProfile[];
  histories: CareerHistoryItem[];
  documents: DocumentFile[];
  surveys: TracerSurvey[];
  questions: TracerQuestion[];
  submissions: TracerSubmission[];
  jobs: JobPosting[];
  forum: ForumPost[];
  notifications: NotificationItem[];
  audit: AuditLog[];
  settings: SchoolSettings;
  guruBk: GuruBkProfile[];
  emailLogs: EmailNotificationLog[];
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_DB_PATH = IS_SERVERLESS
  ? path.join(os.tmpdir(), '.alumnitrack-db.json')
  : path.join(process.cwd(), '.alumnitrack-db.json');

declare global {
  var _neonPgPool: Pool | undefined;
}

function getNormalizedDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim() || '';
  return raw.replace(/^['"]|['"]$/g, '').trim();
}

function getPool(): Pool | null {
  const connStr = getNormalizedDatabaseUrl();
  if (!connStr) return null;
  if (!global._neonPgPool) {
    const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');
    const hasSslMode = connStr.includes('sslmode=');
    global._neonPgPool = new Pool({
      connectionString: connStr,
      ssl: isLocal ? false : hasSslMode ? undefined : { rejectUnauthorized: true },
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 15000,
    });
    global._neonPgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return global._neonPgPool;
}

export function isNeonConfigured(): boolean {
  return Boolean(getNormalizedDatabaseUrl());
}

export function isEphemeralStore(): boolean {
  return !isNeonConfigured() && Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function sanitizeInitialUsers(): StoredUser[] {
  return INITIAL_USERS.map((u) => {
    const copy = { ...u } as StoredUser;
    delete copy.password;
    return copy;
  });
}

function sanitizeInitialProfiles(): AlumniProfile[] {
  return INITIAL_ALUMNI_PROFILES.map((p) => {
    const copy = { ...p };
    delete copy.password;
    return copy;
  });
}

function normalizeSettingsRecord(raw?: Partial<SchoolSettings> | null): SchoolSettings {
  const merged: SchoolSettings = {
    ...INITIAL_SCHOOL_SETTINGS,
    ...(raw || {}),
  };
  return {
    ...merged,
    logo: resolveAssetUrl(merged.logo, DEFAULT_SCHOOL_LOGO),
    landing_hero_image: resolveAssetUrl(merged.landing_hero_image, DEFAULT_HERO_IMAGE),
  };
}

function normalizeStateAssets(state: DatabaseState): DatabaseState {
  return {
    ...state,
    users: state.users.map((u) => ({
      ...u,
      avatar: u.avatar ? resolveAssetUrl(u.avatar) : '',
    })),
    profiles: state.profiles.map((p) => ({
      ...p,
      avatar: p.avatar ? resolveAssetUrl(p.avatar) : '',
    })),
    forum: state.forum.map((f) => ({
      ...f,
      author_avatar: f.author_avatar ? resolveAssetUrl(f.author_avatar) : undefined,
    })),
    guruBk: state.guruBk.map((g) => ({
      ...g,
      avatar: g.avatar ? resolveAssetUrl(g.avatar) : '',
    })),
    settings: normalizeSettingsRecord(state.settings),
  };
}

function createInitialState(): DatabaseState {
  return normalizeStateAssets({
    users: sanitizeInitialUsers(),
    profiles: sanitizeInitialProfiles(),
    histories: [...INITIAL_CAREER_HISTORIES],
    documents: [...INITIAL_DOCUMENTS],
    surveys: [...INITIAL_TRACER_SURVEYS],
    questions: [...INITIAL_TRACER_QUESTIONS],
    submissions: [],
    jobs: [...INITIAL_JOB_POSTINGS],
    forum: [...INITIAL_FORUM_POSTS],
    notifications: [...INITIAL_NOTIFICATIONS],
    audit: [...INITIAL_AUDIT_LOGS],
    settings: { ...INITIAL_SCHOOL_SETTINGS },
    guruBk: [...INITIAL_GURU_BK_PROFILES],
    emailLogs: [],
  });
}

let pgSchemaReady = false;
let pgInitPromise: Promise<void> | null = null;
let localStateCache: DatabaseState | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function readLocalState(): DatabaseState {
  if (localStateCache) return localStateCache;
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      localStateCache = normalizeStateAssets({
        ...createInitialState(),
        ...parsed,
        settings: normalizeSettingsRecord(parsed.settings),
      });
      return localStateCache;
    }
  } catch (err) {
    console.error('Failed to read local store, re-seeding:', err);
  }
  localStateCache = createInitialState();
  writeLocalState(localStateCache);
  return localStateCache;
}

function writeLocalState(state: DatabaseState): void {
  localStateCache = state;
  try {
    const tmpPath = `${LOCAL_DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, LOCAL_DB_PATH);
  } catch (err) {
    console.warn('Local state persistence skipped (read-only/ephemeral FS):', (err as Error)?.message || err);
  }
}

async function ensurePgInitialized(pool: Pool): Promise<void> {
  if (pgSchemaReady) return;
  if (pgInitPromise) return pgInitPromise;

  pgInitPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS at_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_users (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        nisn TEXT,
        role TEXT NOT NULL DEFAULT 'ALUMNI',
        password_hash TEXT,
        avatar TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_google_user BOOLEAN DEFAULT FALSE,
        receive_email_notifications BOOLEAN DEFAULT TRUE,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS at_alumni_profiles (
        id BIGINT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        nisn TEXT NOT NULL,
        angkatan INT NOT NULL,
        jurusan TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        domisili TEXT DEFAULT 'Jakarta',
        status_karir TEXT NOT NULL DEFAULT 'Mencari Kerja',
        status_tracer TEXT NOT NULL DEFAULT 'Belum Mengisi',
        avatar TEXT,
        linkedin_url TEXT,
        privacy_setting TEXT NOT NULL DEFAULT 'PUBLIC',
        is_google_user BOOLEAN DEFAULT FALSE,
        receive_email_notifications BOOLEAN DEFAULT TRUE,
        job_company TEXT,
        job_position TEXT,
        job_industry TEXT,
        job_location TEXT,
        job_start_date TEXT,
        job_type TEXT,
        edu_university TEXT,
        edu_major TEXT,
        edu_degree TEXT,
        edu_location TEXT,
        edu_start_year INT,
        biz_name TEXT,
        biz_field TEXT,
        biz_location TEXT,
        biz_start_year INT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_career_histories (
        id BIGINT PRIMARY KEY,
        alumni_id BIGINT NOT NULL,
        year_start INT NOT NULL,
        year_end INT,
        is_current BOOLEAN DEFAULT FALSE,
        position TEXT NOT NULL,
        company TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS at_documents (
        id BIGINT PRIMARY KEY,
        alumni_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        file_size_kb INT NOT NULL,
        upload_date TEXT NOT NULL,
        file_url TEXT NOT NULL,
        mime_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_tracer_surveys (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target_angkatan INT NOT NULL,
        deadline TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Aktif',
        total_target INT NOT NULL DEFAULT 100,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_tracer_questions (
        id BIGINT PRIMARY KEY,
        survey_id BIGINT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        required BOOLEAN DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 1,
        section TEXT
      );

      CREATE TABLE IF NOT EXISTS at_tracer_submissions (
        id BIGINT PRIMARY KEY,
        survey_id BIGINT NOT NULL,
        alumni_id BIGINT NOT NULL,
        alumni_name TEXT NOT NULL,
        angkatan INT NOT NULL,
        jurusan TEXT NOT NULL,
        status TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS at_jobs (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        deadline TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        apply_url TEXT,
        contact_email TEXT,
        status TEXT NOT NULL DEFAULT 'Published',
        event_date TEXT,
        created_at TEXT NOT NULL,
        image TEXT,
        company_logo TEXT,
        posted_by TEXT
      );

      CREATE TABLE IF NOT EXISTS at_forum_posts (
        id BIGINT PRIMARY KEY,
        author_id BIGINT NOT NULL,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL,
        author_avatar TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        likes INT DEFAULT 0,
        liked_by_uids JSONB DEFAULT '[]'::jsonb,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL,
        comments JSONB DEFAULT '[]'::jsonb
      );

      CREATE TABLE IF NOT EXISTS at_notifications (
        id BIGINT PRIMARY KEY,
        user_id BIGINT,
        target_role TEXT DEFAULT 'ALL',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_by_uids JSONB DEFAULT '[]'::jsonb,
        created_at TEXT NOT NULL,
        link TEXT
      );

      CREATE TABLE IF NOT EXISTS at_audit_logs (
        id BIGINT PRIMARY KEY,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        activity TEXT NOT NULL,
        ip TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_school_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_guru_bk_profiles (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        nip TEXT,
        title TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        city TEXT,
        avatar TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS at_email_logs (
        id TEXT PRIMARY KEY,
        user_id BIGINT,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        preview_text TEXT,
        body_html TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        category TEXT,
        status TEXT NOT NULL,
        event_link TEXT,
        real_gmail_sent BOOLEAN DEFAULT FALSE,
        gmail_compose_url TEXT
      );
    `);

    const seedCheck = await pool.query(`SELECT value FROM at_meta WHERE key = $1`, ['seeded_v1']);
    if (seedCheck.rows.length === 0) {
      const seed = createInitialState();
      await writePgFullState(pool, seed);
      await pool.query(
        `INSERT INTO at_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        ['seeded_v1', new Date().toISOString()]
      );
    }

    const cleanupCheck = await pool.query(`SELECT value FROM at_meta WHERE key = $1`, [
      'cleanup_smoke_and_seed14_v1',
    ]);
    if (cleanupCheck.rows.length === 0) {
      await pool.query(`UPDATE at_users SET password_hash = NULL WHERE id IN (1, 2)`);
      await pool.query(
        `DELETE FROM at_alumni_profiles WHERE user_id = 14 AND LOWER(email) = 'alzahraa7842@gmail.com'`
      );
      await pool.query(
        `DELETE FROM at_users WHERE id = 14 AND LOWER(email) = 'alzahraa7842@gmail.com' AND password_hash IS NULL`
      );
      await pool.query(
        `INSERT INTO at_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        ['cleanup_smoke_and_seed14_v1', new Date().toISOString()]
      );
    }

    const adminResetCheck = await pool.query(`SELECT value FROM at_meta WHERE key = $1`, [
      'reset_admin_bootstrap_v2',
    ]);
    if (adminResetCheck.rows.length === 0) {
      await pool.query(`UPDATE at_users SET password_hash = NULL WHERE id = 1 AND role = 'ADMIN'`);
      await pool.query(
        `INSERT INTO at_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        ['reset_admin_bootstrap_v2', new Date().toISOString()]
      );
    }

    const assetMigrationCheck = await pool.query(`SELECT value FROM at_meta WHERE key = $1`, [
      'normalize_asset_urls_v1',
    ]);
    if (assetMigrationCheck.rows.length === 0) {
      const settingsRow = await pool.query(`SELECT data FROM at_school_settings WHERE id = $1`, ['main']);
      if (settingsRow.rows[0]?.data) {
        const normalizedSettings = normalizeSettingsRecord(settingsRow.rows[0].data);
        await pool.query(
          `UPDATE at_school_settings SET data = $1 WHERE id = $2`,
          [JSON.stringify(normalizedSettings), 'main']
        );
      }

      await pool.query(
        `UPDATE at_users SET avatar = '/images/' || SUBSTRING(avatar FROM LENGTH('/src/assets/images/') + 1)
         WHERE avatar LIKE '/src/assets/images/%'`
      );
      await pool.query(
        `UPDATE at_alumni_profiles SET avatar = '/images/' || SUBSTRING(avatar FROM LENGTH('/src/assets/images/') + 1)
         WHERE avatar LIKE '/src/assets/images/%'`
      );
      await pool.query(
        `UPDATE at_guru_bk_profiles SET avatar = '/images/' || SUBSTRING(avatar FROM LENGTH('/src/assets/images/') + 1)
         WHERE avatar LIKE '/src/assets/images/%'`
      );
      await pool.query(
        `UPDATE at_forum_posts SET author_avatar = '/images/' || SUBSTRING(author_avatar FROM LENGTH('/src/assets/images/') + 1)
         WHERE author_avatar LIKE '/src/assets/images/%'`
      );

      await pool.query(
        `INSERT INTO at_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        ['normalize_asset_urls_v1', new Date().toISOString()]
      );
    }
    pgSchemaReady = true;
  })();

  try {
    await pgInitPromise;
  } catch (err) {
    pgInitPromise = null;
    throw err;
  }
}

async function writePgFullState(pool: Pool, state: DatabaseState): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const u of state.users) {
      await client.query(
        `INSERT INTO at_users (id, name, email, nisn, role, password_hash, avatar, is_active, is_google_user, receive_email_notifications, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.name,
          u.email.toLowerCase(),
          u.nisn || null,
          u.role,
          u.password_hash || null,
          u.avatar || '',
          u.isActive ?? true,
          Boolean(u.is_google_user),
          u.receive_email_notifications ?? true,
          u.created_at || new Date().toISOString(),
          u.updated_at || null,
        ]
      );
    }

    for (const p of state.profiles) {
      await client.query(
        `INSERT INTO at_alumni_profiles (
          id, user_id, name, nisn, angkatan, jurusan, email, phone, domisili,
          status_karir, status_tracer, avatar, linkedin_url, privacy_setting,
          is_google_user, receive_email_notifications,
          job_company, job_position, job_industry, job_location, job_start_date, job_type,
          edu_university, edu_major, edu_degree, edu_location, edu_start_year,
          biz_name, biz_field, biz_location, biz_start_year, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
        ) ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.user_id, p.name, p.nisn, p.angkatan, p.jurusan, p.email.toLowerCase(),
          p.phone || '', p.domisili || 'Jakarta', p.status_karir, p.status_tracer,
          p.avatar || '', p.linkedin_url || null, p.privacy_setting || 'PUBLIC',
          Boolean(p.is_google_user), p.receive_email_notifications ?? true,
          p.job_company || null, p.job_position || null, p.job_industry || null,
          p.job_location || null, p.job_start_date || null, p.job_type || null,
          p.edu_university || null, p.edu_major || null, p.edu_degree || null,
          p.edu_location || null, p.edu_start_year ?? null,
          p.biz_name || null, p.biz_field || null, p.biz_location || null,
          p.biz_start_year ?? null, p.created_at, p.updated_at,
        ]
      );
    }

    for (const h of state.histories) {
      await client.query(
        `INSERT INTO at_career_histories (id, alumni_id, year_start, year_end, is_current, position, company, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [h.id, h.alumni_id, h.year_start, h.year_end ?? null, h.is_current, h.position, h.company, h.description || null]
      );
    }

    for (const d of state.documents) {
      await client.query(
        `INSERT INTO at_documents (id, alumni_id, name, category, file_size_kb, upload_date, file_url, mime_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [d.id, d.alumni_id, d.name, d.category, d.file_size_kb, d.upload_date, d.file_url, d.mime_type]
      );
    }

    for (const s of state.surveys) {
      await client.query(
        `INSERT INTO at_tracer_surveys (id, title, description, target_angkatan, deadline, status, total_target, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.title, s.description, s.target_angkatan, s.deadline, s.status, s.total_target, s.created_at]
      );
    }

    for (const q of state.questions) {
      await client.query(
        `INSERT INTO at_tracer_questions (id, survey_id, question_text, question_type, options, required, sort_order, section)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [q.id, q.survey_id, q.question_text, q.question_type, JSON.stringify(q.options || []), q.required, q.order, q.section || null]
      );
    }

    for (const sub of state.submissions) {
      await client.query(
        `INSERT INTO at_tracer_submissions (id, survey_id, alumni_id, alumni_name, angkatan, jurusan, status, submitted_at, answers)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [sub.id, sub.survey_id, sub.alumni_id, sub.alumni_name, sub.angkatan, sub.jurusan, sub.status, sub.submitted_at, JSON.stringify(sub.answers || {})]
      );
    }

    for (const j of state.jobs) {
      await client.query(
        `INSERT INTO at_jobs (id, title, company, location, type, category, deadline, description, requirements, apply_url, contact_email, status, event_date, created_at, image, company_logo, posted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`,
        [j.id, j.title, j.company, j.location, j.type, j.category, j.deadline, j.description, j.requirements || null, j.apply_url || null, j.contact_email || null, j.status, j.event_date || null, j.created_at, j.image || null, j.company_logo || null, j.posted_by || null]
      );
    }

    for (const f of state.forum) {
      await client.query(
        `INSERT INTO at_forum_posts (id, author_id, author_name, author_role, author_avatar, title, content, category, likes, liked_by_uids, is_locked, created_at, comments)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [f.id, f.author_id, f.author_name, f.author_role, f.author_avatar || null, f.title, f.content, f.category, f.likes, JSON.stringify(f.liked_by_uids || []), f.is_locked, f.created_at, JSON.stringify(f.comments || [])]
      );
    }

    for (const n of state.notifications) {
      await client.query(
        `INSERT INTO at_notifications (id, user_id, target_role, title, message, type, is_read, read_by_uids, created_at, link)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [n.id, n.user_id ?? null, n.target_role || 'ALL', n.title, n.message, n.type, n.is_read, JSON.stringify(n.read_by_uids || []), n.created_at, n.link || null]
      );
    }

    for (const a of state.audit) {
      await client.query(
        `INSERT INTO at_audit_logs (id, user_name, user_role, activity, ip, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.user_name, a.user_role, a.activity, a.ip, a.timestamp]
      );
    }

    await client.query(
      `INSERT INTO at_school_settings (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      ['main', JSON.stringify(state.settings)]
    );

    for (const g of state.guruBk) {
      await client.query(
        `INSERT INTO at_guru_bk_profiles (id, name, nip, title, email, phone, city, avatar, is_default, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [g.id, g.name, g.nip || null, g.title, g.email || null, g.phone || null, g.city || null, g.avatar || '', Boolean(g.is_default), g.updated_at]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function readPgState(pool: Pool): Promise<DatabaseState> {
  await ensurePgInitialized(pool);

  const [
    usersRes,
    profilesRes,
    historiesRes,
    docsRes,
    surveysRes,
    questionsRes,
    subsRes,
    jobsRes,
    forumRes,
    notifsRes,
    auditRes,
    settingsRes,
    guruBkRes,
    emailLogsRes,
  ] = await Promise.all([
    pool.query('SELECT * FROM at_users ORDER BY id ASC'),
    pool.query('SELECT * FROM at_alumni_profiles ORDER BY id DESC'),
    pool.query('SELECT * FROM at_career_histories ORDER BY year_start DESC, id DESC'),
    pool.query('SELECT * FROM at_documents ORDER BY id DESC'),
    pool.query('SELECT * FROM at_tracer_surveys ORDER BY id ASC'),
    pool.query('SELECT * FROM at_tracer_questions ORDER BY sort_order ASC, id ASC'),
    pool.query('SELECT * FROM at_tracer_submissions ORDER BY id DESC'),
    pool.query('SELECT * FROM at_jobs ORDER BY id DESC'),
    pool.query('SELECT * FROM at_forum_posts ORDER BY id DESC'),
    pool.query('SELECT * FROM at_notifications ORDER BY id DESC'),
    pool.query('SELECT * FROM at_audit_logs ORDER BY id DESC'),
    pool.query('SELECT data FROM at_school_settings WHERE id = $1', ['main']),
    pool.query('SELECT * FROM at_guru_bk_profiles ORDER BY id ASC'),
    pool.query('SELECT * FROM at_email_logs ORDER BY sent_at DESC LIMIT 200'),
  ]);

  return {
    users: usersRes.rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      email: r.email,
      nisn: r.nisn || undefined,
      password_hash: r.password_hash || undefined,
      role: r.role,
      avatar: resolveAssetUrl(r.avatar || ''),
      isActive: Boolean(r.is_active),
      is_google_user: Boolean(r.is_google_user),
      receive_email_notifications: r.receive_email_notifications ?? true,
      created_at: r.created_at || undefined,
      updated_at: r.updated_at || undefined,
    })),
    profiles: profilesRes.rows.map((r) => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      name: r.name,
      nisn: r.nisn,
      angkatan: Number(r.angkatan),
      jurusan: r.jurusan,
      email: r.email,
      phone: r.phone || '',
      domisili: r.domisili || 'Jakarta',
      status_karir: r.status_karir,
      status_tracer: r.status_tracer,
      avatar: resolveAssetUrl(r.avatar || ''),
      linkedin_url: r.linkedin_url || undefined,
      privacy_setting: r.privacy_setting,
      is_google_user: Boolean(r.is_google_user),
      receive_email_notifications: r.receive_email_notifications ?? true,
      job_company: r.job_company || undefined,
      job_position: r.job_position || undefined,
      job_industry: r.job_industry || undefined,
      job_location: r.job_location || undefined,
      job_start_date: r.job_start_date || undefined,
      job_type: r.job_type || undefined,
      edu_university: r.edu_university || undefined,
      edu_major: r.edu_major || undefined,
      edu_degree: r.edu_degree || undefined,
      edu_location: r.edu_location || undefined,
      edu_start_year: r.edu_start_year ? Number(r.edu_start_year) : undefined,
      biz_name: r.biz_name || undefined,
      biz_field: r.biz_field || undefined,
      biz_location: r.biz_location || undefined,
      biz_start_year: r.biz_start_year ? Number(r.biz_start_year) : undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    histories: historiesRes.rows.map((r) => ({
      id: Number(r.id),
      alumni_id: Number(r.alumni_id),
      year_start: Number(r.year_start),
      year_end: r.year_end ? Number(r.year_end) : undefined,
      is_current: Boolean(r.is_current),
      position: r.position,
      company: r.company,
      description: r.description || undefined,
    })),
    documents: docsRes.rows.map((r) => ({
      id: Number(r.id),
      alumni_id: Number(r.alumni_id),
      name: r.name,
      category: r.category,
      file_size_kb: Number(r.file_size_kb),
      upload_date: r.upload_date,
      file_url: r.file_url,
      mime_type: r.mime_type,
    })),
    surveys: surveysRes.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      description: r.description,
      target_angkatan: Number(r.target_angkatan),
      deadline: r.deadline,
      status: r.status,
      total_target: Number(r.total_target),
      created_at: r.created_at,
    })),
    questions: questionsRes.rows.map((r) => ({
      id: Number(r.id),
      survey_id: Number(r.survey_id),
      question_text: r.question_text,
      question_type: r.question_type,
      options: Array.isArray(r.options) ? r.options : [],
      required: Boolean(r.required),
      order: Number(r.sort_order),
      section: r.section || undefined,
    })),
    submissions: subsRes.rows.map((r) => ({
      id: Number(r.id),
      survey_id: Number(r.survey_id),
      alumni_id: Number(r.alumni_id),
      alumni_name: r.alumni_name,
      angkatan: Number(r.angkatan),
      jurusan: r.jurusan,
      status: r.status,
      submitted_at: r.submitted_at,
      answers: r.answers || {},
    })),
    jobs: jobsRes.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      company: r.company,
      location: r.location,
      type: r.type,
      category: r.category,
      deadline: r.deadline,
      description: r.description,
      requirements: r.requirements || undefined,
      apply_url: r.apply_url || undefined,
      contact_email: r.contact_email || undefined,
      status: r.status,
      event_date: r.event_date || undefined,
      created_at: r.created_at,
      image: r.image || undefined,
      company_logo: r.company_logo || undefined,
      posted_by: r.posted_by || undefined,
    })),
    forum: forumRes.rows.map((r) => ({
      id: Number(r.id),
      author_id: Number(r.author_id),
      author_name: r.author_name,
      author_role: r.author_role,
      author_avatar: r.author_avatar ? resolveAssetUrl(r.author_avatar) : undefined,
      title: r.title,
      content: r.content,
      category: r.category,
      likes: Number(r.likes),
      liked_by_user: false,
      liked_by_uids: Array.isArray(r.liked_by_uids) ? r.liked_by_uids : [],
      is_locked: Boolean(r.is_locked),
      created_at: r.created_at,
      comments: Array.isArray(r.comments) ? r.comments : [],
    })),
    notifications: notifsRes.rows.map((r) => ({
      id: Number(r.id),
      user_id: r.user_id !== null ? Number(r.user_id) : undefined,
      target_role: r.target_role || 'ALL',
      title: r.title,
      message: r.message,
      type: r.type,
      is_read: Boolean(r.is_read),
      read_by_uids: Array.isArray(r.read_by_uids) ? r.read_by_uids : [],
      created_at: r.created_at,
      link: r.link || undefined,
    })),
    audit: auditRes.rows.map((r) => ({
      id: Number(r.id),
      user_name: r.user_name,
      user_role: r.user_role,
      activity: r.activity,
      ip: r.ip,
      timestamp: r.timestamp,
    })),
    settings: normalizeSettingsRecord(settingsRes.rows[0]?.data),
    guruBk:
      guruBkRes.rows.length > 0
        ? guruBkRes.rows.map((r) => ({
            id: Number(r.id),
            name: r.name,
            nip: r.nip || undefined,
            title: r.title,
            email: r.email || undefined,
            phone: r.phone || undefined,
            city: r.city || undefined,
            avatar: resolveAssetUrl(r.avatar || ''),
            is_default: Boolean(r.is_default),
            updated_at: r.updated_at,
          }))
        : [...INITIAL_GURU_BK_PROFILES],
    emailLogs: emailLogsRes.rows.map((r) => ({
      id: r.id,
      user_id: r.user_id !== null ? Number(r.user_id) : undefined,
      recipient_email: r.recipient_email,
      recipient_name: r.recipient_name,
      subject: r.subject,
      preview_text: r.preview_text || undefined,
      body_html: r.body_html,
      sent_at: r.sent_at,
      category: r.category || undefined,
      status: r.status,
      event_link: r.event_link || undefined,
      real_gmail_sent: Boolean(r.real_gmail_sent),
      gmail_compose_url: r.gmail_compose_url || undefined,
    })),
  };
}

export async function getDbState(): Promise<DatabaseState> {
  const pool = getPool();
  if (pool) {
    return readPgState(pool);
  }
  return readLocalState();
}

export async function mutateDb<T>(mutator: (state: DatabaseState, pool: Pool | null) => Promise<T> | T): Promise<T> {
  return serializeWrite(async () => {
    const pool = getPool();
    if (pool) {
      await ensurePgInitialized(pool);
      const current = await readPgState(pool);
      return await mutator(current, pool);
    } else {
      const current = readLocalState();
      const result = await mutator(current, null);
      writeLocalState(current);
      return result;
    }
  });
}

// Parameterized PG mutation helpers used by server routes when Neon DB is active
export const pgOps = {
  async upsertUser(pool: Pool, u: StoredUser) {
    await pool.query(
      `INSERT INTO at_users (id, name, email, nisn, role, password_hash, avatar, is_active, is_google_user, receive_email_notifications, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         nisn = EXCLUDED.nisn,
         role = EXCLUDED.role,
         password_hash = COALESCE(EXCLUDED.password_hash, at_users.password_hash),
         avatar = EXCLUDED.avatar,
         is_active = EXCLUDED.is_active,
         is_google_user = EXCLUDED.is_google_user,
         receive_email_notifications = EXCLUDED.receive_email_notifications,
         updated_at = EXCLUDED.updated_at`,
      [
        u.id,
        u.name,
        u.email.toLowerCase(),
        u.nisn || null,
        u.role,
        u.password_hash || null,
        u.avatar || '',
        u.isActive ?? true,
        Boolean(u.is_google_user),
        u.receive_email_notifications ?? true,
        u.created_at || new Date().toISOString(),
        u.updated_at || new Date().toISOString(),
      ]
    );
  },

  async upsertProfile(pool: Pool, p: AlumniProfile) {
    await pool.query(
      `INSERT INTO at_alumni_profiles (
        id, user_id, name, nisn, angkatan, jurusan, email, phone, domisili,
        status_karir, status_tracer, avatar, linkedin_url, privacy_setting,
        is_google_user, receive_email_notifications,
        job_company, job_position, job_industry, job_location, job_start_date, job_type,
        edu_university, edu_major, edu_degree, edu_location, edu_start_year,
        biz_name, biz_field, biz_location, biz_start_year, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        nisn = EXCLUDED.nisn,
        angkatan = EXCLUDED.angkatan,
        jurusan = EXCLUDED.jurusan,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        domisili = EXCLUDED.domisili,
        status_karir = EXCLUDED.status_karir,
        status_tracer = EXCLUDED.status_tracer,
        avatar = EXCLUDED.avatar,
        linkedin_url = EXCLUDED.linkedin_url,
        privacy_setting = EXCLUDED.privacy_setting,
        receive_email_notifications = EXCLUDED.receive_email_notifications,
        job_company = EXCLUDED.job_company,
        job_position = EXCLUDED.job_position,
        job_industry = EXCLUDED.job_industry,
        job_location = EXCLUDED.job_location,
        job_start_date = EXCLUDED.job_start_date,
        job_type = EXCLUDED.job_type,
        edu_university = EXCLUDED.edu_university,
        edu_major = EXCLUDED.edu_major,
        edu_degree = EXCLUDED.edu_degree,
        edu_location = EXCLUDED.edu_location,
        edu_start_year = EXCLUDED.edu_start_year,
        biz_name = EXCLUDED.biz_name,
        biz_field = EXCLUDED.biz_field,
        biz_location = EXCLUDED.biz_location,
        biz_start_year = EXCLUDED.biz_start_year,
        updated_at = EXCLUDED.updated_at`,
      [
        p.id, p.user_id, p.name, p.nisn, p.angkatan, p.jurusan, p.email.toLowerCase(),
        p.phone || '', p.domisili || 'Jakarta', p.status_karir, p.status_tracer,
        p.avatar || '', p.linkedin_url || null, p.privacy_setting || 'PUBLIC',
        Boolean(p.is_google_user), p.receive_email_notifications ?? true,
        p.job_company || null, p.job_position || null, p.job_industry || null,
        p.job_location || null, p.job_start_date || null, p.job_type || null,
        p.edu_university || null, p.edu_major || null, p.edu_degree || null,
        p.edu_location || null, p.edu_start_year ?? null,
        p.biz_name || null, p.biz_field || null, p.biz_location || null,
        p.biz_start_year ?? null, p.created_at, p.updated_at,
      ]
    );
  },

  async getMeta(key: string): Promise<string | null> {
    const pool = getPool();
    if (!pool) return null;
    await ensurePgInitialized(pool);
    const res = await pool.query('SELECT value FROM at_meta WHERE key = $1', [key]);
    return res.rows[0]?.value ?? null;
  },

  async setMeta(key: string, value: string): Promise<void> {
    const pool = getPool();
    if (!pool) return;
    await ensurePgInitialized(pool);
    await pool.query(
      `INSERT INTO at_meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  },
};
