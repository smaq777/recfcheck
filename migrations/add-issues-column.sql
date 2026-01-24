-- Add issues column to references table
-- This stores the array of verification issues found for each reference

ALTER TABLE "references" ADD COLUMN IF NOT EXISTS issues JSONB DEFAULT '[]'::jsonb;

-- Add index for querying references with specific issues
CREATE INDEX IF NOT EXISTS idx_references_issues ON "references" USING gin (issues);

COMMENT ON COLUMN "references".issues IS 'Array of verification issues (title_mismatch, year_discrepancy, missing_doi, etc.)';
