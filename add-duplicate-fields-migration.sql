-- Migration: Add duplicate detection fields to bibliography_references table
-- Run this in Neon SQL Editor to add duplicate tracking support

-- Add duplicate_group_id column (links references that are duplicates)
ALTER TABLE bibliography_references 
ADD COLUMN IF NOT EXISTS duplicate_group_id VARCHAR(255) DEFAULT NULL;

-- Add is_primary_duplicate column (marks which reference in a group is the primary one)
ALTER TABLE bibliography_references 
ADD COLUMN IF NOT EXISTS is_primary_duplicate BOOLEAN DEFAULT false;

-- Create index for faster duplicate group queries
CREATE INDEX IF NOT EXISTS idx_bibliography_references_duplicate_group 
ON bibliography_references(duplicate_group_id) WHERE duplicate_group_id IS NOT NULL;

-- Update any existing 'duplicate' status references to have a temporary group ID
-- (This will be fixed by the new duplicate detection algorithm on next analysis)
UPDATE bibliography_references 
SET duplicate_group_id = 'legacy-dup-' || id::TEXT
WHERE status = 'duplicate' AND duplicate_group_id IS NULL;

-- Log completion
SELECT 
    COUNT(*) as total_references,
    COUNT(CASE WHEN duplicate_group_id IS NOT NULL THEN 1 END) as duplicate_references,
    COUNT(CASE WHEN is_primary_duplicate = true THEN 1 END) as primary_duplicates
FROM bibliography_references;
