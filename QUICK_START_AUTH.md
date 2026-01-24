# 🚀 Quick Start Guide - Run Your Secure Auth System

## Step 1: Environment Setup

Create or update your `.env.local` file with these variables:

```bash
# Neon Database Connection
DATABASE_URL=postgresql://user:password@your-project.neon.tech/dbname?sslmode=require

# Resend Email Service (get from resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Optional: Custom domain for production
PUBLIC_URL=http://localhost:3000
```

### Get Your Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Get API key from dashboard
4. Copy to `.env.local`

---

## Step 2: Database Migration

Run the migration to add new security fields:

### Option A: Using Neon Console (Recommended)
1. Go to your Neon console: https://console.neon.tech
2. Open SQL Editor
3. Copy and paste contents of `migrations/add-password-reset-fields.sql`
4. Click "Run"

### Option B: Using psql Command Line
```bash
psql $DATABASE_URL -f migrations/add-password-reset-fields.sql
```

### Option C: Using Node.js Script
```bash
node apply-migration.js
```

---

## Step 3: Install Dependencies

```bash
npm install
```

(bcrypt and types are already installed ✅)

---

## Step 4: Start Development Server

```bash
npm run dev
```

This starts:
- Frontend (Vite) on http://localhost:3000
- Backend API on http://localhost:3001

---

## Step 5: Test the System

### Test Sign Up Flow
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter email, password, and name
4. Submit form
5. **Check your email** (including spam/junk folder)
6. Click verification link
7. Account should be verified ✅

### Test Login
1. Go to login page
2. Enter your email and password
3. Should log in successfully ✅

### Test Password Reset
1. Click "Forgot Password" on login
2. Enter your email
3. Check email for reset link
4. Click link and enter new password
5. Login with new password ✅

---

## 📧 Email Testing

### If emails aren't arriving:

1. **Check Spam/Junk Folder** - Most likely location
2. **Verify RESEND_API_KEY** - Make sure it's correct in `.env.local`
3. **Check Resend Dashboard** - View email logs
4. **Use Test Email** - Try with Gmail/Outlook first

### Resend.com Free Tier
- 100 emails/day (perfect for testing)
- 3,000 emails/month
- Upgrade for more

---

## 🔍 Troubleshooting

### "bcrypt" module error (Windows)
```bash
npm rebuild bcrypt --build-from-source
```

### Database connection error
- Check `DATABASE_URL` format
- Verify Neon database is active
- Test connection in Neon console

### Emails not sending
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for error logs
- Make sure sender domain is verified

### Port already in use
```bash
# Kill process on port 3001 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force

# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Server starts without errors
- [ ] Can sign up new user
- [ ] Verification email received
- [ ] Email link works
- [ ] Can login with verified account
- [ ] Can request password reset
- [ ] Reset email received
- [ ] Can set new password
- [ ] Can login with new password

---

## 🎯 What's Different Now?

### Security Improvements ✅
- ✅ Passwords hashed with bcrypt (not visible in database)
- ✅ Verification codes sent via email only (not displayed on screen)
- ✅ Password reset works with time-limited codes
- ✅ All emails professionally formatted
- ✅ Production-ready security

### User Experience ✅
- ✅ Clean verification email with branded template
- ✅ Password reset flow similar to major platforms
- ✅ Clear error messages
- ✅ Password strength indicators
- ✅ Professional UI/UX

---

## 📱 Email Preview

### Verification Email
```
Subject: Verify your RefCheck email address

Welcome to RefCheck, [Name]!

Thank you for signing up! Please verify your email address 
to activate your account.

[Verify Email Address Button]

Or copy and paste this link: [verification link]

This link expires in 24 hours.
```

### Password Reset Email
```
Subject: Reset your RefCheck password

Password Reset Request

Hi [Name],

We received a request to reset your password. Click the link 
below to create a new password.

[Reset Password Button]

Or copy and paste this link: [reset link]

This link expires in 24 hours. If you didn't request a 
password reset, please ignore this email.
```

---

## 🚀 Ready to Deploy?

### For Production (Vercel)

1. Push code to GitHub
2. Deploy to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `RESEND_API_KEY`
   - `PUBLIC_URL` (your production domain)
4. Update email sender to your domain:
   - Change `onboarding@resend.dev` to `noreply@yourdomain.com`
   - Verify domain in Resend dashboard
5. Test thoroughly before launch

---

## 🎉 You're All Set!

Your authentication system is now:
- 🔐 **Secure** - Industry-standard bcrypt hashing
- 📧 **Professional** - Resend.com email service
- ✅ **Complete** - Signup, login, verify, reset password
- 🚀 **Production-ready** - No security shortcuts

---

Need help? Check the full documentation in:
`docs/02-technical/AUTHENTICATION_SECURITY_UPGRADE.md`
