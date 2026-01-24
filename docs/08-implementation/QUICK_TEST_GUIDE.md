# Quick Test Guide - Results Page Fixes

## What Was Fixed

1. **BibTeX Parser** - Now correctly parses multi-line entries
2. **Import Path** - Fixed missing `api.ts` → `services.ts` import
3. **Field Mapping** - API now returns `original_title` instead of `title`
4. **Duplicate Detection** - Added automatic duplicate marking

## Test Now

### Step 1: Upload Test File
1. Go to http://localhost:3000
2. Log in or use demo account
3. Upload `test-bibliography.bib` or `direct-entry_corrected.bib`
4. Wait for analysis to complete

### Step 2: Verify Results Display
Check that each reference shows:
- ✅ Actual title (NOT "Untitled")
- ✅ Actual authors (NOT "Unknown")
- ✅ Actual year (NOT "2026")
- ✅ BibTeX key (NOT "no_key")
- ✅ Confidence score (NOT always "0%")

### Step 3: Test Reference Detail
Click on any reference and verify:
- **Summary Tab**: Shows title, authors, year, confidence
- **Differences Tab**: Shows original vs canonical comparison
- **Suggestions Tab**: Shows quick fixes if available
- **History Tab**: Shows modification history

### Step 4: Test Duplicate Detection
If your file has duplicates:
- ✅ Duplicates marked with orange "Duplicate" badge
- ✅ First occurrence shows "Primary" badge
- ✅ Duplicate count displayed

### Step 5: Test Filters & Search
- ✅ Click "All", "Verified", "Issues", "Warnings" filters
- ✅ Type in search box to filter references
- ✅ Sort by Title, Status, Confidence, Year

## Expected Issues (Still To Fix)

1. **Update Reference button** - Needs backend endpoint implementation
2. **History tab** - Requires audit trail table
3. **Confidence score calculation** - May need tuning

## If Something Still Doesn't Work

### Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors in red
4. Check Network tab for failed API calls

### Check API Server
1. Make sure `npm run dev:api` is running
2. Server should be on port 3001
3. Check terminal for error messages

### Check Database
1. Verify `DATABASE_URL` in `.env.local`
2. Check Neon dashboard for connection issues
3. Run `npm run init-db` if needed

## Quick Fixes

### If "CORS error":
```bash
# Restart dev servers
npm run dev:both
```

### If "Database connection failed":
```bash
# Check .env.local has DATABASE_URL
# Should look like: postgres://user:pass@host.neon.tech/db
```

### If "No references found":
```bash
# Check file format - must be valid BibTeX
# Entries must have title, author, year fields
```

## Next Upload Test

Upload a file with:
- At least 10 references
- Some duplicates
- Mix of @article, @book, @inproceedings
- Some with missing DOI

Expected behavior:
- All parsed correctly
- Duplicates detected and grouped
- Missing DOI flagged in suggestions
- Confidence scores vary based on API match

## Report Issues

If you find bugs:
1. Take screenshot of results page
2. Copy browser console errors
3. Note which reference is problematic
4. Check API response in Network tab
