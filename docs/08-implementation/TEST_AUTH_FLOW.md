# RefCheck Authentication - Complete Testing Guide

## Quick Setup for Testing

### Prerequisites
```bash
# Make sure services are running
npm run dev:api          # Backend on 3001
npm run dev:vite         # Frontend on 3000
# OR use: npm run dev (starts both)
```

---

## Test 1: Fresh Browser Session Signup

### Steps:
1. **Clear all cache**
   - Open DevTools (F12)
   - Application tab → LocalStorage → Select localhost → Clear All
   - Refresh page

2. **Verify landing page**
   - Should see "Get Started" button
   - Navigation shows "Log In" and "Get Started"
   - Console should show: `[Auth] Using API base: http://localhost:3001`

3. **Click "Get Started"**
   - Should navigate to Login page
   - See "Sign up" link at bottom

4. **Click "Sign up" link**
   - Fill in form:
     - Full Name: `Test User`
     - Email: `testuser123@example.com`
     - Password: `TestPass123!@`
     - Confirm: `TestPass123!@`
   - Submit form

5. **Verify email page appears**
   - Should show blue dev box with verification code
   - Console: `[Auth] Login successful, user stored in localStorage`
   - Check DevTools → Application → LocalStorage:
     - Key: `refcheck_user`
     - Value: Should contain `{"id":"...", "email":"testuser123@example.com", ...}`

6. **Enter verification code**
   - Copy code from blue box
   - Paste into input field
   - Click "Verify Email"

7. **Dashboard should appear** ✅
   - **CRITICAL**: Should navigate to NEW_CHECK (dashboard)
   - NOT back to landing page
   - Navigation bar shows:
     - User email at top right
     - "ACCOUNT TIER: FREE"
     - Logout button in dropdown

8. **Refresh page**
   - Dashboard should still show
   - User still authenticated
   - localStorage still contains user data

---

## Test 2: Login After Logout

### Steps:
1. **From authenticated dashboard state**
   - Click Settings icon (gear)
   - Click "Sign Out"
   - Should redirect to landing page

2. **Verify localStorage cleared**
   - DevTools → Application → LocalStorage
   - `refcheck_user` should be GONE

3. **Verify landing page resets**
   - Shows "Log In" and "Get Started" buttons
   - Navigation bar is empty

4. **Login again**
   - Click "Get Started"
   - Enter email: `testuser123@example.com`
   - Enter password: `TestPass123!@`
   - Click "Sign In"

5. **Should go directly to dashboard** ✅
   - Already verified, so skips verification page
   - Shows NEW_CHECK dashboard
   - User info appears in navigation

---

## Test 3: Deleted Account Scenario (Critical!)

### This tests the fix for the smaq777@hotmail.com issue

### Steps:

1. **Create test account**
   - Email: `deleteme@test.com`
   - Password: `Delete123!@`
   - Sign up and verify email
   - Dashboard shows (already verified)

2. **Delete from database**
   - Open terminal
   - Run: `npm run init-db` (connects to Neon)
   - Or use SQL editor in Neon console:
     ```sql
     DELETE FROM users WHERE email = 'deleteme@test.com';
     ```

3. **Stay logged in on browser**
   - User still shows as authenticated in nav bar
   - localStorage still contains user data

4. **Refresh page** (CRITICAL TEST)
   - App checks localStorage on startup
   - ✅ Should see: `[Auth] Error parsing stored user` or similar
   - ✅ Should clear invalid localStorage entry
   - ✅ Should redirect to login page
   - Navigation should show "Log In" again

5. **Try to login with deleted email**
   - Click "Get Started"
   - Email: `deleteme@test.com`
   - Password: `Delete123!@`
   - Click "Sign In"
   - ✅ Should fail with: "Email or password is incorrect"
   - (Not "User not found" - we use generic message for security)

---

## Test 4: Demo Account Access

### Steps:
1. **Find demo account credentials**
   - Email: `demo@refcheck.com`
   - Password: `Demo123!` (or from dev-server.js)

2. **Login with demo account**
   - Click "Get Started"
   - Enter demo credentials
   - Should successfully login

3. **Should have demo data**
   - See sample analyses in dashboard
   - History shows test runs

---

## Test 5: Error Scenarios

### Invalid Email Format
```
Email: notanemail
Password: Test123!@

Expected: "Please enter a valid email"
```

### Password Too Short
```
Email: test@example.com
Password: Test

Expected: "Password must be at least 8 characters"
```

### Passwords Don't Match (Signup)
```
Password: Test123!@
Confirm: Test123!#

Expected: "Passwords must match"
```

### Network Error Simulation
```
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to login
Expected: "Unable to connect to server"
```

---

## Console Checks

### During Signup
```javascript
// Look for these in console:
[Auth] Attempting login for: testuser@example.com
[Auth] Response status: 200
[Auth] Login successful, user stored in localStorage
```

### During App Load
```javascript
[Auth] Using API base: http://localhost:3001
// Then either:
[Auth] Invalid user data in localStorage, clearing  // If cache is bad
// Or it silently loads the user if valid
```

### During Logout
```javascript
[Auth] User logged out, localStorage cleared
```

---

## DevTools Checks

### LocalStorage Tab
**After successful login should contain**:
```json
refcheck_user = {
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "testuser@example.com",
  "displayName": "Test User",
  "emailVerified": true,
  "subscription": {
    "plan": "free",
    "checksThisMonth": 0,
    "maxChecksPerMonth": 10
  },
  ...
}
```

**After logout should be empty**:
- `refcheck_user` key should NOT exist

### Application Tab → Storage
Check:
- LocalStorage → refcheck_user (present when authenticated)
- SessionStorage (should be empty)
- IndexedDB (should be empty)

---

## Common Issues & Verification

### Issue: Still shows "Get Started" after login
**Check**:
```javascript
// In console
localStorage.getItem('refcheck_user')
// Should return valid user JSON, not null
```
**Fix**: Clear all storage and retry signup

---

### Issue: Verification code doesn't work
**Check**:
```javascript
// Blue dev box should show code
// Copy EXACTLY (no quotes or spaces)
// Code should match what was sent
```
**Fix**: Check email - code may have been sent instead

---

### Issue: Can't delete account from database
**Check**:
```bash
# Test Neon connection
curl "https://api.neon.tech/v1/projects"
# Check DATABASE_URL in .env.local
```
**Fix**: Verify Neon credentials

---

## Success Criteria Checklist

After running all tests, verify:

- [ ] Fresh signup creates account and authenticates
- [ ] Email verification works with code entry
- [ ] After verification, redirects to dashboard (NOT landing)
- [ ] Navigation bar shows user info when authenticated
- [ ] Refresh page keeps user authenticated
- [ ] Logout clears all data from localStorage
- [ ] Logout returns to login page with empty nav
- [ ] Login after logout works correctly
- [ ] Deleted accounts are rejected after refresh
- [ ] Invalid cached data is automatically cleared
- [ ] Console shows appropriate debug messages
- [ ] No JavaScript errors in console
- [ ] All redirects are to correct views

---

## Browser Compatibility Testing

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Checks

### Signup process time
- Should complete in < 3 seconds
- Resend email sends immediately

### Login process time
- Should complete in < 2 seconds
- Redirect to dashboard immediate

### Page load with cached session
- Should show dashboard in < 1 second
- No loading spinners if user valid

---

## Security Checks

- [ ] Password never logged in console
- [ ] Passwords transmitted over HTTPS only
- [ ] localStorage cleared on logout
- [ ] No sensitive data in DevTools
- [ ] Deleted accounts cannot be re-accessed
- [ ] Auth token not stored in URL
- [ ] CSRF tokens used (backend check)

---

## Production Pre-Flight

Before deploying to production:

```bash
# 1. Build
npm run build

# 2. Preview locally
npm run preview

# 3. Run all tests above in preview build

# 4. Test with real domain
# (Setup prod domain in .env for testing)

# 5. Check no console errors
# 6. Check performance in Lighthouse
# 7. Deploy!
```

---

## Emergency Cache Clearing

If you get stuck with cached data:

**Option 1: DevTools**
```javascript
localStorage.clear()
location.reload()
```

**Option 2: Direct URL**
```
Open: http://localhost:3000/clear-cache.html
Click: "Clear All Cache & LocalStorage"
```

**Option 3: Manual**
```
DevTools → Application → LocalStorage → Right-click refcheck_user → Delete
```

---

**All tests passing? You're ready for production deployment! ✅**
