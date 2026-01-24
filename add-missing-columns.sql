-- Migration: Add missing columns to bibliography_references and references tables
-- Run this if your database is missing these columns

-- For bibliography_references table (Vercel/production)
ALTER TABLE bibliography_references 
ADD COLUMN IF NOT EXISTS canonical_authors TEXT,
ADD COLUMN IF NOT EXISTS issues JSONB,
ADD COLUMN IF NOT EXISTS cited_by_count INTEGER,
ADD COLUMN IF NOT EXISTS openalex_url TEXT,
ADD COLUMN IF NOT EXISTS crossref_url TEXT,
ADD COLUMN IF NOT EXISTS semantic_scholar_url TEXT,
ADD COLUMN IF NOT EXISTS google_scholar_url TEXT;

-- For references table (Local dev)
ALTER TABLE references 
ADD COLUMN IF NOT EXISTS issues JSONB;

-- Update existing NULL issues to empty array
UPDATE bibliography_references SET issues = '[]'::jsonb WHERE issues IS NULL;
UPDATE references SET issues = '[]'::jsonb WHERE issues IS NULL;
