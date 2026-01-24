# API Audit Report - RefCheck System

## Current APIs

### 1. Internal Endpoints

#### POST `/api/analyze`
**Purpose:** Upload file and start analysis  
**Input:** 
- File (multipart/form-data)
- Authorization header (Bearer token)

**Output:**
```json
{
  "success": true,
  "jobId": "uuid",
  "references": 12,
  "message": "Analysis started for 12 references"
}
```

**Background Process:** Parses file → Verifies each reference → Saves to database

---

#### GET `/api/results?jobId={uuid}`
**Purpose:** Get analysis results  
**Input:** jobId query parameter

**Current Output:**
```json
{
  "success": true,
  "jobId": "uuid",
  "status": "completed",
  "fileName": "file.bib",
  "references": [
    {
      "id": "uuid",
      "bibtex_key": "Kim2014",
      "original_title": "...",
      "original_authors": "...",
      "original_year": 2014,
      "canonical_title": "...",
      "canonical_authors": "...",
      "canonical_year": 2014,
      "status": "verified|warning|issue|retracted",
      "confidence_score": 100,
      "venue": "Journal Name",
      "doi": "10.1109/...",
      "is_retracted": false,
      "cited_by_count": null,
      "google_scholar_url": null,
      "openalex_url": null,
      "crossref_url": null,
      "semantic_scholar_url": null
    }
  ],
  "totalReferences": 12,
  "verifiedCount": 10,
  "issuesCount": 2
}
```

**PROBLEM:** External URL fields are all NULL - need to populate from verification data

---

### 2. External API Integrations

#### OpenAlex API
**Endpoint:** `https://api.openalex.org/works`  
**Search:** `filter=title.search:{query}`  
**FREE** - No API key required

**Returns Rich Data:**
- ✅ Title
- ✅ Full author list with affiliations
- ✅ Publication year
- ✅ DOI
- ✅ Citation count
- ✅ Venue (journal/conference)
- ✅ Is retracted
- ✅ Open access status
- ✅ OpenAlex URL
- ✅ Author affiliations/institutions

**Current Usage:** Only extracting basic fields - NOT saving URLs or citation counts!

---

#### Crossref API  
**Endpoint:** `https://api.crossref.org/works`  
**Search:** `query.title={query}`  
**FREE** - Just needs email in query

**Returns Rich Data:**
- ✅ Title
- ✅ Full author list
- ✅ Publication year
- ✅ DOI
- ✅ Publisher
- ✅ Venue
- ✅ Citation count (`is-referenced-by-count`)
- ✅ Relevance score
- ✅ Retraction status
- ✅ Abstract (sometimes)
- ✅ License information

**Current Usage:** Only extracting basic fields - NOT saving citation counts or URLs!

---

#### Semantic Scholar API
**Endpoint:** `https://api.semanticscholar.org/graph/v1/paper/search`  
**Search:** `query={title}`  
**FREE** - No API key for basic use

**Returns Rich Data:**
- ✅ Title
- ✅ Authors
- ✅ Year
- ✅ DOI
- ✅ Citation count
- ✅ Influential citation count
- ✅ S2 paper URL
- ✅ Abstract
- ✅ Venue

**Current Usage:** Only extracting basic fields!

---

## Critical Data Loss Issues

### Issue #1: External URLs Not Saved ❌
**What's Returned by APIs:**
```javascript
{
  openalex_url: "https://openalex.org/W1234567",
  crossref_url: "https://doi.org/10.1109/...",
  semantic_scholar_url: "https://www.semanticscholar.org/paper/abc123"
}
```

**What's in Database:** `NULL, NULL, NULL`

**Why:** The `crossValidateReference()` function returns these URLs, but they're NOT being saved to the database!

**Fix Required:** Update `createReference()` to save these URLs

---

### Issue #2: Citation Counts Not Saved ❌
**What's Available:**
- OpenAlex: `cited_by_count` (most accurate)
- Crossref: `is-referenced-by-count`
- Semantic Scholar: `citationCount` + `influentialCitationCount`

**What's in Database:** `null`

**Why:** Not being passed to `createReference()`

**Fix Required:** Save citation counts from best source

---

### Issue #3: Duplicate Detection Not Working ❌
**Current Algorithm:**
```javascript
// In dev-server.js around line 950
const duplicateGroups = detectDuplicates(verifiedReferences);
```

**Problem:** The `detectDuplicates()` function exists BUT the duplicate status is NOT being saved to the database!

**What Should Happen:**
1. After all references verified
2. Run duplicate detection
3. Mark duplicates in database with:
   - `status = 'duplicate'`
   - `duplicate_group_id = first_ref_id`
   - `duplicate_group_count = total_in_group`

**Fix Required:** Save duplicate status to database

---

### Issue #4: Reference Detail Drawer Missing Data ❌
**Frontend Expects:**
```javascript
{
  original_title: "User's title",
  original_authors: "User's authors",
  canonical_title: "Database verified title",
  canonical_authors: "Database verified authors",
  issues: ["TITLE MISMATCH", "YEAR DISCREPANCY"],
  google_scholar_url: "...",
  openalex_url: "...",
  doi: "..."
}
```

**What's Actually Returned:** 
- ✅ original_title (NOW FIXED)
- ✅ canonical_title
- ❌ issues array is empty
- ❌ All URLs are NULL

**Root Cause:** Issues are computed during verification but NOT saved to database

---

## Action Items

### Priority 1: Save Verification URLs
Update `createReference()` in `db-queries.js` to accept and save:
- `google_scholar_url`
- `openalex_url`  
- `crossref_url`
- `semantic_scholar_url`

### Priority 2: Save Citation Counts
Add `cited_by_count` to database insert

### Priority 3: Save Issues Array
The `issues` array from `crossValidateReference()` must be saved to database

### Priority 4: Fix Duplicate Detection
After all references processed:
1. Run `detectDuplicates()`
2. Update database with duplicate status
3. Return marked duplicates in `/api/results`

### Priority 5: Verify Year Matching
Check if year comparison logic is correct:
```javascript
const yearMatch = reference.year === match.publication_year;
```

Should we allow ±1 year tolerance for pre-prints?

---

## API Endpoint Enrichment Plan

### Enhanced `/api/results` Response
```json
{
  "references": [
    {
      // CURRENT FIELDS (✅ Working)
      "original_title": "...",
      "canonical_title": "...",
      "status": "verified",
      "confidence_score": 95,
      
      // MISSING FIELDS (❌ Need to Add)
      "issues": ["TITLE MISMATCH", "ADD DOI"],
      "cited_by_count": 142,
      "google_scholar_url": "https://scholar.google.com/...",
      "openalex_url": "https://openalex.org/W1234",
      "crossref_url": "https://doi.org/10.1109/...",
      "semantic_scholar_url": "https://www.semanticscholar.org/...",
      
      // DUPLICATE DETECTION (❌ Need to Fix)
      "duplicate_group_id": "uuid",
      "duplicate_group_count": 3,
      "is_primary_duplicate": true,
      
      // ADDITIONAL METADATA (🔄 Available but not used)
      "open_access": false,
      "publisher": "IEEE",
      "abstract": "..." // From Semantic Scholar
    }
  ]
}
```

---

## Database Schema Verification

### Current `references` Table
```sql
original_title TEXT,
original_authors TEXT,
original_year INTEGER,
canonical_title TEXT,
canonical_authors TEXT,
canonical_year INTEGER,
status VARCHAR,
confidence_score INTEGER,
venue TEXT,
doi VARCHAR,
is_retracted BOOLEAN,
cited_by_count INTEGER,         -- ✅ Column EXISTS
google_scholar_url TEXT,        -- ✅ Column EXISTS
openalex_url TEXT,              -- ✅ Column EXISTS
crossref_url TEXT,              -- ✅ Column EXISTS
semantic_scholar_url TEXT,      -- ✅ Column EXISTS
duplicate_group_id UUID,        -- ✅ Column EXISTS
duplicate_group_count INTEGER,  -- ✅ Column EXISTS
is_primary_duplicate BOOLEAN    -- ✅ Column EXISTS
```

**Good News:** All columns already exist in database!  
**Bad News:** Data is not being inserted into them!

---

## Next Steps

1. ✅ Fix field name mapping (COMPLETED - camelCase vs snake_case)
2. 🔄 Add missing fields to `createReference()` call
3. 🔄 Save issues array to database
4. 🔄 Save verification URLs
5. 🔄 Implement duplicate marking in database
6. 🔄 Test with real file upload

