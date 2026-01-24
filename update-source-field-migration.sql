-- Migration: Increase source field size to handle detailed venue information
-- Run this in Neon SQL Editor if you already have the database created

-- Increase source field from VARCHAR(255) to VARCHAR(512)
ALTER TABLE bibliography_references 
ALTER COLUMN source TYPE VARCHAR(512);

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'bibliography_references' 
AND column_name = 'source';
