
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from '../types';
import { sendEmail } from '../services';

interface SignupPageProps {
  onNavigate: (view: AppView) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validations, setValidations] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    });
  }, [password]);

  const isFormValid = validations.length && validations.upper && validations.number && validations.special && password === confirmPassword && email;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Send Verification Email via Resend
      const verificationHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2c346d;">Verify your RefCheck account</h2>
          <p>Welcome to RefCheck! Please verify your email to start auditing your bibliography.</p>
          <div style="margin: 30px 0;">
            <a href="${window.location.origin}?verify=true" style="background-color: #2c346d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p style="font-size: 12px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `;
      
      const emailRes = await sendEmail(email, "Verify your RefCheck account", verificationHtml);
      
      if (!emailRes.success) {
        throw new Error("Failed to send verification email. Please check your address.");
      }

      // 2. Create User Profile
      const mockUser: UserProfile = {
        uid: `user_${Math.random().toString(36).substr(2, 9)}`,
        email: email,
        displayName: null,
        photoURL: null,
        provider: 'email',
        emailVerified: false,
        createdAt: Date.now(),
        settings: {
          strictness: 'standard',
          autoFill: true,
          dedupe: true,
          dataRetention: 24
        },
        subscription: {
          plan: 'free',
          checksThisMonth: 0,
          maxChecksPerMonth: 10
        }
      };
      
      onAuthSuccess(mockUser);
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setIsLoading(true);
    setTimeout(() => {
      const mockUser: UserProfile = {
        uid: 'google_new',
        email: 'user@gmail.com',
        displayName: 'New Researcher',
        photoURL: null,
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
          plan: 'free',
          checksThisMonth: 0,
          maxChecksPerMonth: 10
        }
      };
      setIsLoading(false);
      onAuthSuccess(mockUser);
    }, 1500);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 text-primary mb-6 cursor-pointer" onClick={() => onNavigate(AppView.LANDING)}>
            <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">RefCheck</h1>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h2>
          <p className="text-slate-500 font-medium mt-2">Join 10,000+ academic researchers</p>
        </div>

        <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-10">
          <button onClick={handleGoogleSignup} disabled={isLoading} className="w-full flex items-center justify-center gap-3 h-14 rounded-xl border border-border-light bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm mb-6">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" />
            Sign up with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-border-light"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or use email</span>
            <span className="h-px flex-1 bg-border-light"></span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-error text-sm font-bold border border-red-100 flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Create Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 pr-12 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${validations.length ? 'text-success' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-sm">{validations.length ? 'check_circle' : 'circle'}</span>
                  8+ chars
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${validations.upper ? 'text-success' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-sm">{validations.upper ? 'check_circle' : 'circle'}</span>
                  Uppercase
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${validations.number ? 'text-success' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-sm">{validations.number ? 'check_circle' : 'circle'}</span>
                  Number
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${validations.special ? 'text-success' : 'text-slate-400'}`}>
                  <span className="material-symbols-outlined text-sm">{validations.special ? 'check_circle' : 'circle'}</span>
                  Symbol
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
              {confirmPassword && password !== confirmPassword && <p className="text-[10px] text-error font-bold">Passwords do not match</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" required className="mt-1 rounded border-border-light text-primary focus:ring-primary" />
              <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700">
                I agree to the <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>.
              </span>
            </label>

            <button type="submit" disabled={isLoading || !isFormValid} className="w-full h-14 rounded-xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center disabled:opacity-50">
              {isLoading ? <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm font-medium text-slate-500">
          Already have an account? <button onClick={() => onNavigate(AppView.LOGIN)} className="ml-2 text-primary font-bold hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
