-- RefCheck Database Schema - Step by Step
-- Run each section separately if you encounter issues

-- ============================================
-- STEP 1: Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 2: Create base tables (users and jobs)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_expires TIMESTAMP,
    total_checks INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    total_references INTEGER DEFAULT 0,
    verified_references INTEGER DEFAULT 0,
    error_message TEXT,
    completed_at TIMESTAMP
);

-- ============================================
-- STEP 3: Create references table
-- ============================================

CREATE TABLE IF NOT EXISTS references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    bibtex_key VARCHAR(255),
    original_title TEXT,
    original_authors TEXT,
    original_year INTEGER,
    original_source TEXT,
    canonical_title TEXT,
    canonical_authors TEXT,
    canonical_year INTEGER,
    corrected_title TEXT,
    corrected_authors TEXT,
    corrected_year INTEGER,
    status VARCHAR(50),
    confidence_score INTEGER,
    venue TEXT,
    doi VARCHAR(255),
    is_retracted BOOLEAN DEFAULT FALSE,
    cited_by_count INTEGER,
    google_scholar_url TEXT,
    openalex_url TEXT,
    crossref_url TEXT,
    semantic_scholar_url TEXT,
    user_decision VARCHAR(20),
    duplicate_group_id UUID,
    duplicate_group_count INTEGER,
    is_primary_duplicate BOOLEAN DEFAULT FALSE,
    issues JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 4: Create supporting tables
-- ============================================

CREATE TABLE IF NOT EXISTS verification_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id UUID NOT NULL REFERENCES references(id) ON DELETE CASCADE,
    source_name VARCHAR(50) NOT NULL,
    found BOOLEAN DEFAULT FALSE,
    confidence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reference_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_id UUID NOT NULL REFERENCES references(id) ON DELETE CASCADE,
    issue_text TEXT NOT NULL,
    issue_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_format VARCHAR(20),
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 5: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_upload_time ON jobs(upload_time);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_references_job_id ON references(job_id);
CREATE INDEX IF NOT EXISTS idx_references_status ON references(status);
CREATE INDEX IF NOT EXISTS idx_references_doi ON references(doi);
CREATE INDEX IF NOT EXISTS idx_references_duplicate_group ON references(duplicate_group_id);
CREATE INDEX IF NOT EXISTS idx_references_job_status ON references(job_id, status);
CREATE INDEX IF NOT EXISTS idx_references_user_decision ON references(user_decision);

CREATE INDEX IF NOT EXISTS idx_verification_sources_reference_id ON verification_sources(reference_id);
CREATE INDEX IF NOT EXISTS idx_verification_sources_source_name ON verification_sources(source_name);

CREATE INDEX IF NOT EXISTS idx_reference_issues_reference_id ON reference_issues(reference_id);

CREATE INDEX IF NOT EXISTS idx_export_history_job_id ON export_history(job_id);
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON export_history(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_job_id ON activity_log(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- ============================================
-- STEP 6: Create triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_references_updated_at ON references;
CREATE TRIGGER update_references_updated_at BEFORE UPDATE ON references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: Create views
-- ============================================

CREATE OR REPLACE VIEW job_summary AS
SELECT 
    j.id,
    j.user_id,
    j.file_name,
    j.status,
    j.upload_time,
    j.total_references,
    COUNT(CASE WHEN r.status = 'verified' THEN 1 END) as verified_count,
    COUNT(CASE WHEN r.status = 'warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN r.status = 'error' THEN 1 END) as error_count,
    COUNT(CASE WHEN r.is_retracted = TRUE THEN 1 END) as retracted_count,
    COUNT(CASE WHEN r.duplicate_group_id IS NOT NULL THEN 1 END) as duplicate_count,
    COUNT(CASE WHEN r.user_decision = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN r.user_decision = 'rejected' THEN 1 END) as rejected_count
FROM jobs j
LEFT JOIN references r ON j.id = r.job_id
GROUP BY j.id, j.user_id, j.file_name, j.status, j.upload_time, j.total_references;

-- ============================================
-- Verify tables created
-- ============================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should show 7 tables:
-- 1. activity_log
-- 2. export_history
-- 3. jobs
-- 4. reference_issues
-- 5. references
-- 6. users
-- 7. verification_sources
