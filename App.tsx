
import React, { useState, useCallback, useEffect } from 'react';
import { AppView, UserProfile } from './types';
import LandingPage from './pages/LandingPage';
import DashboardProgress from './pages/ProcessingProgress';
import NewCheck from './pages/NewCheckEnhanced';
import ResultsOverview from './pages/ResultsOverviewEnhanced';
import HistoryLog from './pages/HistoryLog';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';
import ShareableReport from './pages/ShareableReport';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import { getCurrentUser, logout } from './auth-client';
import { loadPageState } from './src/lib/pageStateManager';

const normalizeUser = (raw: any): UserProfile | null => {
  if (!raw) return null;

  const uid = raw.uid || raw.id;
  const email = raw.email;

  if (!uid || !email) {
    return null;
  }

  const planRaw = raw.subscription?.plan || raw.subscription_plan || 'free';
  const plan = planRaw === 'enterprise' ? 'team' : planRaw;

  return {
    uid,
    email,
    displayName: raw.displayName ?? raw.display_name ?? null,
    photoURL: raw.photoURL ?? raw.photo_url ?? null,
    provider: raw.provider || 'email',
    emailVerified: Boolean(raw.emailVerified ?? raw.email_verified ?? false),
    createdAt: Number(raw.createdAt ?? raw.created_at ?? Date.now()),
    settings: raw.settings || {
      strictness: 'standard',
      autoFill: true,
      dedupe: true,
      dataRetention: 24,
    },
    subscription: {
      plan,
      checksThisMonth: raw.subscription?.checksThisMonth ?? raw.subscription?.checks_this_month ?? 0,
      maxChecksPerMonth:
        raw.subscription?.maxChecksPerMonth ??
        raw.subscription?.max_checks_per_month ??
        (plan === 'free' ? 5 : plan === 'pro' ? 50 : 200),
    },
  };
};

const AppHeader: React.FC<{
  onViewChange: (view: AppView) => void,
  currentView: AppView,
  user: UserProfile | null,
  onLogout: () => void
}> = ({ onViewChange, currentView, user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-light bg-white/80 backdrop-blur-md px-6 py-3">
      <div className="flex items-center gap-6">
        <div
          className="flex items-center gap-3 text-primary cursor-pointer"
          onClick={() => onViewChange(AppView.LANDING)}
        >
          <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">CheckMyBib</h2>
        </div>
        <nav className="hidden md:flex items-center gap-6 pl-6 border-l border-border-light">
          <button
            onClick={() => onViewChange(AppView.NEW_CHECK)}
            className={`text-sm font-medium transition-colors ${currentView === AppView.NEW_CHECK ? 'text-primary font-bold' : 'text-slate-500 hover:text-primary'}`}
          >
            New Check
          </button>
          <button
            onClick={() => onViewChange(AppView.RESULTS)}
            className={`text-sm font-medium transition-colors ${currentView === AppView.RESULTS || currentView === AppView.PROGRESS ? 'text-primary font-bold' : 'text-slate-500 hover:text-primary'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onViewChange(AppView.HISTORY)}
            className={`text-sm font-medium transition-colors ${currentView === AppView.HISTORY ? 'text-primary font-bold' : 'text-slate-500 hover:text-primary'}`}
          >
            History
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onViewChange(AppView.SETTINGS)}
          className="text-slate-500 hover:text-primary p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900">{user?.displayName || user?.email}</p>
            <p className="text-[10px] text-slate-500">{user?.subscription.plan.toUpperCase()} Account</p>
          </div>
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="size-9 rounded-full ring-2 ring-white shadow-sm bg-center bg-cover cursor-pointer hover:ring-primary transition-all"
              style={{ backgroundImage: `url(${user?.photoURL || 'https://picsum.photos/id/64/100/100'})` }}
            />
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border-light rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLogout();
                  }} 
                  className="w-full px-4 py-3 text-left text-sm font-bold text-error hover:bg-red-50 flex items-center gap-3 border-t border-border-light transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">logout</span> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState<string | undefined>();

  // Initialize auth listener - check localStorage for user session
  useEffect(() => {
    console.log('[App] Checking for existing session on mount');
    
    // Check URL path for public routes first (like reset-password, verify-email)
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Handle password reset URL
    if (currentPath === '/reset-password' || searchParams.has('code')) {
      const code = searchParams.get('code');
      const email = searchParams.get('email');
      if (code && currentPath === '/reset-password') {
        console.log('[App] Detected reset-password URL');
        setCurrentView(AppView.RESET_PASSWORD);
        setIsLoading(false);
        return;
      }
    }
    
    // Handle verify-email URL
    if (currentPath === '/verify-email') {
      console.log('[App] Detected verify-email URL');
      setCurrentView(AppView.VERIFY_EMAIL);
      setIsLoading(false);
      return;
    }

    // First check localStorage for persisted user
    let userFromStorage = null;
    try {
      const storedUser = localStorage.getItem('refcheck_user');
      if (storedUser) {
        userFromStorage = JSON.parse(storedUser);
        console.log('[App] Found user in localStorage:', {
          email: userFromStorage.email,
          uid: userFromStorage.uid,
          id: userFromStorage.id
        });
      }
    } catch (e) {
      console.error('[App] Error parsing stored user:', e);
      localStorage.removeItem('refcheck_user');
    }

    // Use stored user if available
    if (userFromStorage) {
      const normalizedUser = normalizeUser(userFromStorage);
      if (normalizedUser) {
        console.log('[App] Restoring session for:', normalizedUser.email);

        // Ensure id field is set
        const userToUse = {
          ...normalizedUser,
          id: normalizedUser.uid,
        };

        setUser(normalizedUser);

        // Check for saved page state and restore
        const savedState = loadPageState();
        if (savedState && savedState.route === '/results' && savedState.jobId) {
          console.log('[App] Restoring page state:', savedState);
          localStorage.setItem('current_job_id', savedState.jobId);
          setCurrentView(AppView.RESULTS);
        } else {
          setCurrentView(AppView.NEW_CHECK);
        }

        setIsLoading(false);
        return;
      }
    }

    // Otherwise try getCurrentUser (for any other auth methods)
    const rawUser = getCurrentUser();
    const normalizedUser = normalizeUser(rawUser);

    if (normalizedUser) {
      console.log('[App] User from getCurrentUser:', normalizedUser.email);
      setUser(normalizedUser);

      // Check for saved page state and restore
      const savedState = loadPageState();
      if (savedState && savedState.route === '/results' && savedState.jobId) {
        console.log('[App] Restoring page state:', savedState);
        localStorage.setItem('current_job_id', savedState.jobId);
        setCurrentView(AppView.RESULTS);
      } else {
        setCurrentView(AppView.NEW_CHECK);
      }
    } else {
      console.log('[App] No user session found, showing landing page');
      localStorage.removeItem('refcheck_user');
    }

    setIsLoading(false);
  }, []);

  const navigateTo = useCallback((view: AppView) => {
    // Protected Route Logic
    const protectedViews = [AppView.NEW_CHECK, AppView.PROGRESS, AppView.RESULTS, AppView.HISTORY, AppView.SETTINGS];

    if (protectedViews.includes(view) && !user) {
      setCurrentView(AppView.LOGIN);
      return;
    }

    if (user && !user.emailVerified && protectedViews.includes(view)) {
      setCurrentView(AppView.VERIFY_EMAIL);
      return;
    }

    setCurrentView(view);
    window.scrollTo(0, 0);
  }, [user]);

  const handleAuthSuccess = (userData: UserProfile, code?: string) => {
    console.log('[App] handleAuthSuccess called with userData:', userData);
    console.log('[App] emailVerified value:', userData.emailVerified);
    console.log('[App] Type of emailVerified:', typeof userData.emailVerified);

    const normalizedUser = normalizeUser(userData);
    console.log('[App] After normalization - emailVerified:', normalizedUser?.emailVerified);

    if (!normalizedUser) {
      console.error('[App] Failed to normalize user data');
      localStorage.removeItem('refcheck_user');
      setUser(null);
      setCurrentView(AppView.LOGIN);
      return;
    }

    // IMPORTANT: Always save to localStorage before setting state
    // Clear any previous user's job data
    localStorage.removeItem('current_job_id');
    localStorage.removeItem('refcheck_page_state');
    
    // Ensure we have 'id' field for auth, not just 'uid'
    const userToStore = {
      ...normalizedUser,
      id: normalizedUser.uid,  // Add 'id' field for auth compatibility
    };
    const userJSON = JSON.stringify(userToStore);
    localStorage.setItem('refcheck_user', userJSON);
    console.log('[App] User saved to localStorage:', {
      email: normalizedUser.email,
      uid: normalizedUser.uid,
      id: normalizedUser.uid,
      stored: userJSON ? 'SUCCESS' : 'FAILED'
    });

    setUser(normalizedUser);

    if (!normalizedUser.emailVerified) {
      console.log('[App] Email NOT verified, redirecting to VERIFY_EMAIL');
      setVerificationCode(code);
      setCurrentView(AppView.VERIFY_EMAIL);
    } else {
      console.log('[App] Email verified, redirecting to NEW_CHECK');
      setCurrentView(AppView.NEW_CHECK);
    }
  };

  const handleLogout = () => {
    // Clear localStorage completely
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('refcheck_user');
      localStorage.removeItem('current_job_id');
      localStorage.removeItem('refcheck_page_state');
    }
    setUser(null);
    setCurrentView(AppView.LANDING);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING:
        return <LandingPage onNavigate={navigateTo} />;
      case AppView.LOGIN:
        return <LoginPage onNavigate={navigateTo} onAuthSuccess={handleAuthSuccess} />;
      case AppView.SIGNUP:
        return <SignupPage onNavigate={navigateTo} onAuthSuccess={handleAuthSuccess} />;
      case AppView.FORGOT_PASSWORD:
        return <ForgotPasswordPage onNavigate={navigateTo} />;
      case AppView.RESET_PASSWORD:
        return <ResetPasswordPage onNavigate={navigateTo} />;
      case AppView.VERIFY_EMAIL:
        return <VerifyEmailPage userEmail={user?.email || ''} onNavigate={navigateTo} onAuthSuccess={handleAuthSuccess} verificationCode={verificationCode} />;
      case AppView.PROGRESS:
        return <DashboardProgress onNavigate={navigateTo} />;
      case AppView.NEW_CHECK:
        return <NewCheck onNavigate={navigateTo} />;
      case AppView.RESULTS:
        return <ResultsOverview onNavigate={navigateTo} />;
      case AppView.HISTORY:
        return <HistoryLog onNavigate={navigateTo} />;
      case AppView.PRICING:
        return <PricingPage onNavigate={navigateTo} />;
      case AppView.SETTINGS:
        return <SettingsPage onNavigate={navigateTo} />;
      case AppView.REPORT:
        return <ShareableReport onNavigate={navigateTo} />;
      case AppView.PRIVACY_POLICY:
        return <PrivacyPolicyPage onNavigate={navigateTo} />;
      case AppView.TERMS_CONDITIONS:
        return <TermsConditionsPage onNavigate={navigateTo} />;
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  const isPublicView = [AppView.LANDING, AppView.PRICING, AppView.REPORT, AppView.LOGIN, AppView.SIGNUP, AppView.FORGOT_PASSWORD, AppView.RESET_PASSWORD, AppView.VERIFY_EMAIL, AppView.PRIVACY_POLICY, AppView.TERMS_CONDITIONS].includes(currentView);

  return (
    <div className="min-h-screen flex flex-col transition-all duration-300">
      {!isPublicView && (
        <AppHeader onViewChange={navigateTo} currentView={currentView} user={user} onLogout={handleLogout} />
      )}
      <main className="flex-1 flex flex-col">
        {renderView()}
      </main>

      {isPublicView && currentView !== AppView.LOGIN && currentView !== AppView.SIGNUP && (
        <footer className="bg-white border-t border-border-light py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 text-primary">
              <div className="size-6 rounded-lg bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
              </div>
              <span className="font-bold">CheckMyBib</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <button onClick={() => navigateTo(AppView.PRICING)} className="hover:text-primary">Pricing</button>
              <button className="hover:text-primary">Security</button>
              <button className="hover:text-primary">Privacy</button>
              <button className="hover:text-primary">Terms</button>
            </div>
            <p className="text-xs text-slate-400">© 2024 CheckMyBib Inc.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
