
import React, { useState } from 'react';
import { AppView } from '../types';
import { requestPasswordReset } from '../auth-client';

interface ForgotPasswordPageProps {
  onNavigate: (view: AppView) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await requestPasswordReset(email);
      
      if (!result.success) {
        throw new Error("Failed to send reset link. Please verify your email address.");
      }
      
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate(AppView.LOGIN)} className="hidden sm:block text-sm font-bold text-text-main hover:text-primary transition-colors px-3 py-2">Log In</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-10">
          {!isSent ? (
            <>
              <div className="mb-8">
                <button onClick={() => onNavigate(AppView.LOGIN)} className="flex items-center gap-2 text-slate-400 hover:text-primary font-bold text-xs uppercase tracking-widest mb-6">
                  <span className="material-symbols-outlined text-[18px]">west</span> Back
                </button>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reset password</h2>
                <p className="text-slate-500 font-medium mt-2">Enter your email and we'll send you a recovery link.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-error text-sm font-bold border border-red-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-14 rounded-xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading ? <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="size-20 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[40px]">mail</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Check your email</h2>
              <p className="text-slate-500 font-medium mt-4 leading-relaxed">
                We've sent a password reset link to <span className="text-slate-900 font-bold">{email}</span>.
              </p>
              <p className="text-slate-400 text-sm mt-4">
                Check your inbox and spam folder for an email from RefCheck.
              </p>
              <button 
                onClick={() => onNavigate(AppView.LOGIN)} 
                className="mt-8 text-primary font-black text-sm uppercase tracking-widest hover:underline"
              >
                Back to Login
              </button>
            </div>
          )}
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

export default ForgotPasswordPage;

