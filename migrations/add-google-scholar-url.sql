-- Add Google Scholar URL column to bibliography_references table
-- This stores pre-generated Google Scholar search URLs for manual verification

ALTER TABLE bibliography_references
ADD COLUMN IF NOT EXISTS google_scholar_url TEXT;

-- Create index for faster queries when filtering by Google Scholar URLs
CREATE INDEX IF NOT EXISTS idx_google_scholar_url 
ON bibliography_references(google_scholar_url) 
WHERE google_scholar_url IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN bibliography_references.google_scholar_url IS 
'Pre-generated Google Scholar search URL for manual verification (no API cost)';
