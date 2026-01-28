
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from '../types';
import { signupWithEmail } from '../auth-client';

interface SignupPageProps {
  onNavigate: (view: AppView) => void;
  onAuthSuccess: (user: UserProfile, code?: string) => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

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

  const isFormValid = validations.length && validations.upper && validations.number && validations.special && password === confirmPassword && email && displayName;

  const handleGoogleSignup = () => {
    // TODO: Implement Google OAuth signup
    console.log('Google signup not yet implemented');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const authUser = await signupWithEmail(email, password, displayName);
      
      setShowVerificationNotice(true);
      
      // Create user profile
      const user: UserProfile = {
        uid: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        provider: 'email',
        emailVerified: false,
        createdAt: authUser.createdAt,
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
      
      // Navigate to verification page (code sent via email)
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
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
              <span className="text-lg font-extrabold tracking-tight text-text-main">CheckMyBib</span>
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
          <div className="text-center mb-10">
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
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
              <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="w-full h-12 px-4 rounded-xl border-border-light bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
            </div>

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

    {/* Footer */}
    <footer className="border-t border-border-light bg-background-light pt-16 pb-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center size-6 rounded bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>library_books</span>
              </div>
              <span className="text-base font-extrabold text-text-main">CheckMyBib</span>
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
          <p>© 2024 CheckMyBib Inc. All rights reserved.</p>
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

export default SignupPage;
