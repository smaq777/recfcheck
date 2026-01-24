
import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { loginWithEmail } from '../auth-client';

interface LoginPageProps {
  onNavigate: (view: AppView) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const authUser = await loginWithEmail(email, password);
      
      const user: UserProfile = {
        uid: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        provider: 'email',
        emailVerified: authUser.emailVerified,
        createdAt: authUser.createdAt,
        settings: {
          strictness: 'standard',
          autoFill: true,
          dedupe: true,
          dataRetention: 24
        },
        subscription: {
          plan: authUser.subscription?.plan || 'free',
          checksThisMonth: authUser.subscription?.checksThisMonth || 0,
          maxChecksPerMonth:
            authUser.subscription?.maxChecksPerMonth ||
            (authUser.subscription?.plan === 'pro' ? 50 : authUser.subscription?.plan === 'team' ? 200 : 5),
        },
      };

      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onNavigate(AppView.FORGOT_PASSWORD);
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth login
    console.log('Google login not yet implemented');
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
              <button onClick={() => onNavigate(AppView.SIGNUP)} className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark shadow-subtle hover:shadow-card">Get Started</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium mt-2">Log in to your academic dashboard</p>
          </div>

        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-10">
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 h-14 rounded-xl border border-border-light bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm mb-6"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-border-light"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or email</span>
            <span className="h-px flex-1 bg-border-light"></span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-error text-sm font-bold border border-red-100 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.miller@stanford.edu"
                className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                <button 
                  type="button" 
                  onClick={() => onNavigate(AppView.FORGOT_PASSWORD)}
                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 rounded-xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center"
            >
              {isLoading ? (
                <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm font-medium text-slate-500">
          Don't have an account? 
          <button 
            onClick={() => onNavigate(AppView.SIGNUP)}
            className="ml-2 text-primary font-bold hover:underline"
          >
            Sign up
          </button>
        </p>
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

export default LoginPage;
