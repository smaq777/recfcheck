# History Tab Implementation - Summary

## Problem
The History tab in the Reference Detail Drawer was showing "No previous updates for this reference" even after making corrections to references.

## Solution Implemented

### 1. Database Schema Changes (`db-schema.ts`)
Added a new `reference_updates` table to track all changes made to references:

```sql
CREATE TABLE reference_updates (
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
```

**Indexes added:**
- `idx_reference_updates_reference_id` - For fast lookups by reference
- `idx_reference_updates_created_at` - For ordering by most recent

### 2. Database Initialization (`db-service.ts`)
Updated the database initialization function to create the `reference_updates` table automatically when the app starts.

### 3. Reference Update Logging (`_vercel_api/accept-correction.ts`)
Enhanced the accept-correction endpoint to:
- Track old and new values for each field that changes
- Log the type of change (field_updated, accepted, rejected, ignored)
- Record whether the change was manually verified
- Create separate log entries for each field that changes

**Change types logged:**
- `field_updated` - Individual field modifications (title, authors, year, source, doi)
- `accepted` - Overall acceptance of corrections
- `rejected` - User rejected all corrections
- `ignored` - User ignored warnings

### 4. History API Endpoint (`_vercel_api/reference-history.ts`)
Created a new GET endpoint `/api/reference-history` that:
- Takes a `referenceId` query parameter
- Returns all updates for that reference
- Sorts by most recent first
- Gracefully handles missing table (for backwards compatibility)

### 5. Frontend History Tab (`pages/ReferenceDetailDrawer.tsx`)
Updated the History tab to:
- Fetch history when the History tab is opened
- Display all changes in a timeline format
- Show change type with appropriate icons (edit, check, cancel, info)
- Display field-level details for each change
- Show old and new values side-by-side
- Display timestamp and "manually verified" badge
- Show loading state while fetching
- Show empty state if no history exists

**History card displays:**
- Change type with icon
- Human-readable description of the change
- Timestamp
- "Manually verified" badge if applicable
- Detailed field changes showing before/after values

## Files Modified

1. **db-schema.ts**
   - Added `reference_updates` table definition
   - Added `ReferenceUpdate` TypeScript interface
   - Added indexes for performance

2. **db-service.ts**
   - Added table creation in database initialization
   - Added index creation

3. **_vercel_api/accept-correction.ts**
   - Added `logReferenceUpdate()` helper function
   - Enhanced to track and log all changes
   - Fixed table name references (references → bibliography_references)

4. **_vercel_api/reference-history.ts** (NEW)
   - Created new endpoint to fetch update history
   - Returns updates sorted by most recent

5. **pages/ReferenceDetailDrawer.tsx**
   - Added `useEffect` hook to fetch history when tab opens
   - Added state for `updateHistory` and `loadingHistory`
   - Replaced placeholder History tab with full implementation
   - Added timeline-style display of all changes

6. **migrations/add-reference-history-table.sql** (NEW)
   - SQL migration file for manually applying the schema change

## How It Works

### When a user makes a correction:
1. User clicks "Update Reference" or applies manual edits
2. `accept-correction` endpoint is called
3. Before updating, it fetches the current reference data
4. It compares old vs. new values
5. For each changed field, it logs the change to `reference_updates`
6. Overall decision (accepted/rejected/ignored) is also logged

### When a user opens the History tab:
1. `useEffect` hook detects tab switch to 'history'
2. Fetches from `/api/reference-history?referenceId={id}`
3. Updates are displayed in reverse chronological order
4. Each update shows:
   - Change type with icon
   - Field name and old/new values
   - Timestamp
   - Whether it was manually verified

## Example History Entry

```
Field Updated - "title"
Updated title: "Old Title" → "New Title"
Jan 28, 2026 2:45 PM
Manually verified
```

## Backwards Compatibility

The reference-history endpoint gracefully handles cases where the `reference_updates` table doesn't exist yet by returning an empty updates array instead of an error. The database initialization automatically creates the table on first run.

## Next Steps

1. Run the migration: `npm run init-db` or execute the SQL in `migrations/add-reference-history-table.sql`
2. Test by making corrections to a reference
3. Switch to the History tab to see the recorded changes
4. Verify that field-level changes are properly tracked
