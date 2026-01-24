# Session Persistence & File Upload Fixes

## Issues Fixed

### 1. ❌ **Session Not Persisting** - User Had to Login Repeatedly
**Root Cause:** 
- App.tsx wasn't properly restoring user session from localStorage on page reload
- User data was stored in localStorage but not being retrieved on mount

**Fix Applied:**
- Updated `App.tsx` useEffect to check localStorage FIRST before other auth methods
- Added explicit logging to verify localStorage restore is working
- Ensured user is persisted BEFORE state is set
- Session now survives page reloads and browser restarts

**Changes in [App.tsx](App.tsx#L128-L170):**
```typescript
// Now explicitly restores from localStorage first
const storedUser = localStorage.getItem('refcheck_user');
if (storedUser) {
  const userFromStorage = JSON.parse(storedUser);
  setUser(normalizedUser);  // ← This persists the session
  return;
}
```

**Result:** ✅ User stays logged in across page reloads

---

### 2. ❌ **File Upload Failing with 401 Unauthorized**
**Root Cause:**
- `/api/analyze` endpoint requires authentication headers via `requireAuth(req)`
- NewCheck.tsx wasn't sending auth headers with the file upload
- Backend was rejecting the request as unauthenticated

**Fix Applied:**
- Imported `getAuthHeader()` function in NewCheck.tsx
- Now sends Authorization + X-User-ID headers with file upload
- ProcessingProgress also updated to send auth headers in both SSE and polling

**Changes in [NewCheck.tsx](NewCheck.tsx#L2) & [ProcessingProgress.tsx](ProcessingProgress.tsx#L2):**
```typescript
// Import auth helper
import { getAuthHeader } from '../auth-client';

// Send with upload request
const authHeaders = getAuthHeader();
const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData,
  headers: authHeaders,  // ← Auth headers now included
});
```

**Result:** ✅ File upload succeeds with authenticated user

---

## Testing the Fixes

1. **Test Session Persistence:**
   - Login with email/password
   - Refresh the page (Ctrl+R)
   - ✅ Should stay logged in (no redirect to login)
   - Close and reopen browser
   - ✅ Should still be logged in

2. **Test File Upload:**
   - Login successfully
   - Click "Browse Files" or drag-drop a .bib/.pdf file
   - ✅ File should upload and show progress
   - Console should NOT show 401 errors

3. **Monitor Console:**
   - Look for `[App]` logs showing localStorage restore
   - Look for `[Auth] Using API base: http://localhost:3001`
   - File upload should show successful response

---

## How Authentication Works Now

1. **Login Process:**
   ```
   User → Login Form → Backend Auth → Save to localStorage → Restore on reload
   ```

2. **Session Persistence:**
   ```
   Page Reload → Check localStorage → If user exists → Restore session → Show NEW_CHECK
   ```

3. **API Requests:**
   ```
   Any API call → Include getAuthHeader() → Backend validates → Success
   ```

---

## Files Modified

- ✅ `App.tsx` - Session restoration logic
- ✅ `NewCheck.tsx` - Auth headers on file upload
- ✅ `ProcessingProgress.tsx` - Auth headers on polling
- ✅ `dev-server.js` - Enhanced SSE completion updates (from previous fix)

---

## Technical Details

### Auth Header Format
```javascript
{
  'Authorization': `Bearer ${user.id}`,    // User ID as token
  'X-User-ID': user.id                     // Fallback header
}
```

### Backend Validation
The `requireAuth()` function in dev-server.js checks:
1. Authorization header with Bearer token
2. Falls back to X-User-ID header
3. Returns 401 if neither is present

### localStorage Keys Used
- `refcheck_user` - Stores full user profile (JSON)
- `current_job_id` - Stores job ID during upload
- `current_file_name` - Stores filename for progress display

---

## Troubleshooting

If issues persist:

1. **Session still not working:**
   - Open DevTools → Application → localStorage
   - Check if `refcheck_user` exists after login
   - If empty, session save is failing

2. **Upload still fails:**
   - Check Network tab for 401 responses
   - Verify auth headers are being sent
   - Ensure localStorage has valid `refcheck_user` before upload

3. **Console Errors:**
   - Look for `[App]` logs starting at line 1
   - Should show "Restoring session for: [email]"
   - If not, localStorage is empty

---

## What Changed for the User

✅ **Before:** Login → Page reload → Must login again → Upload fails with 401  
✅ **After:** Login → Page reload → Still logged in → Upload works seamlessly

