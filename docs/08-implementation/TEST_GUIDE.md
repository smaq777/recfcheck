# Quick Test Guide - Reference Count & Results Page

## Current Status

**What's Working:**
✅ Advanced results page with professional design
✅ Real-time reference count logging
✅ Job verification on loading results
✅ Enhanced debugging across all pages

**What to Test:**
1. Accurate reference count display
2. All 60 references appearing in results table
3. Advanced results page UI rendering correctly
4. Filtering and search functionality

## Step-by-Step Test

### Step 1: Prepare Your Test File
1. Use a .bib file with exactly 60 references
2. Or use the file you uploaded that showed the mismatch

### Step 2: Clear Old Data
```javascript
// Open browser console (F12) and paste:
localStorage.removeItem('refcheck_user');
localStorage.removeItem('current_job_id');
localStorage.removeItem('current_file_name');
localStorage.removeItem('recent_jobs');
console.log('Local storage cleared. Reload page.');
```

### Step 3: Upload File
1. Go to **New Check** page
2. Upload your .bib file
3. **Open browser console immediately** to see logs

### Step 4: Monitor Upload
In the console, you should see:
```
[NewCheck] Auth headers being sent: {Authorization: 'Bearer ...', X-User-ID: '...'}
[NewCheck] Job ID saved to localStorage: {
  jobId: "abc123...",
  totalReferences: 60,  ← Should match actual count
  fileName: "your-file.bib",
  timestamp: "2024-01-15T10:30:45.123Z"
}
```

**If you see different number:** Write it down - this is what the server parsed

### Step 5: Watch Processing Page
The page should show:
```
Analyzing 60 References
Progress: 0% → 100%
```

**Monitor terminal** - you should see:
```
✅ File parsed: your-file.bib
📊 References found: 60
💾 Job created in database with ID: abc123...
```

**In console, look for:**
```
[ProcessingProgress] Starting with job: {jobId: "abc123...", fileName: "your-file.bib"}
[ProcessingProgress] Job verification COMPLETE: {
  jobId: "abc123...",
  storedJobId: "abc123...",  ← Must match!
  fileName: "your-file.bib",
  totalReferences: 60,       ← Must match upload!
  status: "processing",
  actualReferencesInDb: 0,   ← Will increase as processing continues
  verified: "MATCHES"        ← This must say MATCHES
}
```

### Step 6: Navigate to Results
After processing completes (~1-2 min for 60 references):
- UI auto-navigates to Results page
- Console should show:
```
[ResultsAdvanced] Fetched job data: {
  jobId: "abc123...",
  totalReferences: 60,
  refCount: 60,  ← Actual count from database
  status: "completed"
}
```

### Step 7: Verify Results Table
1. You should see a table with 60 rows (paginated in groups)
2. Stats cards should show correct counts:
   - Verified: ~X references
   - Issues: ~Y references  
   - Warnings: ~Z references
3. Sum should equal 60

### Step 8: Test Filters
1. Click "All" → Should show all 60
2. Click "Verified" → Should show only green-checkmark references
3. Click "Issues (Y)" → Should show only red references
4. Click "Warnings" → Should show only yellow references

### Step 9: Test Search
1. Type author name in search box → Table filters
2. Type partial title → Table filters
3. Type BibTeX key → Table filters

### Step 10: Test Issue Details
1. Click on a reference with a red "Issues" status
2. Right panel should open showing:
   - Issue type (e.g., "Title Mismatch", "Missing DOI")
   - Your original entry
   - Database match (if found)
   - Auto-fix, Edit, and Ignore buttons

## Expected Behavior

### For 60-Reference File
- Processing should take 45-90 seconds (500ms per reference)
- Terminal should log: `[${i+1}/60] Verifying: "Title text..."` repeatedly
- Progress bar should move smoothly
- Final message: `✅ Job completed with 60 references`

### Reference Distribution
- Most should be "verified" (green checkmark)
- Some might be "warning" (yellow - e.g., slight mismatches)
- Some might be "issue" (red - missing DOI, title mismatch, etc.)
- Possibly some "duplicate" (same reference multiple times)

## Troubleshooting

### Issue: Shows 214 References Instead of 60

**Check 1: Job ID Mismatch**
```javascript
// In console:
localStorage.getItem('current_job_id')
// Should match the jobId from [NewCheck] upload logs
```

**Check 2: Old Job Still Loaded**
- Clear localStorage (see Step 2 above)
- Upload NEW file
- Don't go back to home page between steps

**Check 3: Database Has Old Data**
- Terminal logs should show: `📊 References found: 60`
- If terminal shows 60 but UI shows 214:
  - Check if using same job ID
  - Job ID should be NEW (from console after upload)

### Issue: Processing Takes Very Long

**Normal:** ~1-2 minutes for 60 references (500ms wait between each)

**If taking >5 minutes:**
- Check terminal for errors
- Backend might be rate-limited by OpenAlex API
- Try uploading smaller batch (10-20 references first)

### Issue: Results Page Won't Load

**Check:**
1. Are you on the Results page or still on Progress?
2. Open console → Any error messages?
3. Check job ID: `localStorage.getItem('current_job_id')`
4. Reload page - data should persist in localStorage

### Issue: Results Table Empty

**Check:**
1. Stats show correct total?
2. Try different filters
3. Check console for API errors
4. Verify `/api/results?jobId=X` returns data

## Performance Baseline

For measuring if fixes are working:

**Upload Phase:**
- File upload: <5 seconds
- Response with jobId: <1 second
- Job ID in localStorage: Immediate

**Processing Phase:**
- 60 references × 500ms = 30 seconds minimum
- + API response time = ~45-90 seconds
- SSE updates: Every 1-2 seconds

**Results Load:**
- Results page: <1 second (loads from localStorage first)
- Full data from API: <2 seconds

**Filtering/Search:**
- Filter change: <100ms
- Search input: <50ms (client-side)

## Console Logs to Watch

Copy this to track everything:
```javascript
// Watch for these prefixes:
// [NewCheck] - Upload and job creation
// [ProcessingProgress] - Real-time progress
// [ProcessingProgress] SSE - Streaming updates
// [ResultsAdvanced] - Results page data
// [Auth] - Authentication issues

// Search for these terms:
// "MISMATCH" - Job ID mismatch problem
// "totalReferences" - Reference count tracking
// "verified:" - Job verification process
// "completed" - When processing finishes
```

## Success Criteria

✅ Reference count matches what you uploaded
✅ All references appear in results table
✅ Stats cards show correct distribution
✅ Filtering works on all types
✅ Search finds references
✅ Issue detail panel opens with data
✅ No console errors (warnings OK)

## Report Back

If after testing you find issues, include:
1. **Exact reference count you uploaded:** _____
2. **Count shown in upload response:** _____
3. **Count shown in processing page:** _____
4. **Count in results stats:** _____
5. **Count in results table:** _____
6. **Console log snippets:** (paste relevant logs)
7. **Terminal log snippets:** (paste relevant logs)

This will help identify exactly where the count mismatch is happening.
