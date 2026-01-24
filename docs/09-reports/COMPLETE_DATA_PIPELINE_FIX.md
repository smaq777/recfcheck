# Complete Data Pipeline Fix - RefCheck

**Date:** January 23, 2025  
**Status:** ✅ CODE COMPLETE - Database migration required

---

## 🎯 Problem Summary

The reference verification system was discarding rich external API data before saving to the database, resulting in:
- ❌ Issues array not displayed (title_mismatch, year_discrepancy, missing_doi, etc.)
- ❌ Citation counts not saved (cited_by_count)
- ❌ Verification URLs not saved (OpenAlex, Crossref, Semantic Scholar, Google Scholar)
- ❌ Duplicate detection running but status not saved to database
- ❌ Reference detail drawer showing empty data

---

## 🔍 Root Cause Analysis

### Data Flow Pipeline

```
1. User uploads file ✅
   ↓
2. BibTeX parser extracts references ✅
   ↓
3. crossValidateReference() calls 3 external APIs ✅
   - OpenAlex: Returns title, authors, DOI, citations, venue, retraction status, URLs
   - Crossref: Returns title, authors, DOI, publisher, citations, relevance score
   - Semantic Scholar: Returns title, authors, citations, abstract, paper URL
   ↓
4. Aggregated verification object created ✅
   {
     status: 'verified' | 'issue' | 'warning',
     confidence: 95,
     canonical_title: "...",
     canonical_authors: [...],
     canonical_year: 2023,
     issues: ['title_mismatch', 'year_discrepancy'],  // ❌ WAS NOT SAVED
     cited_by_count: 142,                             // ❌ WAS NOT SAVED
     google_scholar_url: "https://...",               // ❌ WAS NOT SAVED
     openalex_url: "https://...",                     // ❌ WAS NOT SAVED
     crossref_url: "https://...",                     // ❌ WAS NOT SAVED
     semantic_scholar_url: "https://...",             // ❌ WAS NOT SAVED
     venue: "Nature",
     doi: "10.1234/example",
     is_retracted: false
   }
   ↓
5. createReference() INSERT statement ❌ INCOMPLETE
   - Only inserted 16 out of 30 available fields
   - Missing: issues, cited_by_count, 4 URL fields
   ↓
6. Database gets NULLs for most fields ❌
   ↓
7. Frontend displays incomplete data ❌
```

---

## ✅ Solution Implemented

### 1. Added Missing Database Column

**File:** `migrations/add-issues-column.sql`

```sql
-- Add issues column to references table
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS issues JSONB DEFAULT '[]'::jsonb;

-- Add index for querying references with specific issues
CREATE INDEX IF NOT EXISTS idx_references_issues ON "references" USING gin (issues);

COMMENT ON COLUMN "references".issues IS 'Array of verification issues (title_mismatch, year_discrepancy, missing_doi, etc.)';
```

### 2. Updated createReference() Function

**File:** `db-queries.js`

**Before:** Only inserted 16 fields
**After:** Inserts all 30 fields including:
- ✅ `issues` (JSONB array)
- ✅ `cited_by_count` (integer)
- ✅ `google_scholar_url` (text)
- ✅ `openalex_url` (text)
- ✅ `crossref_url` (text)
- ✅ `semantic_scholar_url` (text)
- ✅ `duplicate_group_id` (uuid)
- ✅ `duplicate_group_count` (integer)
- ✅ `is_primary_duplicate` (boolean)
- ✅ `is_retracted` (boolean)

### 3. Updated dev-server.js Data Passing

**File:** `dev-server.js` (lines 890-920)

**Before:**
```javascript
const referenceData = {
  bibtexKey: ref.bibtex_key,
  originalTitle: ref.title,
  // ... only 16 fields
};
```

**After:**
```javascript
const referenceData = {
  bibtexKey: ref.bibtex_key,
  originalTitle: ref.title,
  originalAuthors: ref.authors,
  originalYear: ref.year,
  // ... ALL fields including:
  issues: verified.issues || [],
  cited_by_count: verified.cited_by_count,
  google_scholar_url: verified.google_scholar_url,
  openalex_url: verified.openalex_url,
  crossref_url: verified.crossref_url,
  semantic_scholar_url: verified.semantic_scholar_url,
  is_retracted: verified.is_retracted,
  // ... duplicate fields initialized as null
};
```

### 4. Implemented Duplicate Status Saving

**File:** `db-queries.js` - Added new function:

```javascript
export async function updateReferenceDuplicateStatus(referenceId, duplicateData)
```

**File:** `dev-server.js` (lines 935-980) - Replaced TODO comments with actual updates:

```javascript
// Mark duplicates with count info in database
for (const group of duplicateGroups) {
  const groupCount = group.length;
  const groupId = crypto.randomUUID(); // Unique ID for this duplicate group

  // Mark primary (first occurrence)
  await updateReferenceDuplicateStatus(primaryRef.id, {
    status: primaryRef.status,
    duplicate_group_id: groupId,
    duplicate_group_count: groupCount,
    is_primary_duplicate: true,
    issues: primaryRef.issues || []
  });

  // Mark rest as duplicates
  for (let i = 1; i < group.length; i++) {
    await updateReferenceDuplicateStatus(dupRef.id, {
      status: 'duplicate',
      duplicate_group_id: groupId,
      duplicate_group_count: groupCount,
      is_primary_duplicate: false,
      issues: [...dupIssues, 'Duplicate - appears X times in your bibliography']
    });
  }
}
```

---

## 🔧 Required Migration Steps

### Step 1: Apply Database Migration

**Option A: Using Neon Console (Recommended)**
1. Go to: https://console.neon.tech/app/projects/ancient-violet-40677397
2. Navigate to SQL Editor
3. Copy/paste content from `migrations/add-issues-column.sql`
4. Execute SQL

**Option B: Using psql CLI**
```bash
psql "postgresql://...[your-connection-string]" < migrations/add-issues-column.sql
```

### Step 2: Clear Old Job Data

```bash
# In browser console or clear-cache.html
localStorage.removeItem('current_job_id');
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Test Complete Pipeline

1. Upload test file (test-bibliography.bib)
2. Verify data displays:
   - ✅ Titles, authors, years, BibTeX keys
   - ✅ Issues array (check "Issues" column)
   - ✅ Citation counts
   - ✅ Verification URLs (in reference detail drawer)
   - ✅ Duplicate status (references marked as "duplicate")
3. Open reference detail drawer → Check tabs:
   - **Summary:** Should show canonical title, authors, venue, DOI, citation count
   - **Differences:** Should show issues array with specific problems
   - **Suggestions:** Should show verification URLs (OpenAlex, Crossref, etc.)
   - **History:** Should show verification sources

---

## 📊 Expected Results After Fix

### Before (Incomplete Data)
```json
{
  "id": "abc123",
  "original_title": "Machine Learning for Healthcare",
  "original_authors": "John Doe",
  "original_year": 2023,
  "canonical_title": "Machine Learning Applications in Healthcare Systems",
  "canonical_authors": "John Doe, Jane Smith",
  "canonical_year": 2023,
  "status": "verified",
  "confidence_score": 95,
  "venue": "Nature Medicine",
  "doi": "10.1038/s41591-023-01234-5",
  
  // ❌ Missing fields:
  "issues": null,                    // Should be []
  "cited_by_count": null,            // Should be 142
  "google_scholar_url": null,        // Should be "https://..."
  "openalex_url": null,              // Should be "https://..."
  "crossref_url": null,              // Should be "https://..."
  "semantic_scholar_url": null,      // Should be "https://..."
  "is_retracted": null,              // Should be false
  "duplicate_group_id": null,        // Should be UUID if duplicate
  "duplicate_group_count": null,     // Should be count if duplicate
  "is_primary_duplicate": null       // Should be boolean
}
```

### After (Complete Data)
```json
{
  "id": "abc123",
  "original_title": "Machine Learning for Healthcare",
  "original_authors": "John Doe",
  "original_year": 2023,
  "canonical_title": "Machine Learning Applications in Healthcare Systems",
  "canonical_authors": "John Doe, Jane Smith",
  "canonical_year": 2023,
  "status": "verified",
  "confidence_score": 95,
  "venue": "Nature Medicine",
  "doi": "10.1038/s41591-023-01234-5",
  
  // ✅ Now present:
  "issues": ["title_mismatch"],                          // Specific issues
  "cited_by_count": 142,                                 // From OpenAlex
  "google_scholar_url": "https://scholar.google.com/...", // Search URL
  "openalex_url": "https://openalex.org/W1234567890",    // Direct link
  "crossref_url": "https://api.crossref.org/works/...",  // API endpoint
  "semantic_scholar_url": "https://semanticscholar.org/paper/...", // Paper page
  "is_retracted": false,                                  // Safety check
  "duplicate_group_id": null,                            // UUID if duplicate
  "duplicate_group_count": null,                         // Count if duplicate
  "is_primary_duplicate": false                          // Primary marker
}
```

---

## 🧪 Testing Checklist

- [ ] Migration applied successfully (no SQL errors)
- [ ] Dev server starts without errors
- [ ] File upload works
- [ ] All 12 references display with titles/authors/years
- [ ] Issues column shows specific problems (not "N/A")
- [ ] Citation counts visible (when available from APIs)
- [ ] Reference detail drawer shows:
  - [ ] Canonical metadata in Summary tab
  - [ ] Issues array in Differences tab
  - [ ] Verification URLs in Suggestions tab (clickable links)
  - [ ] Verification sources in History tab
- [ ] Duplicate detection marks references:
  - [ ] Primary duplicate has `is_primary_duplicate: true`
  - [ ] Secondary duplicates have `status: 'duplicate'`
  - [ ] All duplicates share same `duplicate_group_id`
  - [ ] Duplicate count matches actual group size

---

## 📋 Files Modified

1. **migrations/add-issues-column.sql** - New migration file
2. **db-queries.js** - Updated `createReference()` + added `updateReferenceDuplicateStatus()`
3. **dev-server.js** - Pass complete verification data + implement duplicate saving

---

## 🚀 Next Steps

1. **Apply migration** (Step 1 above)
2. **Test with real data** - Upload a bibliography with known duplicates and issues
3. **Verify frontend display** - Check that all tabs in reference detail drawer show rich data
4. **Production deployment** - Apply same migration to production database before deploying code

---

## 🔗 Related Documentation

- [Database Schema](../06-database/DATABASE_SETUP.md)
- [API Audit Report](./API_AUDIT_REPORT.md)
- [Master PRD](../00-MASTER-PRD.md)

---

**Status:** ✅ Ready for testing after migration  
**Migration Required:** Yes - Run `migrations/add-issues-column.sql`  
**Breaking Changes:** None (backward compatible)
