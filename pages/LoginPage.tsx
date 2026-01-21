
import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';

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

    // Simulate Firebase Email Sign In
    setTimeout(() => {
      const mockUser: UserProfile = {
        uid: 'user_123',
        email: email,
        displayName: 'Dr. Sarah Miller',
        photoURL: 'https://picsum.photos/id/64/100/100',
        provider: 'email',
        emailVerified: true,
        createdAt: Date.now(),
        settings: {
          strictness: 'standard',
          autoFill: true,
          dedupe: true,
          dataRetention: 24
        },
        subscription: {
          plan: 'pro',
          checksThisMonth: 5,
          maxChecksPerMonth: 100
        }
      };
      setIsLoading(false);
      onAuthSuccess(mockUser);
    }, 1000);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate Firebase Google Auth
    setTimeout(() => {
      const mockUser: UserProfile = {
        uid: 'google_user_123',
        email: 'sarah.miller@stanford.edu',
        displayName: 'Dr. Sarah Miller',
        photoURL: 'https://picsum.photos/id/64/100/100',
        provider: 'google',
        emailVerified: true,
        createdAt: Date.now(),
        settings: {
          strictness: 'standard',
          autoFill: true,
          dedupe: true,
          dataRetention: 24
        },
        subscription: {
          plan: 'pro',
          checksThisMonth: 5,
          maxChecksPerMonth: 100
        }
      };
      setIsLoading(false);
      onAuthSuccess(mockUser);
    }, 1000);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div 
            className="inline-flex items-center gap-3 text-primary mb-6 cursor-pointer" 
            onClick={() => onNavigate(AppView.LANDING)}
          >
            <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">RefCheck</h1>
          </div>
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
  );
};

export default LoginPage;
