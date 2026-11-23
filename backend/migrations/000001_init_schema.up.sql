-- PostgreSQL Migration for AlumniTrack
-- Rekap Karir Alumni & Tracer Study

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nisn VARCHAR(50) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ALUMNI',
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS alumni (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nisn VARCHAR(50) UNIQUE NOT NULL,
    angkatan INTEGER NOT NULL,
    jurusan VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    domisili VARCHAR(100),
    status_karir VARCHAR(50) DEFAULT 'Mencari Kerja',
    status_tracer VARCHAR(50) DEFAULT 'Belum Mengisi',
    avatar VARCHAR(500),
    linkedin_url VARCHAR(500),
    privacy_setting VARCHAR(50) DEFAULT 'PUBLIC',
    job_company VARCHAR(255),
    job_position VARCHAR(255),
    job_industry VARCHAR(255),
    job_location VARCHAR(255),
    job_start_date VARCHAR(50),
    job_type VARCHAR(50),
    edu_university VARCHAR(255),
    edu_major VARCHAR(255),
    edu_degree VARCHAR(50),
    edu_location VARCHAR(255),
    edu_start_year INTEGER,
    biz_name VARCHAR(255),
    biz_field VARCHAR(255),
    biz_location VARCHAR(255),
    biz_start_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS career_histories (
    id SERIAL PRIMARY KEY,
    alumni_id INTEGER NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    year_start INTEGER NOT NULL,
    year_end INTEGER,
    is_current BOOLEAN DEFAULT FALSE,
    position VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_attachments (
    id SERIAL PRIMARY KEY,
    alumni_id INTEGER NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    file_size_kb INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracer_surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_angkatan INTEGER NOT NULL,
    deadline VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'Aktif',
    total_target INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS tracer_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES tracer_surveys(id) ON DELETE CASCADE,
    section VARCHAR(255),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options_json TEXT,
    required BOOLEAN DEFAULT TRUE,
    "order" INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracer_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES tracer_surveys(id) ON DELETE CASCADE,
    alumni_id INTEGER NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Sudah Mengisi',
    answers_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    deadline VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    apply_url VARCHAR(500),
    contact_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    likes INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS forum_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    activity VARCHAR(500) NOT NULL,
    ip VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
