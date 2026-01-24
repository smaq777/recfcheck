/**
 * Neon PostgreSQL Database Schema
 * Tables for storing bibliography analysis results and user data
 * 
 * Run this script in Neon console or via your app on first load
 */

// SQL Schema to execute in Neon
export const dbSchema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  password_hash VARCHAR(255),
  verification_code VARCHAR(255),
  verification_code_expires TIMESTAMP,
  password_reset_code VARCHAR(255),
  password_reset_expires TIMESTAMP,
  subscription_plan VARCHAR(50) DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis jobs/sessions
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  total_references INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  issues_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bibliography references extracted from files
CREATE TABLE IF NOT EXISTS bibliography_references (
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
CREATE TABLE IF NOT EXISTS openalex_cache (
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
`;

export interface User {
  id: string;
  email: string;
  display_name: string;
  photo_url: string;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  email_verified: boolean;
  created_at: string;
}

export interface AnalysisJob {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_references: number;
  verified_count: number;
  issues_count: number;
  warnings_count: number;
  created_at: string;
  updated_at: string;
}

export interface BibliographyReference {
  id: string;
  job_id: string;
  user_id: string;
  bibtex_key: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  doi?: string;
  url?: string;
  status: 'pending' | 'verified' | 'issue' | 'retracted';
  confidence_score: number;
  canonical_title?: string;
  canonical_year?: number;
  venue?: string;
  issues: string[];
  is_retracted: boolean;
  ai_insight?: string;
  created_at: string;
  updated_at: string;
}

export interface OpenAlexCache {
  id: string;
  query_title: string;
  response: any;
  cached_at: string;
  expires_at: string;
}
