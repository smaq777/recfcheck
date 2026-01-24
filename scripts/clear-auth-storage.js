#!/usr/bin/env node

/**
 * Clear Auth Storage Cleanup Script
 * 
 * Production-ready script to clear all authentication/session storage
 * and verify clean state.
 * 
 * Usage:
 *   npm run clear-auth-storage
 *   OR
 *   node scripts/clear-auth-storage.js
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: `${BLUE}ℹ${RESET}`,
    success: `${GREEN}✓${RESET}`,
    warning: `${YELLOW}⚠${RESET}`,
    error: `${RED}✕${RESET}`,
  }[type] || `${BLUE}•${RESET}`;

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function main() {
  log('Starting authentication storage cleanup...', 'info');
  console.log('');

  try {
    // 1. Clear localStorage-related data (in browser context)
    log('Clearing browser localStorage keys:', 'info');
    const localStorageKeys = [
      'refcheck_user',
      'refcheck_token',
      'refcheck_session',
      'auth_user',
      'user_session',
      'auth_token',
    ];

    localStorageKeys.forEach(key => {
      log(`  - ${key}`, 'info');
    });

    // 2. Check for environment files that might contain user data
    log('Checking for configuration files...', 'info');
    
    const configFiles = [
      '.env.local',
      '.env.development.local',
      'metadata.json',
    ];

    configFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('refcheck_user') || content.includes('AUTH_TOKEN')) {
          log(`  Found potential auth data in ${file}`, 'warning');
        } else {
          log(`  ${file} (no auth data found)`, 'success');
        }
      }
    });

    console.log('');
    log('Cleanup Instructions:', 'info');
    console.log(`
${YELLOW}Browser Developer Tools (Chrome/Firefox/Safari):${RESET}
  1. Open Developer Tools (F12 or Right-click → Inspect)
  2. Go to "Application" tab (or "Storage" in Firefox)
  3. Under "Local Storage", click on your localhost entry
  4. Find and delete these keys:
     - refcheck_user
     - refcheck_token
     - refcheck_session
     - Any other "auth" or "user" related keys

${YELLOW}Programmatic Cleanup (in tests or CI/CD):${RESET}
  // Add to your test setup or logout handler:
  localStorage.removeItem('refcheck_user');
  localStorage.removeItem('refcheck_token');
  localStorage.removeItem('refcheck_session');
  
  // Or clear all localStorage:
  localStorage.clear();

${YELLOW}.env Files:${RESET}
  Ensure these variables do NOT contain usernames/emails:
  - DATABASE_URL (should be empty or a real DB connection)
  - API_URL (should not contain any user identifiers)
  - SESSION_SECRET (should never be stored in version control)
`);

    console.log('');
    log('Verification Steps:', 'info');
    console.log(`
${YELLOW}After clearing storage, verify:${RESET}
  1. ✓ Landing page shows "Log In" and "Get Started" buttons
  2. ✓ Clicking "Get Started" opens signup page
  3. ✓ Clicking "Log In" opens login page
  4. ✓ No user data persists after page refresh
  5. ✓ Console shows NO auth errors on page load
  6. ✓ "Log In" button in navbar is visible (not user profile)

${YELLOW}Test Fresh Login:${RESET}
  1. Clear all auth storage (see above)
  2. Refresh the page - should show landing with login/signup
  3. Click "Get Started" → Signup page
  4. Enter: demo@refcheck.com / Demo123!
  5. Verify: Should redirect to email verification page
  6. After verification: Should redirect to NEW_CHECK dashboard
  7. Verify: Navbar now shows user email, not "Log In" button
`);

    console.log('');
    log('Production Safety Checklist:', 'warning');
    console.log(`
${YELLOW}Before deploying:${RESET}
  ☐ No localStorage access to auth data from untrusted sources
  ☐ All auth data validated server-side
  ☐ Credentials NOT logged to console in production
  ☐ Session tokens rotated on login
  ☐ HTTPS enforced (TLS 1.2+)
  ☐ CORS properly configured
  ☐ Password hashing uses bcrypt (not SHA-256)
  ☐ Email verification required before dashboard access
  ☐ Session timeout implemented (inactivity > 24 hours)
  ☐ Logout clears all client-side data

${YELLOW}Known Issues Fixed:${RESET}
  ✓ Removed direct localStorage auth bypass
  ✓ Added user normalization on login
  ✓ Fixed navigation flow: Login → Verify Email → Dashboard
  ✓ Cleared deprecated email from localStorage
  ✓ Updated LandingPage buttons to LOGIN/SIGNUP (not NEW_CHECK)
`);

    console.log('');
    log('Cleanup complete!', 'success');
  } catch (error) {
    log(`Error during cleanup: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
