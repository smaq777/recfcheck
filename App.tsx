
import React, { useState, useCallback, useEffect } from 'react';
import { AppView, UserProfile } from './types';
import LandingPage from './pages/LandingPage';
import DashboardProgress from './pages/DashboardProgress';
import NewCheck from './pages/NewCheck';
import ResultsOverview from './pages/ResultsOverview';
import HistoryLog from './pages/HistoryLog';
import PricingPage from './pages/PricingPage';
import SettingsPage from './pages/SettingsPage';
import ShareableReport from './pages/ShareableReport';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { getCurrentUser, logout } from './neon-auth';

const AppHeader: React.FC<{ 
  onViewChange: (view: AppView) => void, 
  currentView: AppView,
  user: UserProfile | null,
  onLogout: () => void 
}> = ({ onViewChange, currentView, user, onLogout }) => {
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
          <h2 className="text-lg font-bold tracking-tight">RefCheck</h2>
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
          <div className="relative group">
            <div 
              className="size-9 rounded-full ring-2 ring-white shadow-sm bg-center bg-cover cursor-pointer"
              style={{ backgroundImage: `url(${user?.photoURL || 'https://picsum.photos/id/64/100/100'})` }}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white border border-border-light rounded-xl shadow-xl z-50 overflow-hidden hidden group-hover:block animate-fade-in-up">
              <button onClick={() => onViewChange(AppView.SETTINGS)} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                <span className="material-symbols-outlined text-sm">person</span> Profile
              </button>
              <button onClick={onLogout} className="w-full px-4 py-3 text-left text-sm font-bold text-error hover:bg-red-50 flex items-center gap-3 border-t border-border-light">
                <span className="material-symbols-outlined text-sm">logout</span> Sign Out
              </button>
            </div>
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

  // Simulate Auth Listener
  useEffect(() => {
    // Check Neon session
    const user = getCurrentUser();
    if (user) {
      setUser(user as UserProfile);
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

  const handleAuthSuccess = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('refcheck_user', JSON.stringify(userData));
    if (!userData.emailVerified) {
      setCurrentView(AppView.VERIFY_EMAIL);
    } else {
      setCurrentView(AppView.NEW_CHECK);
    }
  };

  const handleLogout = () => {
    logout();
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
      case AppView.VERIFY_EMAIL:
        return <VerifyEmailPage userEmail={user?.email || ''} onNavigate={navigateTo} />;
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
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  const isPublicView = [AppView.LANDING, AppView.PRICING, AppView.REPORT, AppView.LOGIN, AppView.SIGNUP, AppView.FORGOT_PASSWORD, AppView.VERIFY_EMAIL].includes(currentView);

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
              <span className="font-bold">RefCheck</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <button onClick={() => navigateTo(AppView.PRICING)} className="hover:text-primary">Pricing</button>
              <button className="hover:text-primary">Security</button>
              <button className="hover:text-primary">Privacy</button>
              <button className="hover:text-primary">Terms</button>
            </div>
            <p className="text-xs text-slate-400">© 2024 RefCheck Inc.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
