
export enum AppView {
  LANDING = 'landing',
  DASHBOARD = 'dashboard',
  NEW_CHECK = 'new-check',
  PROGRESS = 'progress',
  RESULTS = 'results',
  HISTORY = 'history',
  SETTINGS = 'settings',
  PRICING = 'pricing',
  REPORT = 'report',
  LOGIN = 'login',
  SIGNUP = 'signup',
  FORGOT_PASSWORD = 'forgot-password',
  VERIFY_EMAIL = 'verify-email'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'email';
  emailVerified: boolean;
  createdAt: number;
  settings: {
    strictness: 'relaxed' | 'standard' | 'strict';
    autoFill: boolean;
    dedupe: boolean;
    dataRetention: number;
  };
  subscription: {
    plan: 'free' | 'pro' | 'team';
    checksThisMonth: number;
    maxChecksPerMonth: number;
  };
}

export type ReferenceStatus = 'verified' | 'issue' | 'warning' | 'retracted' | 'duplicate' | 'not_found';

export interface Reference {
  id: string;
  key: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  status: ReferenceStatus;
  issues?: string[];
  confidence: number;
  doi?: string;
  canonicalTitle?: string;
  canonicalYear?: number;
  venue?: string;
  abstract?: string;
  isDuplicate?: boolean;
}

export interface VerificationJob {
  id: string;
  fileName: string;
  date: string;
  entriesCount: number;
  verifiedCount: number;
  issuesCount: number;
  warningsCount: number;
  status: 'clean' | 'issues' | 'warning';
  progress?: number;
  currentStep?: 'parsing' | 'normalizing' | 'matching' | 'scoring' | 'reporting';
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'start';
}
