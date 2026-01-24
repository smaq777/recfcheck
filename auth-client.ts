/**
 * Frontend-safe authentication client
 * Calls backend /api/auth/* endpoints (not Node.js code)
 * Safe to use in browser - no crypto or Buffer APIs
 */

import { AuthUser } from './types';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('[Auth] Using API base:', API_BASE);

/**
 * Sign up with email and password
 * Backend sends verification email via Resend
 */
export async function signupWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Signup failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.user;
  } catch (error: any) {
    console.error('[Signup Error]', error);
    throw new Error(error.message || 'Failed to sign up. Please check your internet connection and try again.');
  }
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    console.log('[Auth] Attempting login for:', email);
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log('[Auth] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.message || 'Login failed';
      throw new Error(message);
    }

    const data = await response.json();

    return data.user;
  } catch (error: any) {
    console.error('[Login Error]', error);
    
    // Provide specific error messages
    if (error.message === 'Invalid email or password') {
      throw new Error('Email or password is incorrect. Please try again.');
    }
    if (error.message.includes('Failed')) {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
    
    throw new Error(error.message || 'Login failed. Please try again.');
  }
}

/**
 * Verify email with code sent to user's email
 */
export async function verifyEmail(email: string, code: string): Promise<AuthUser> {
  try {
    console.log('[Auth] verifyEmail called with:', { email, code });
    
    const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    console.log('[Auth] Verify response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.log('[Auth] Verify error response:', error);
      throw new Error(error.message || 'Email verification failed');
    }

    const data = await response.json();
    console.log('[Auth] Verify success, user:', data.user);

    return data.user;
  } catch (error: any) {
    console.error('[Email Verification Error]', error);
    throw new Error(error.message || 'Email verification failed. Please try again.');
  }
}

/**
 * Request password reset - backend sends email with reset link
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset request failed');
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Password Reset Error]', error);
    throw new Error(error.message || 'Failed to request password reset.');
  }
}

/**
 * Reset password with reset code
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset failed');
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Password Reset Confirm Error]', error);
    throw new Error(error.message || 'Password reset failed.');
  }
}

/**
 * Get current logged-in user from localStorage session
 * Validates that user data is properly structured before returning
 */
export function getCurrentUser(): AuthUser | null {
  try {
    const userData = localStorage.getItem('refcheck_user');
    console.log('[Auth] getCurrentUser - Raw stored userData:', userData ? `Found (${userData.length} chars)` : 'NOT FOUND');
    
    if (!userData) {
      console.log('[Auth] getCurrentUser - No data in localStorage');
      return null;
    }
    
    const user = JSON.parse(userData);
    console.log('[Auth] getCurrentUser - Parsed user object:', {
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      keys: Object.keys(user)
    });
    
    // Accept either 'id' or 'uid' field
    const userId = user.id || user.uid;
    
    // Validate user object has required fields
    if (!userId || !user.email) {
      console.warn('[Auth] getCurrentUser - Invalid user data (missing id or email):', {
        userId: userId ? '✓' : '✗',
        email: user.email ? '✓' : '✗'
      });
      localStorage.removeItem('refcheck_user');
      return null;
    }
    
    // Ensure id field is set
    if (!user.id && user.uid) {
      user.id = user.uid;
    }
    
    console.log('[Auth] getCurrentUser - Validation passed, returning user:', { id: user.id, email: user.email });
    return user;
  } catch (error) {
    console.error('[Auth] getCurrentUser - Error reading user session:', error);
    localStorage.removeItem('refcheck_user');
    return null;
  }
}

/**
 * Logout current user - completely clear localStorage
 */
export function logout(): void {
  try {
    localStorage.removeItem('refcheck_user');
    // Clear any other auth-related data
    localStorage.removeItem('refcheck_verification_email');
    localStorage.removeItem('refcheck_auth_token');
    console.log('[Auth] User logged out, localStorage cleared');
  } catch (error) {
    console.error('[Auth] Error during logout:', error);
  }
}

/**
 * Get Authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const user = getCurrentUser();
  console.log('[Auth] getAuthHeader - user from getCurrentUser:', user);
  
  if (!user) {
    console.warn('[Auth] getAuthHeader - No user found, returning empty headers');
    return {};
  }
  
  const headers = {
    'Authorization': `Bearer ${user.id}`,
    'X-User-ID': user.id,
  };
  
  console.log('[Auth] getAuthHeader - Returning headers:', {
    Authorization: `Bearer ${user.id}`,
    'X-User-ID': user.id,
  });
  
  return headers;
}
