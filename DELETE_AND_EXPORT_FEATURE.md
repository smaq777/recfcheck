# Delete References & Clean Export Feature

## Overview
Users can now **delete fake or problematic references** from their bibliography and export only the clean, verified sources.

## Features Implemented

### 1. ✅ Delete Individual References
**Location**: Results table - Actions column

**How it works**:
1. User clicks the trash icon (🗑️) next to any reference
2. Confirmation dialog appears with reference title
3. If confirmed, reference is deleted from database
4. UI updates immediately (no refresh needed)
5. Success message appears

**Security**:
- ✅ Requires authentication
- ✅ Verifies job ownership (IDOR protection)
- ✅ Logs deletion activity

### 2. ✅ Export Clean Bibliography
**Location**: Export button dropdown

**Formats Supported**:
- BibTeX (.bib)
- RIS (.ris)
- Plain Text (.txt)

**How it works**:
1. User deletes unwanted references (fake, duplicates, etc.)
2. Clicks "Export" button
3. Selects format (BibTeX, RIS, or TXT)
4. Downloads file with **only remaining references**
5. Deleted references are excluded automatically

## User Workflow

### Scenario: Remove Fake References

```
1. Upload bibliography with 10 references
   ↓
2. System detects 3 fake references
   - "Synthetic Benchmarking..." ❌ NOT FOUND
   - "Ablation-Driven Evaluation..." ❌ NOT FOUND  
   - "Novel Approach..." ❌ NOT FOUND
   ↓
3. User clicks delete (🗑️) on each fake reference
   - Confirms deletion
   - Reference removed from list
   ↓
4. 7 verified references remain
   ↓
5. User clicks "Export" → "BibTeX"
   ↓
6. Downloads clean .bib file with only 7 verified references
```

## Technical Implementation

### Backend API

#### DELETE /api/reference
**Endpoint**: `DELETE /api/reference?id={referenceId}&jobId={jobId}`

**Authentication**: Required (Bearer token)

**Authorization**: Verifies job ownership

**Request**:
```http
DELETE /api/reference?id=abc-123&jobId=xyz-789
Authorization: Bearer user-token-here
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Reference deleted successfully",
  "deletedId": "abc-123"
}
```

**Response** (Error):
```json
{
  "error": "Unauthorized"
}
```

### Database Function

```javascript
/**
 * Delete a reference
 * @param {string} referenceId - Reference UUID
 * @returns {Promise<Object>} Deleted reference object
 */
export async function deleteReference(referenceId) {
  const result = await query(
    `DELETE FROM references 
     WHERE id = $1
     RETURNING *`,
    [referenceId]
  );
  return result.rows[0];
}
```

### Frontend Handler

```typescript
const handleDeleteReference = async (id: string, title: string) => {
  // 1. Confirm deletion
  const confirmed = window.confirm(
    `Are you sure you want to delete this reference?\n\n"${title}"\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  // 2. Call API
  const response = await fetch(`/api/reference?id=${id}&jobId=${jobId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // 3. Update local state
  if (response.ok) {
    setReferences(prev => prev.filter(r => r.id !== id));
    setSuccessMessage('✅ Reference deleted successfully');
  }
};
```

## UI Components

### Delete Button
**Location**: Actions column (rightmost column in table)

**Appearance**:
- 🗑️ Trash icon
- Gray by default
- Red on hover
- Light red background on hover

**Code**:
```tsx
<button
  onClick={(e) => {
    e.stopPropagation(); // Don't trigger row click
    handleDeleteReference(ref.id, ref.original_title);
  }}
  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-error hover:bg-error/10 transition-colors"
  title="Delete this reference"
>
  <span className="material-symbols-outlined text-[18px]">delete</span>
</button>
```

### Confirmation Dialog
**Native browser confirm dialog**:
```
Are you sure you want to delete this reference?

"Synthetic Benchmarking of Phishing Detectors Under..."

This action cannot be undone.

[Cancel] [OK]
```

### Success Message
**Green banner at top of page**:
```
✅ Reference deleted successfully
```

## Export Behavior

### Before Deletion
```
References: 10 total
Export → Downloads all 10 references
```

### After Deleting 3 Fake References
```
References: 7 remaining
Export → Downloads only 7 verified references
```

### Export Function (Automatic Filtering)
```typescript
const handleExport = (format: 'bibtex' | 'ris' | 'txt') => {
  exportCorrectedBibliography(
    references, // Already filtered (deleted refs removed)
    format,
    jobName
  );
};
```

## Security Features

### 1. Authentication Required
```javascript
// Require authentication
let userId;
try {
  userId = requireAuth(req);
} catch (err) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: err.message }));
  return;
}
```

### 2. Ownership Verification (IDOR Protection)
```javascript
// Verify job ownership
const job = await getJobById(jobId);
if (job.user_id !== userId) {
  console.warn(`⚠️ ALARM: Blocked IDOR access attempt`);
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return;
}
```

### 3. Activity Logging
```javascript
// Log deletion activity
await logActivity(userId, jobId, 'delete_reference', {
  referenceId,
  title: deletedRef.original_title,
  reason: 'User removed reference'
});
```

## Use Cases

### 1. Remove Fake AI-Generated References
```
User uploads bibliography
→ System detects fake references
→ User deletes fake ones
→ Exports clean bibliography
```

### 2. Remove Duplicate References
```
User uploads bibliography with duplicates
→ System detects duplicates
→ User deletes duplicates manually
→ Exports deduplicated bibliography
```

### 3. Remove Retracted Papers
```
User uploads bibliography
→ System detects retracted paper
→ User deletes retracted reference
→ Exports ethically sound bibliography
```

### 4. Quality Control
```
User uploads mixed-quality sources
→ Reviews each reference
→ Deletes low-quality sources
→ Exports only high-quality references
```

## Benefits

### For Students
- ✅ **Remove fake references** from AI-generated bibliographies
- ✅ **Clean up duplicates** easily
- ✅ **Export professional** bibliographies
- ✅ **Avoid plagiarism** by removing problematic sources

### For Researchers
- ✅ **Quality control** over bibliography
- ✅ **Remove retracted** papers quickly
- ✅ **Curate sources** before submission
- ✅ **Save time** with batch operations

### For Supervisors
- ✅ **Review and clean** student bibliographies
- ✅ **Ensure quality** standards
- ✅ **Remove fake** references
- ✅ **Export verified** versions

## Statistics Tracking

### Updated Counts After Deletion
```typescript
// Stats automatically update
const stats = {
  all: references.length,  // Decreases after deletion
  verified: references.filter(r => r.status === 'verified').length,
  issues: references.filter(r => r.status === 'issue').length,
  warnings: references.filter(r => r.status === 'warning').length
};
```

### Export Count
```
Before: "Showing 10 of 10 references"
After deletion: "Showing 7 of 7 references"
Export: Downloads 7 references
```

## Error Handling

### Network Errors
```typescript
try {
  const response = await fetch(...);
  if (!response.ok) throw new Error('Failed to delete');
} catch (error) {
  setError(`Failed to delete reference: ${error.message}`);
  setTimeout(() => setError(null), 5000);
}
```

### Database Errors
```javascript
try {
  const deletedRef = await deleteReference(referenceId);
  if (!deletedRef) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Reference not found' }));
  }
} catch (error) {
  console.error('Delete reference error:', error);
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Failed to delete reference' }));
}
```

## Future Enhancements

### Planned Features
1. **Bulk Delete**: Select multiple references and delete at once
2. **Undo Delete**: Restore recently deleted references
3. **Delete Reasons**: Track why references were deleted
4. **Export Options**: 
   - Export only verified references
   - Export only references with issues
   - Export by status filter

### Advanced Features
1. **Smart Suggestions**: AI recommends which references to delete
2. **Comparison View**: Compare before/after deletion
3. **Version History**: Track all deletions and restorations
4. **Collaborative Cleanup**: Multiple users can review and delete

## Testing Checklist

### Manual Testing
- [ ] Delete a fake reference
- [ ] Confirm deletion dialog appears
- [ ] Reference disappears from list
- [ ] Success message shows
- [ ] Export excludes deleted reference
- [ ] Stats update correctly
- [ ] Can't delete same reference twice
- [ ] Unauthorized users can't delete
- [ ] Activity log records deletion

### Edge Cases
- [ ] Delete while drawer is open
- [ ] Delete last reference
- [ ] Delete all references
- [ ] Network failure during delete
- [ ] Delete non-existent reference
- [ ] Delete from different user's job (should fail)

## Conclusion

The delete and clean export feature provides users with **full control** over their bibliography quality. Combined with the fake detection algorithm and AI analysis, users can:

1. **Identify** fake/problematic references
2. **Delete** them with one click
3. **Export** only clean, verified sources
4. **Maintain** academic integrity

This makes RefCheck a complete bibliography management solution! 🎓✨
