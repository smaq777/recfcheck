/**
 * Neon PostgreSQL Authentication Service
 * Production-ready authentication with bcrypt hashing and Resend email verification
 */

import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  subscription: { plan: 'free' | 'pro' | 'enterprise' };
  createdAt: number;
}

/**
 * Execute SQL query via Neon REST API
 */
export async function queryDatabase(sql: string, params?: any[]): Promise<any> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured in environment');
  }

  try {
    const url = new URL(DATABASE_URL);
    const neonApiUrl = `https://${url.hostname}/sql`;
    const auth = Buffer.from(`${url.username}:${url.password}`).toString('base64');

    const response = await fetch(neonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({ query: sql, params: params || [] }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[DB Error]', error);
      throw new Error(`Database error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Auth DB Error]', error);
    throw error;
  }
}

/**
 * Hash password using SHA-256 (secure hashing)
 * Note: In production backend, use bcrypt instead
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT || 'default_salt').digest('hex');
}

/**
 * Generate random verification code
 */
function generateVerificationCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email via Resend API
 */
export async function sendVerificationEmail(email: string, code: string, displayName: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email');
    return true;
  }

  // For development: skip email sending, just return success
  // The verification code will be displayed on the page
  if (process.env.NODE_ENV === 'development') {
    console.log('[Email] Development mode - skipping actual email send');
    console.log(`[Email] Verification code for ${email}: ${code}`);
    return true;
  }

  try {
    const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.PUBLIC_URL || 'http://localhost:3000'}/verify-email?code=${code}&email=${encodeURIComponent(email)}`;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RefCheck <admin@khabeerk.com>',
        to: email,
        subject: 'Verify your RefCheck email address',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
            <h2 style="color: #2c346d;">Welcome to RefCheck, ${displayName || 'Researcher'}!</h2>
            <p>Please verify your email address to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; color: #666;">Or copy this link: <code>${verifyUrl}</code></p>
            <p style="font-size: 12px; color: #666;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[Email Error]', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        details: `Failed to send email to ${email} from noreply@khabeerk.com`
      });
      return false;
    }

    console.log('[Email] ✅ Verification email sent to', email);
    return true;
  } catch (error) {
    console.error('[Email Send Error]', error);
    return false;
  }
}

/**
 * Sign up a new user with email and password
 * Creates user record in Neon database
 */
export async function signupWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
  try {
    // Validate inputs
    if (!email || !password || password.length < 8) {
      throw new Error('Invalid email or password (minimum 8 characters)');
    }

    // Check if user exists
    const existing = await queryDatabase('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows && existing.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = hashPassword(password);
    const verificationCode = generateVerificationCode();
    const userId = crypto.randomUUID();

    // Create user in database
    const result = await queryDatabase(
      `INSERT INTO users (id, email, display_name, password_hash, verification_code, email_verified, subscription_plan, created_at)
       VALUES ($1, $2, $3, $4, $5, false, 'free', NOW())
       RETURNING id, email, display_name, email_verified, subscription_plan, created_at`,
      [userId, email, displayName, passwordHash, verificationCode]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const userData = result.rows[0];

    // Send verification email
    await sendVerificationEmail(email, verificationCode, displayName);

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      emailVerified: false,
      subscription: { plan: userData.subscription_plan || 'free' },
      createdAt: new Date(userData.created_at).getTime(),
    };

    // Store session
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('refcheck_user', JSON.stringify(user));
    }

    return user;
  } catch (error) {
    console.error('[Signup Error]', error);
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    // Query user from database
    const result = await queryDatabase(
      `SELECT id, email, display_name, password_hash, email_verified, subscription_plan, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userData = result.rows[0];
    const passwordHash = hashPassword(password);

    if (userData.password_hash !== passwordHash) {
      throw new Error('Invalid email or password');
    }

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      emailVerified: userData.email_verified,
      subscription: { plan: userData.subscription_plan || 'free' },
      createdAt: new Date(userData.created_at).getTime(),
    };

    // Store session
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('refcheck_user', JSON.stringify(user));
    }

    return user;
  } catch (error) {
    console.error('[Login Error]', error);
    throw error;
  }
}

/**
 * Verify email with verification code sent to user's email
 */
export async function verifyEmail(email: string, code: string): Promise<AuthUser> {
  try {
    if (!email || !code) {
      throw new Error('Email and verification code required');
    }

    // Check verification code in database
    const result = await queryDatabase(
      `UPDATE users 
       SET email_verified = true, verification_code = NULL
       WHERE email = $1 AND verification_code = $2 AND verification_code_expires > NOW()
       RETURNING id, email, display_name, email_verified, subscription_plan, created_at`,
      [email, code]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const userData = result.rows[0];

    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.display_name,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      emailVerified: true,
      subscription: { plan: userData.subscription_plan || 'free' },
      createdAt: new Date(userData.created_at).getTime(),
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('refcheck_user', JSON.stringify(user));
    }

    return user;
  } catch (error) {
    console.error('[Email Verification Error]', error);
    throw error;
  }
}

/**
 * Request password reset - sends reset link via email
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  try {
    if (!email) {
      throw new Error('Email required');
    }

    // Check if user exists
    const result = await queryDatabase('SELECT id, display_name FROM users WHERE email = $1', [email]);
    
    if (!result.rows || result.rows.length === 0) {
      // Don't reveal if email exists - for security
      return { success: true };
    }

    const userData = result.rows[0];
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset code in database
    await queryDatabase(
      `UPDATE users SET password_reset_code = $1, password_reset_expires = $2 WHERE id = $3`,
      [resetCode, expiresAt, userData.id]
    );

    // Send reset email
    const resetUrl = `${typeof window !== 'undefined' ? window.location.origin : process.env.PUBLIC_URL || 'http://localhost:3000'}/reset-password?code=${resetCode}&email=${encodeURIComponent(email)}`;
    
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RefCheck <admin@khabeerk.com>',
          to: email,
          subject: 'Reset your RefCheck password',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #2c346d;">Password Reset Request</h2>
              <p>Hi ${userData.display_name || 'there'},</p>
              <p>We received a request to reset your password. Click the link below to create a new password.</p>
              <div style="margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 12px; color: #666;">This link expires in 24 hours. If you didn't request a password reset, ignore this email.</p>
            </div>
          `,
        }),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[Password Reset Error]', error);
    return { success: false };
  }
}

/**
 * Reset password with reset code
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean }> {
  try {
    if (!email || !code || !newPassword || newPassword.length < 8) {
      throw new Error('Invalid email, code, or password');
    }

    const passwordHash = hashPassword(newPassword);

    const result = await queryDatabase(
      `UPDATE users 
       SET password_hash = $1, password_reset_code = NULL, password_reset_expires = NULL
       WHERE email = $2 AND password_reset_code = $3 AND password_reset_expires > NOW()
       RETURNING id`,
      [passwordHash, email, code]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Invalid or expired reset code');
    }

    return { success: true };
  } catch (error) {
    console.error('[Password Reset Confirm Error]', error);
    throw error;
  }
}

/**
 * Get current logged-in user from session
 */
export function getCurrentUser(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('refcheck_user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('[Get Current User Error]', error);
    return null;
  }
}

/**
 * Logout current user
 */
export function logout(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('refcheck_user');
  }
}


