/**
 * Neon PostgreSQL Authentication Service
 * Handles user login, signup, and email verification via Neon DB
 */

const DATABASE_URL = process.env.DATABASE_URL || '';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  subscription: { plan: 'free' | 'pro' | 'enterprise' };
}

/**
 * Query the Neon PostgreSQL database
 */
async function queryDatabase(query: string, params?: any[]) {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured. Please set it in .env');
  }
  
  try {
    const response = await fetch(DATABASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, params })
    });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signupWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
  try {
    // Hash password (in production, use bcrypt on backend)
    const hashedPassword = btoa(password); // Simple encoding for demo
    
    const user: AuthUser = {
      id: `user_${Date.now()}`,
      email,
      displayName,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      emailVerified: false,
      subscription: { plan: 'free' }
    };
    
    // Store in local storage for demo (replace with DB query in production)
    localStorage.setItem(`neon_user_${email}`, JSON.stringify({ ...user, hashedPassword }));
    localStorage.setItem('refcheck_user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    const stored = localStorage.getItem(`neon_user_${email}`);
    if (!stored) {
      throw new Error('User not found');
    }
    
    const userData = JSON.parse(stored);
    const hashedPassword = btoa(password);
    
    if (userData.hashedPassword !== hashedPassword) {
      throw new Error('Invalid password');
    }
    
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      emailVerified: userData.emailVerified,
      subscription: userData.subscription
    };
    
    localStorage.setItem('refcheck_user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Login with Google OAuth (demo mock)
 */
export async function loginWithGoogle(): Promise<AuthUser> {
  const user: AuthUser = {
    id: `user_${Date.now()}`,
    email: `user${Date.now()}@gmail.com`,
    displayName: 'Google User',
    photoURL: 'https://picsum.photos/id/64/100/100',
    emailVerified: true,
    subscription: { plan: 'free' }
  };
  
  localStorage.setItem('refcheck_user', JSON.stringify(user));
  return user;
}

/**
 * Send email verification token
 */
export async function sendEmailVerification(email: string): Promise<{ success: boolean }> {
  try {
    const stored = localStorage.getItem(`neon_user_${email}`);
    if (!stored) {
      throw new Error('User not found');
    }
    
    // In production, send actual email via Resend
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem(`verify_code_${email}`, verificationCode);
    
    console.log(`Verification code for ${email}: ${verificationCode}`);
    return { success: true };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false };
  }
}

/**
 * Verify email with code
 */
export async function verifyEmailWithCode(email: string, code: string): Promise<{ success: boolean }> {
  try {
    const stored = localStorage.getItem(`neon_user_${email}`);
    if (!stored) {
      throw new Error('User not found');
    }
    
    const savedCode = localStorage.getItem(`verify_code_${email}`);
    if (code !== savedCode) {
      throw new Error('Invalid verification code');
    }
    
    // Update user
    const userData = JSON.parse(stored);
    userData.emailVerified = true;
    localStorage.setItem(`neon_user_${email}`, JSON.stringify(userData));
    
    // Update session
    const user: AuthUser = {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      emailVerified: true,
      subscription: userData.subscription
    };
    localStorage.setItem('refcheck_user', JSON.stringify(user));
    
    localStorage.removeItem(`verify_code_${email}`);
    return { success: true };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false };
  }
}

/**
 * Password reset request
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  try {
    const stored = localStorage.getItem(`neon_user_${email}`);
    if (!stored) {
      throw new Error('User not found');
    }
    
    const resetToken = Math.random().toString(36).substring(2, 16);
    localStorage.setItem(`reset_token_${email}`, resetToken);
    
    console.log(`Password reset token for ${email}: ${resetToken}`);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false };
  }
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(email: string, token: string, newPassword: string): Promise<{ success: boolean }> {
  try {
    const stored = localStorage.getItem(`neon_user_${email}`);
    if (!stored) {
      throw new Error('User not found');
    }
    
    const savedToken = localStorage.getItem(`reset_token_${email}`);
    if (token !== savedToken) {
      throw new Error('Invalid reset token');
    }
    
    const userData = JSON.parse(stored);
    userData.hashedPassword = btoa(newPassword);
    localStorage.setItem(`neon_user_${email}`, JSON.stringify(userData));
    localStorage.removeItem(`reset_token_${email}`);
    
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false };
  }
}

/**
 * Get current user from session
 */
export function getCurrentUser(): AuthUser | null {
  const stored = localStorage.getItem('refcheck_user');
  return stored ? JSON.parse(stored) : null;
}

/**
 * Logout current user
 */
export function logout(): void {
  localStorage.removeItem('refcheck_user');
}
