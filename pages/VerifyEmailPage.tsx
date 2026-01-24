
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from '../types';
import { verifyEmail } from '../auth-client';

interface VerifyEmailPageProps {
  userEmail: string;
  onNavigate: (view: AppView) => void;
  onAuthSuccess?: (user: UserProfile) => void;
  verificationCode?: string;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ userEmail, onNavigate, onAuthSuccess, verificationCode: initialCode }) => {
  const [verificationCode, setVerificationCode] = useState(initialCode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;

    console.log('[VerifyEmailPage] handleVerify called');
    console.log('[VerifyEmailPage] Email:', userEmail);
    console.log('[VerifyEmailPage] Code:', verificationCode);

    setIsLoading(true);
    setError(null);

    try {
      console.log('[VerifyEmailPage] Calling verifyEmail API...');
      const user = await verifyEmail(userEmail, verificationCode);
      console.log('[VerifyEmailPage] Verification successful, user:', user);
      
      // Create full user profile
      const userProfile: UserProfile = {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: 'email',
        emailVerified: true,
        createdAt: user.createdAt,
        settings: {
          strictness: 'standard',
          autoFill: true,
          dedupe: true,
          dataRetention: 24
        },
        subscription: {
          plan: 'free',
          checksThisMonth: 0,
          maxChecksPerMonth: 5
        }
      };

      console.log('[VerifyEmailPage] Created userProfile:', userProfile);
      console.log('[VerifyEmailPage] userProfile.emailVerified:', userProfile.emailVerified);
      console.log('[VerifyEmailPage] Calling onAuthSuccess with userProfile');
      onAuthSuccess?.(userProfile);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('refcheck_user');
    window.location.reload();
  };

  return (
    <div className="relative flex flex-col min-h-screen w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-light bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => onNavigate(AppView.LANDING)}
            >
              <div className="flex items-center justify-center size-8 rounded bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>library_books</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-text-main">RefCheck</span>
            </div>
            <nav className="hidden md:flex gap-8">
              <a className="text-sm font-medium text-text-muted hover:text-primary transition-colors" href="#">Product</a>
              <button onClick={() => onNavigate(AppView.PRICING)} className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Pricing</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-10 text-center">
          <div className="size-20 rounded-full bg-amber-50 text-warning flex items-center justify-center mx-auto mb-8 animate-pulse">
            <span className="material-symbols-outlined text-[40px]">mark_email_unread</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Verify your email</h2>
          <p className="text-slate-500 font-medium mt-4 leading-relaxed">
            We sent a verification link to:<br/>
            <span className="text-slate-900 font-bold">{userEmail}</span>
          </p>
          <p className="text-slate-400 text-sm mt-6 mb-6 italic">
            Please check your inbox (and spam folder) to complete your registration.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-error text-sm font-bold border border-red-100 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {initialCode && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-bold text-blue-900 mb-2">🧪 DEV MODE - Test Verification Code:</p>
              <code className="text-sm font-mono bg-white p-3 rounded block text-blue-900 break-all">{initialCode}</code>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                Verification Code
              </label>
              <input 
                type="text" 
                required 
                value={verificationCode} 
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code from email"
                className="w-full h-12 px-4 rounded-xl border border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading || !verificationCode}
              className="w-full h-14 rounded-xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify Email'}
            </button>

            <button 
              type="button"
              onClick={handleLogout}
              className="w-full h-12 text-slate-400 font-bold text-sm hover:text-error transition-all"
            >
              Sign out and use a different account
            </button>
          </form>
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="border-t border-border-light bg-background-light pt-16 pb-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center size-6 rounded bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>library_books</span>
              </div>
              <span className="text-base font-extrabold text-text-main">RefCheck</span>
            </div>
            <p className="text-sm text-text-muted mb-4">The standard for bibliography verification in academic research.</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Created by PhD researchers who understood the frustration of tracking down bibliography errors in academic papers. 
              What started as a personal tool to verify references has evolved into a comprehensive platform trusted by researchers worldwide.
            </p>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-text-main mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li><button onClick={() => onNavigate(AppView.PRICING)} className="hover:text-primary transition-colors">Pricing</button></li>
                <li><a className="hover:text-primary transition-colors" href="#">About Us</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border-light pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
          <p>© 2024 RefCheck Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => onNavigate(AppView.PRIVACY_POLICY)} className="hover:text-primary transition-colors">Privacy Policy</button>
            <button onClick={() => onNavigate(AppView.TERMS_CONDITIONS)} className="hover:text-primary transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>
  </div>
  );
};

export default VerifyEmailPage;
