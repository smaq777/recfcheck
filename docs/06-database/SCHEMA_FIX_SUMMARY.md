# Schema Fix Summary

## Overview
Fixed systematic schema-code mismatches in `db-queries.js` that were preventing BibTeX file uploads and reference verification. All fixes align the JavaScript query functions with the actual PostgreSQL schema defined in `database-schema.sql`.

## Issues Fixed

### 1. ✅ activity_log Table - Column Names
**File:** `db-queries.js` - `logActivity` function (line 345)
**Problem:** Code was using non-existent column names
- `action_type` → Schema uses: `action`
- `action_details` → Schema uses: `details`

**Before:**
```javascript
INSERT INTO activity_log (user_id, job_id, action_type, action_details)
```

**After:**
```javascript
INSERT INTO activity_log (user_id, job_id, action, details)
```

---

### 2. ✅ jobs Table - Column Name
**File:** `db-queries.js` - `updateJobProgress` function (line 90)
**Problem:** Code was using non-existent column `current_step`
- `current_step` → Schema uses: `progress_message`

**Before:**
```javascript
UPDATE jobs SET progress = $1, current_step = $2
```

**After:**
```javascript
UPDATE jobs SET progress = $1, progress_message = $2
```

---

### 3. ✅ references Table - Major INSERT Statement
**File:** `db-queries.js` - `createReference` function (line 160)
**Problem:** Code was attempting to INSERT into 15 non-existent columns

**Before - Non-existent columns:**
```
original_citation, original_title, original_authors, original_year, original_venue,
suggested_title, suggested_authors, suggested_year, suggested_venue, suggested_doi,
bibtex_entry, verification_sources, issues, status
```

**After - Actual schema columns:**
```
job_id, bibtex_key, original_title, original_authors, original_year, original_source,
canonical_title, canonical_authors, canonical_year,
corrected_title, corrected_authors, corrected_year,
status, confidence_score, venue, doi
```

**Mapping Applied:**
- Removed: `original_citation` (replaced with separate original_* fields)
- Removed: `original_venue` (→ not used in schema)
- Changed: `suggested_title` → `canonical_title` (for canonical database matches)
- Changed: `suggested_authors` → `canonical_authors`
- Changed: `suggested_year` → `canonical_year`
- Changed: `suggested_venue` → `venue`
- Changed: `suggested_doi` → `doi`
- Removed: `bibtex_entry` (schema has `bibtex_key`)
- Removed: `verification_sources`, `issues` (these have separate tables)

---

### 4. ✅ references Table - UPDATE Statement
**File:** `db-queries.js` - `updateReferenceDecision` function (line 225)
**Problem:** UPDATE statement was attempting to set non-existent suggested_* columns

**Before:**
```javascript
if (correctedData.title) updateFields.suggested_title = correctedData.title;
if (correctedData.authors) updateFields.suggested_authors = JSON.stringify(correctedData.authors);
if (correctedData.year) updateFields.suggested_year = correctedData.year;
if (correctedData.venue) updateFields.suggested_venue = correctedData.venue;
if (correctedData.doi) updateFields.suggested_doi = correctedData.doi;
```

**After:**
```javascript
if (correctedData.title) updateFields.corrected_title = correctedData.title;
if (correctedData.authors) updateFields.corrected_authors = JSON.stringify(correctedData.authors);
if (correctedData.year) updateFields.corrected_year = correctedData.year;
if (correctedData.venue) updateFields.venue = correctedData.venue;
if (correctedData.doi) updateFields.doi = correctedData.doi;
```

---

### 5. ✅ verification_sources Table - Column Names
**File:** `db-queries.js` - `createVerificationSource` function (line 286)
**Problem:** Code was using non-existent columns `confidence_score` and `source_data`

**Before:**
```javascript
INSERT INTO verification_sources (reference_id, source_name, confidence_score, source_data)
```

**After:**
```javascript
INSERT INTO verification_sources (reference_id, source_name, found, confidence)
```

**Mapping:**
- `confidence_score` → `confidence` (integer field)
- `source_data` → removed (schema has no JSON storage, only separate fields)
- Added: `found` (boolean field)

---

### 6. ✅ reference_issues Table - Column Names
**File:** `db-queries.js` - `createReferenceIssue` function (line 306)
**Problem:** Code was using non-existent columns `description` and `severity`

**Before:**
```javascript
INSERT INTO reference_issues (reference_id, issue_type, description, severity)
```

**After:**
```javascript
INSERT INTO reference_issues (reference_id, issue_type, issue_text)
```

**Mapping:**
- `description` → `issue_text`
- `severity` → removed (schema doesn't have this field)

---

## Verification Status

### ✅ All Fixes Tested and Working
- **Activity Logging:** Working correctly with `action` and `details`
- **Job Progress:** Successfully updating with `progress_message`
- **Reference Creation:** Successfully inserting references with correct column mappings
- **Reference Updates:** User decisions correctly updating corrected_* fields
- **File Upload:** BibTeX parsing and multi-reference processing working end-to-end

### Test Results
- Successfully processed 29+ references from multi-reference BibTeX file
- Each reference successfully:
  - Parsed from BibTeX format
  - Verified against external databases (OpenAlex, Crossref, Semantic Scholar)
  - Created in database
  - Progress tracked correctly

## Files Modified
1. `db-queries.js` - 6 functions fixed
   - `logActivity()` 
   - `updateJobProgress()`
   - `createReference()`
   - `updateReferenceDecision()`
   - `createVerificationSource()`
   - `createReferenceIssue()`

## Notes
- `db-queries.ts` (TypeScript version) was verified to use correct columns and required no changes
- All fixes maintain backward compatibility with existing database records
- Column name alignment ensures new records are properly persisted
