import React from 'react';
import { AppView } from '../types';

interface TermsConditionsPageProps {
  onNavigate: (view: AppView) => void;
}

const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({ onNavigate }) => {
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
              <button onClick={() => onNavigate(AppView.SIGNUP)} className="flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-primary-dark shadow-subtle hover:shadow-card">Get Started</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-3xl border border-border-light shadow-xl p-8 lg:p-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Terms and Conditions</h1>
            <p className="text-sm text-text-muted mb-8">Last updated: January 24, 2026</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-text-muted leading-relaxed">
                  By accessing and using RefCheck ("the Service"), you accept and agree to be bound by these Terms and Conditions. 
                  If you do not agree to these terms, please do not use our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Service Description</h2>
                <p className="text-text-muted leading-relaxed">
                  RefCheck is a bibliography verification tool designed to assist academic researchers in validating references 
                  and citations in their scholarly work. Our service analyzes uploaded documents, extracts bibliographic references, 
                  and cross-verifies them against multiple academic databases and APIs.
                </p>
              </section>

              <section className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600">warning</span>
                  3. Important Disclaimer and Limitations
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">3.1 Tool Limitations</h3>
                    <p className="text-text-muted leading-relaxed">
                      While we strive to provide accurate and reliable bibliography verification, RefCheck is an automated tool 
                      that relies on external data sources and APIs. As with any automated system, it may occasionally produce 
                      incomplete or inaccurate results. The tool is designed to assist researchers, not replace human judgment 
                      and careful review.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">3.2 No Guarantee of Accuracy</h3>
                    <p className="text-text-muted leading-relaxed">
                      We do not guarantee that all information provided by RefCheck is complete, accurate, or up-to-date. 
                      The service depends on third-party academic databases (including OpenAlex, Crossref, and Semantic Scholar), 
                      which may have incomplete records, outdated information, or coverage gaps. These external APIs sometimes 
                      do not contain comprehensive metadata for all publications, particularly older works, non-English publications, 
                      or materials from certain academic disciplines.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">3.3 User Responsibility</h3>
                    <p className="text-text-muted leading-relaxed font-semibold text-slate-900">
                      YOU MUST INDEPENDENTLY VERIFY ALL RESULTS PROVIDED BY REFCHECK.
                    </p>
                    <p className="text-text-muted leading-relaxed mt-2">
                      It is your responsibility as the researcher or author to double-check all references, citations, and 
                      bibliographic information before submitting your work for publication or academic evaluation. RefCheck 
                      is a supplementary tool to assist in your verification process, not a substitute for thorough academic due diligence.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">3.4 Limitation of Liability</h3>
                    <p className="text-text-muted leading-relaxed">
                      RefCheck, its creators, and operators do not accept any responsibility or liability for errors, omissions, 
                      or inaccuracies in the verification results. We are not liable for any consequences arising from your 
                      reliance on the information provided by our service, including but not limited to:
                    </p>
                    <ul className="list-disc list-inside text-text-muted space-y-2 ml-4 mt-3">
                      <li>Rejected publications or academic submissions</li>
                      <li>Academic penalties or sanctions</li>
                      <li>Reputational damage</li>
                      <li>Financial losses</li>
                      <li>Any other direct or indirect damages</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">3.5 Our Commitment</h3>
                    <p className="text-text-muted leading-relaxed">
                      We are committed to continuously improving RefCheck and maintaining the highest standards of quality. 
                      Our team works diligently to keep our algorithms up-to-date, expand our database coverage, and enhance 
                      the accuracy of our verification processes. However, we must emphasize that RefCheck should be used as 
                      one tool among many in your research workflow, not as the sole method of bibliography verification.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. User Accounts</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">4.1 Account Creation</h3>
                <p className="text-text-muted leading-relaxed mb-3">
                  To use RefCheck, you must create an account with a valid email address. You are responsible for:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Ensuring your account information is accurate and current</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.2 Account Termination</h3>
                <p className="text-text-muted leading-relaxed">
                  We reserve the right to suspend or terminate your account if you violate these terms or engage in 
                  fraudulent, abusive, or illegal activities.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Subscription Plans</h2>
                <p className="text-text-muted leading-relaxed mb-3">
                  RefCheck offers various subscription tiers (Free, Pro, Enterprise) with different features and usage limits:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Free plan users are limited to 5 bibliography checks per month</li>
                  <li>Pro and Enterprise plans offer higher limits and additional features</li>
                  <li>Subscription fees are non-refundable except as required by law</li>
                  <li>We may modify subscription pricing with 30 days' notice</li>
                  <li>You may cancel your subscription at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Acceptable Use</h2>
                <p className="text-text-muted leading-relaxed mb-3">
                  You agree not to:
                </p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>Use the service for any illegal or unauthorized purpose</li>
                  <li>Upload malicious code, viruses, or harmful content</li>
                  <li>Attempt to reverse engineer or circumvent our security measures</li>
                  <li>Share your account credentials with others</li>
                  <li>Use automated systems to abuse or overload our service</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Intellectual Property</h2>
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4">7.1 Your Content</h3>
                <p className="text-text-muted leading-relaxed">
                  You retain all rights to the documents and bibliographies you upload. We do not claim ownership of your content.
                </p>

                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.2 Our Platform</h3>
                <p className="text-text-muted leading-relaxed">
                  RefCheck, including its software, algorithms, design, and branding, is our intellectual property. 
                  You may not copy, modify, distribute, or create derivative works without our explicit permission.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Data Processing and Retention</h2>
                <p className="text-text-muted leading-relaxed">
                  We process your uploaded documents solely for the purpose of bibliography verification. By default, 
                  analysis results are retained for 24 hours. You can adjust this setting or delete your data at any time. 
                  See our Privacy Policy for more details on data handling.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Service Availability</h2>
                <p className="text-text-muted leading-relaxed">
                  We strive to maintain high service availability but do not guarantee uninterrupted access. The service may 
                  be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We are not 
                  liable for any losses resulting from service interruptions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Third-Party Services</h2>
                <p className="text-text-muted leading-relaxed">
                  RefCheck integrates with external academic databases and APIs. We are not responsible for the accuracy, 
                  availability, or performance of these third-party services. Your use of RefCheck may be subject to additional 
                  terms and conditions of these external providers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Indemnification</h2>
                <p className="text-text-muted leading-relaxed">
                  You agree to indemnify and hold harmless RefCheck, its creators, and operators from any claims, damages, 
                  or expenses arising from your use of the service, violation of these terms, or infringement of any rights 
                  of another party.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Disclaimer of Warranties</h2>
                <p className="text-text-muted leading-relaxed">
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES 
                  INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT 
                  THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Changes to Terms</h2>
                <p className="text-text-muted leading-relaxed">
                  We reserve the right to modify these Terms and Conditions at any time. We will notify users of significant 
                  changes via email or through the platform. Your continued use of RefCheck after changes are posted constitutes 
                  acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Governing Law</h2>
                <p className="text-text-muted leading-relaxed">
                  These Terms and Conditions are governed by applicable laws. Any disputes shall be resolved through binding 
                  arbitration or in courts of competent jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">15. Contact Information</h2>
                <p className="text-text-muted leading-relaxed">
                  If you have questions about these Terms and Conditions, please contact us at:
                </p>
                <p className="text-primary font-semibold mt-2">admin@khabeerk.com</p>
              </section>

              <section className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mt-8">
                <p className="text-slate-800 font-semibold mb-2">By using RefCheck, you acknowledge that:</p>
                <ul className="list-disc list-inside text-text-muted space-y-2 ml-4">
                  <li>You have read and understood these Terms and Conditions</li>
                  <li>You accept the limitations and disclaimers outlined herein</li>
                  <li>You will independently verify all results before relying on them</li>
                  <li>You understand the tool may make mistakes and is not infallible</li>
                </ul>
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

export default TermsConditionsPage;
