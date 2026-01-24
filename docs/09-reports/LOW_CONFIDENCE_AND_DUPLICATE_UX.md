# Low Confidence Explanations & Better Duplicate UX

**Date:** January 23, 2026  
**Status:** ✅ COMPLETE - Ready for testing

---

## 🎯 Issues Fixed

### Issue 1: Low Confidence Without Explanation
**Problem:** Reference shows 7% confidence but no explanation of WHY it's low  
**Example:** "Contributios to the study of SMS spam filtering" - 7% confidence with no breakdown

**Solution:** Enhanced verification system to provide detailed confidence breakdowns for all references < 50% confidence

### Issue 2: Poor Duplicate UX
**Problem:** Duplicates just marked with yellow badge - no way to review and merge  
**User Request:** "Better design the duplicate. If you find duplicate entries, you need to group them together and then let the users merge them."

**Solution:** Created comprehensive duplicate management UI with side-by-side comparison and merge functionality

---

## ✅ Changes Implemented

### 1. Enhanced Confidence Explanation (verification-apis.js)

**Updated `detectIssues()` function:**
- Title mismatch now has 3 severity levels:
  - `❌ Critical` (< 30% match) - "Likely a different paper or severe typo"
  - `⚠️ Major` (30-60% match) - "Check for missing words or incorrect title"  
  - `⚠️ Minor` (60-80% match) - "Possible typo or abbreviation"

- Year mismatch shows difference:
  - `❌ Critical` (>5 years) - "Year completely wrong (2020 vs 2012) - 8 years difference"
  - `⚠️ Minor` (≤5 years) - "Possible preprint/final version"

- Missing DOI: `ℹ️ Info: No DOI found - Consider adding for better tracking`

**New `generateConfidenceExplanation()` function:**
Returns detailed breakdown of confidence factors:
```javascript
✅ Title: Excellent match (95%)
❌ Year: Mismatch - Reduces confidence by 20%
⚠️ Authors: No clear match - Reduces confidence by 20%
✅ Found in all 3 databases (OpenAlex, Crossref, Semantic Scholar)
```

**Integration in `crossValidateReference()`:**
- For confidence < 50%, automatically adds detailed breakdown to issues array:
```javascript
📊 LOW CONFIDENCE BREAKDOWN:
   ⚠️ Title: Weak match (35%)
   ❌ Year: Mismatch - Reduces confidence by 20%
   ⚠️ Authors: No clear match - Reduces confidence by 20%
   ⚠️ Found in only 1 database - Low reliability
```

### 2. Duplicate Management UI (DuplicateManager.tsx)

**New Component:** `pages/DuplicateManager.tsx`

**Features:**
- Shows warning banner when duplicates found
- Expandable groups for each duplicate set
- Side-by-side comparison of all versions:
  - Title, authors, year, BibTeX key
  - Confidence score, DOI
  - Visual indicators for selected version
- Interactive selection (click to choose which version to keep)
- Two actions:
  - **"Keep Both"** - Mark as not duplicates (ignore this group)
  - **"Merge Duplicates"** - Delete unselected versions, keep primary

**UX Details:**
- Orange warning color scheme (#ff9800)
- Clear visual hierarchy (primary has blue border + "✓ KEEP THIS" badge)
- Shows exactly how many will be removed
- Expandable/collapsible groups to reduce clutter

### 3. ResultsOverviewEnhanced Integration

**Updated `pages/ResultsOverviewEnhanced.tsx`:**

**Added duplicate grouping logic:**
```javascript
const duplicateGroups = useMemo(() => {
  const groups = new Map<string, ApiReference[]>();
  
  references.forEach(ref => {
    if (ref.duplicate_group_id && !ignoredDuplicateGroups.has(ref.duplicate_group_id)) {
      groups.get(ref.duplicate_group_id).push(ref);
    }
  });

  return Array.from(groups.entries())
    .filter(([_, refs]) => refs.length >= 2)
    .map(([groupId, refs]) => ({
      groupId,
      references: refs.sort((a, b) => {
        if (a.is_primary_duplicate) return -1;
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      })
    }));
}, [references, ignoredDuplicateGroups]);
```

**Added merge handlers:**
```javascript
// Merge duplicates - keep primary, delete others
const handleMergeDuplicates = async (groupId, primaryId, idsToDelete) => {
  await fetch('/api/merge-duplicates', {
    method: 'POST',
    body: JSON.stringify({ jobId, primaryId, idsToDelete })
  });
  // Remove merged refs from local state
  setReferences(prev => prev.filter(r => !idsToDelete.includes(r.id)));
};

// Ignore group - user confirmed they're NOT duplicates
const handleIgnoreDuplicateGroup = (groupId) => {
  setIgnoredDuplicateGroups(prev => new Set([...prev, groupId]));
};
```

**Rendered above results table:**
```jsx
{duplicateGroups.length > 0 && (
  <DuplicateManager
    duplicateGroups={duplicateGroups}
    onMergeDuplicates={handleMergeDuplicates}
    onIgnoreGroup={handleIgnoreDuplicateGroup}
  />
)}
```

### 4. Backend API Endpoint (dev-server.js)

**New endpoint:** `POST /api/merge-duplicates`

```javascript
// Input: { jobId, primaryId, idsToDelete: string[] }
// Action: Delete duplicate references from database
// Security: Requires authentication + ownership verification
const deletedCount = await deleteDuplicateReferences(jobId, idsToDelete);
```

**Enhanced `db-queries.js`:**
- `deleteDuplicateReferences()` function already existed
- Uses parameterized SQL to safely delete multiple references

---

## 📊 Expected Results

### Before: Low Confidence with No Explanation
```
Reference: "Contributios to the study of SMS spam filtering"
Confidence: 7%
Issues: [] // EMPTY!
```

### After: Detailed Confidence Breakdown
```
Reference: "Contributios to the study of SMS spam filtering"
Confidence: 7%
Issues: [
  "⚠️ Major: Significant title mismatch (35% match) - Check for missing words",
  "❌ Year: Mismatch - Reduces confidence by 20%",
  "📊 LOW CONFIDENCE BREAKDOWN:",
  "   ⚠️ Title: Weak match (35%)",
  "   ❌ Year: Mismatch - Reduces confidence by 20%",
  "   ⚠️ Authors: No clear match - Reduces confidence by 20%",
  "   ⚠️ Found in only 1 database - Low reliability"
]
```

### Before: Duplicate Marking Only
```
🔶 Duplicate - appears 5 times in your bibliography (yellow badge only)
```

### After: Interactive Duplicate Manager
```
🔄 1 Duplicate Group Found
[Expandable panel showing:]

Duplicate Group #1 - 5 entries

Select which version to keep:

┌─Version #1 (✓ KEEP THIS)──────────────────┐
│ Title: Multilingual denoising...          │
│ Authors: "Liu et al."                      │
│ Year: 2020 | Key: Liu2020 | Conf: 100%    │
└────────────────────────────────────────────┘

┌─Version #2─────────────────────────────────┐
│ Title: Multilingual denoising...          │
│ Authors: "Liu et al."                      │
│ Year: 2020 | Key: Liu2020a | Conf: 100%   │
└────────────────────────────────────────────┘

[Keep Both (Not Duplicates)] [Merge Duplicates (4 will be removed)]
```

---

## 🧪 Testing Guide

### Test 1: Low Confidence Explanation

1. Upload file with problematic reference (e.g., typo in title, wrong year)
2. Find reference with confidence < 50%
3. Click to open reference detail drawer
4. Go to "Differences" tab
5. **Expected:** See detailed breakdown:
   - ✅ What matched well (title, year, authors, database consensus)
   - ❌ What didn't match (with severity level)
   - 📊 Overall confidence calculation explanation

### Test 2: Duplicate Merging

1. Upload file with known duplicates (same paper with different keys)
2. **Expected:** Orange warning banner at top: "🔄 1 Duplicate Group Found"
3. Click to expand duplicate group
4. **Expected:** See side-by-side comparison of all versions
5. Click on preferred version (should highlight with blue border)
6. Click "Merge Duplicates"
7. **Expected:** 
   - Other versions removed from table
   - Only primary version remains
   - Total reference count updates

### Test 3: "Keep Both" (Not Duplicates)

1. Find duplicate group that looks similar but are actually different papers
2. Click "Keep Both (Not Duplicates)"
3. **Expected:** 
   - Duplicate warning disappears
   - All references remain in table
   - Status changes from "duplicate" to original status

---

## 📋 Files Modified

1. **verification-apis.js** - Enhanced `detectIssues()` and added `generateConfidenceExplanation()`
2. **pages/DuplicateManager.tsx** - NEW comprehensive duplicate management component
3. **pages/ResultsOverviewEnhanced.tsx** - Integrated DuplicateManager, added merge handlers
4. **dev-server.js** - Added `/api/merge-duplicates` endpoint

---

## 🚀 Next Steps

1. Test with real bibliography containing:
   - Low confidence matches (< 50%)
   - Known duplicates (same paper, different keys)
   - False positives (similar but different papers)

2. Verify confidence explanations are helpful and accurate

3. Test duplicate merging workflow end-to-end

4. Consider future enhancements:
   - Batch merge all duplicates
   - Auto-select highest confidence version
   - Undo merge action
   - Export with duplicates removed

---

**Status:** ✅ Ready for testing  
**Migration Required:** No  
**Breaking Changes:** None
