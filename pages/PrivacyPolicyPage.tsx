import React from 'react';
import { AppView } from '../types';

interface PrivacyPolicyPageProps {
  onNavigate: (view: AppView) => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
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
              <button onClick={() => onNavigate(AppView.SIGNUP)} className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark shadow-subtle hover:shadow-card">Get Started</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-sm text-text-muted mb-8">Last updated: January 24, 2026</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
                <p className="text-text-muted leading-relaxed">
                  Welcome to CheckMyBib. We respect your privacy and are committed to protecting your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our bibliography verification service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">Personal Information</h3>
                <p className="text-text-muted leading-relaxed mb-3">
                  When you create an account, we collect:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Email address</li>
                  <li>Name (display name)</li>
                  <li>Password (encrypted and hashed)</li>
                  <li>Account creation date</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">Usage Information</h3>
                <p className="text-text-muted leading-relaxed mb-3">
                  We collect information about how you use CheckMyBib:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Documents uploaded for analysis</li>
                  <li>Bibliography references extracted from your documents</li>
                  <li>Analysis results and verification history</li>
                  <li>Subscription plan and usage statistics</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
                <p className="text-text-muted leading-relaxed mb-3">
                  We use your information to:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Provide and maintain our bibliography verification service</li>
                  <li>Process your documents and verify references</li>
                  <li>Send you verification emails and account notifications</li>
                  <li>Improve our service quality and user experience</li>
                  <li>Manage your subscription and billing</li>
                  <li>Provide customer support</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Services</h2>
                <p className="text-text-muted leading-relaxed mb-3">
                  CheckMyBib integrates with external academic databases and APIs to verify your references:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>OpenAlex (academic reference database)</li>
                  <li>Crossref (DOI resolution service)</li>
                  <li>Semantic Scholar (academic search engine)</li>
                </ul>
                <p className="text-text-muted leading-relaxed mt-3">
                  When we query these services, we may send reference titles, authors, and publication years. 
                  These queries are necessary to validate your bibliography and do not include personally identifiable information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Retention</h2>
                <p className="text-text-muted leading-relaxed">
                  We retain your data according to your account settings. By default, analysis results are kept for 24 hours 
                  unless you choose a different retention period. You can delete your data at any time from your account settings. 
                  When you delete your account, all associated data is permanently removed from our systems.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Security</h2>
                <p className="text-text-muted leading-relaxed">
                  We implement industry-standard security measures to protect your information:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4 mt-3">
                  <li>Passwords are hashed using bcrypt with 12 salt rounds</li>
                  <li>All data transmissions are encrypted using HTTPS/TLS</li>
                  <li>Database connections are secured with encryption</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights</h2>
                <p className="text-text-muted leading-relaxed mb-3">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent for data processing</li>
                  <li>Object to data processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies</h2>
                <p className="text-text-muted leading-relaxed">
                  We use minimal cookies and local storage to maintain your session and preferences. 
                  These are essential for the service to function and do not track you across other websites.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Policy</h2>
                <p className="text-text-muted leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                  Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy 
                  periodically for any changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
                <p className="text-text-muted leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="text-primary font-semibold mt-2">admin@khabeerk.com</p>
              </section>
            </div>
          </div>
        </div>
      </main>

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

export default PrivacyPolicyPage;
