# Quick Start: History Tab Feature

## ✅ What's Fixed

The History tab now shows **all changes made to references** after correction.

When you make changes to a reference:
- Field updates are recorded with old → new values
- The decision (accepted/rejected/ignored) is logged
- Changes include timestamp and "manually verified" status
- History is displayed in reverse chronological order (newest first)

## 🚀 How to Enable

### Option 1: Automatic (Recommended)
Just run your app - the database will auto-initialize on first run:
```bash
npm run dev
```

### Option 2: Manual Migration
Execute the SQL migration:
```bash
npm run init-db
```

Or manually run in Neon console:
```sql
-- See migrations/add-reference-history-table.sql
CREATE TABLE IF NOT EXISTS reference_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES bibliography_references(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  change_type VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  field_name VARCHAR(255),
  decision VARCHAR(50),
  manually_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reference_updates_reference_id ON reference_updates(reference_id);
CREATE INDEX idx_reference_updates_created_at ON reference_updates(created_at DESC);
```

## 📋 What Gets Tracked

### Field Changes
When you update a field (title, authors, year, source, doi):
- **Old Value**: Previous value
- **New Value**: Updated value
- **Field Name**: Which field was changed
- **Timestamp**: When the change was made
- **Verified Status**: Whether manually verified

### Decisions
Overall decision on a reference:
- **Accepted**: Applied suggested or manual corrections
- **Rejected**: Kept original values
- **Ignored**: Ignored warnings and accepted as-is

## 🎯 How to Use

1. **Open a reference detail** - Click on any reference in results
2. **Make corrections** - Click "Update Reference" or manually edit fields
3. **View history** - Click the "History" tab
4. **See all changes** - Review the timeline of all updates

## 🔍 Example History Entry

```
Field Updated - "title"
Updated title: "Old Paper Title" → "Corrected Paper Title"
Jan 28, 2026 2:45 PM
Manually verified
```

## 📊 Database Schema

### reference_updates table
```
id                    UUID (Primary Key)
reference_id          UUID (Foreign Key → bibliography_references)
user_id              UUID (Foreign Key → users, nullable)
change_type          VARCHAR(50) - Type of change made
old_value            TEXT - Previous value
new_value            TEXT - New value
field_name           VARCHAR(255) - Field that changed
decision             VARCHAR(50) - User's decision
manually_verified    BOOLEAN - Whether manually verified
created_at           TIMESTAMP - When change occurred
```

## 🐛 Troubleshooting

### History tab shows "Loading..." but doesn't load
- Check browser console for errors
- Verify the migration ran successfully
- Check that reference_updates table exists

### History shows empty
- History only appears after you make corrections
- Make a test correction to see it appear

### Changes not being recorded
- Make sure you're clicking "Update Reference" button
- Check that you're logged in (user_id should be set)

## 🔧 Technical Details

### Files Modified
- `db-schema.ts` - Added table schema
- `db-service.ts` - Added table initialization
- `_vercel_api/accept-correction.ts` - Added change logging
- `_vercel_api/reference-history.ts` - New endpoint for fetching history
- `pages/ReferenceDetailDrawer.tsx` - Updated UI to display history

### New Endpoint
```
GET /api/reference-history?referenceId={id}

Response:
{
  "success": true,
  "updates": [
    {
      "id": "...",
      "reference_id": "...",
      "change_type": "field_updated",
      "field_name": "title",
      "old_value": "Old Title",
      "new_value": "New Title",
      "created_at": "2026-01-28T14:45:00Z",
      "manually_verified": true
    }
  ]
}
```

## ✨ Features

✅ Track all reference corrections
✅ Show field-level changes with before/after values
✅ Display human-readable descriptions
✅ Timeline view sorted by most recent
✅ Show "manually verified" status
✅ Graceful error handling
✅ Automatic database initialization
✅ Indexed for performance

## 📝 Notes

- History is preserved even if a reference is deleted (cascade delete)
- Each field change creates a separate log entry
- Changes include both API-suggested and user-manual edits
- User ID is tracked (nullable for backwards compatibility)
- Created_at includes full timestamp for precision

---

For more details, see: `docs/08-implementation/HISTORY_TAB_IMPLEMENTATION.md`
