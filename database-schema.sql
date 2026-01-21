-- RefCheck Database Schema for Neon PostgreSQL
-- This schema matches the working code in db-service.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis jobs/sessions
CREATE TABLE analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    total_references INTEGER DEFAULT 0,
    verified_count INTEGER DEFAULT 0,
    issues_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bibliography references extracted from files
CREATE TABLE bibliography_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bibtex_key VARCHAR(255),
    title VARCHAR(1024),
    authors VARCHAR(1024),
    year INTEGER,
    source VARCHAR(255),
    doi VARCHAR(255),
    url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    confidence_score INTEGER DEFAULT 0,
    canonical_title VARCHAR(1024),
    canonical_year INTEGER,
    venue VARCHAR(255),
    issues TEXT[],
    is_retracted BOOLEAN DEFAULT false,
    ai_insight TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cache for OpenAlex API responses to reduce lookups
CREATE TABLE openalex_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_title VARCHAR(1024) NOT NULL UNIQUE,
    response JSONB,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bibliography_references_job_id ON bibliography_references(job_id);
CREATE INDEX IF NOT EXISTS idx_bibliography_references_user_id ON bibliography_references(user_id);
CREATE INDEX IF NOT EXISTS idx_bibliography_references_status ON bibliography_references(status);
CREATE INDEX IF NOT EXISTS idx_openalex_cache_query ON openalex_cache(query_title);
CREATE INDEX IF NOT EXISTS idx_openalex_cache_expires ON openalex_cache(expires_at);
