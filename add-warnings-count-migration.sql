-- Migration: Add warnings_count column to analysis_jobs table
-- Run this in Neon SQL Editor for EXISTING databases

-- Add warnings_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'analysis_jobs' 
        AND column_name = 'warnings_count'
    ) THEN
        ALTER TABLE analysis_jobs 
        ADD COLUMN warnings_count INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Column warnings_count added successfully';
    ELSE
        RAISE NOTICE 'Column warnings_count already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'analysis_jobs'
AND column_name IN ('verified_count', 'issues_count', 'warnings_count')
ORDER BY column_name;
