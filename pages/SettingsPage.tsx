
import React, { useState } from 'react';
import { AppView } from '../types';

interface SettingsPageProps {
  onNavigate: (view: AppView) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'subscription'>('subscription');

  return (
    <div className="flex-1 overflow-hidden h-screen flex">
      {/* Sidebar Nav */}
      <aside className="w-72 flex-shrink-0 flex flex-col justify-between bg-white border-r border-border-light h-full pt-10 pb-6 px-6">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm bg-primary/10 text-primary border-l-4 border-primary shadow-sm`}
          >
            <span className="material-symbols-outlined text-[20px]">credit_card</span> Manage Subscription
          </button>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl p-5 border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <span className="material-symbols-outlined text-[20px] font-black">science</span>
            <span className="font-black text-sm">Beta Access</span>
          </div>
          <p className="text-xs text-slate-600 mb-3 font-medium leading-relaxed">You're an early supporter! Currently <span className="font-bold text-emerald-700">FREE</span> during our beta phase.</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
            <span className="material-symbols-outlined text-sm">favorite</span>
            <span className="uppercase tracking-wider">Thank you!</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-10 md:p-16">
        <div className="max-w-4xl mx-auto pb-32">
          <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Account & Subscription</h1>
            <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">View your plan details, update payment methods, and manage your billing cycle.</p>
          </div>

          {/* Beta Appreciation Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl p-8 mb-10 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <span className="material-symbols-outlined text-[200px]">rocket_launch</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-3xl">stars</span>
                <h2 className="text-2xl font-black">Thank You, Early Supporter!</h2>
              </div>
              <p className="text-emerald-50 text-lg mb-6 max-w-2xl leading-relaxed">
                You're part of our beta community! CheckMyBib is currently <span className="font-bold text-white">100% FREE</span> for researchers as we perfect our verification algorithms and enhance the platform based on your valuable feedback.
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-5 border border-white/30">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-4xl mt-1">favorite</span>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Help Us Build Something Amazing</h3>
                    <p className="text-emerald-50 text-sm leading-relaxed mb-3">
                      Your usage and feedback are invaluable! Every bibliography you check, every issue you report, and every suggestion you share helps us create the best reference verification tool for the academic community.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold">🚀 Early Access Benefits</span>
                      <span className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold">💡 Shape Features</span>
                      <span className="bg-white/30 px-3 py-1 rounded-full text-xs font-bold">⭐ Forever Grateful</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-border-light shadow-sm mb-10 overflow-hidden">
            <div className="px-8 py-6 border-b border-border-light flex justify-between items-center bg-gradient-to-r from-emerald-50 to-cyan-50">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-emerald-600 text-xl">celebration</span> BETA ACCESS
              </h2>
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-widest">FREE • BETA</span>
            </div>

            <div className="p-10 space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 border-2 border-emerald-200 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[120px]">rocket_launch</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Beta</span>
                    <h3 className="text-2xl font-black text-slate-900">Full Access - FREE</h3>
                  </div>
                  <p className="text-slate-600 font-medium mb-3">All features unlocked during beta testing</p>
                  <p className="text-sm text-emerald-700 font-semibold">🎉 No credit card required • No hidden fees</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="bg-white rounded-lg p-4 border border-emerald-200">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Plan</div>
                    <div className="text-3xl font-black text-emerald-600">$0<span className="text-sm text-slate-400 font-medium">/month</span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">What You Get During Beta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Unlimited bibliography checks',
                    'Advanced AI-powered verification',
                    'Multi-format support (BibTeX, PDF, LaTeX)',
                    'Duplicate detection',
                    'Rich metadata export',
                    'Priority beta support',
                    'Early access to new features',
                    'Direct feedback channel'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback CTA */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-4xl text-amber-600">feedback</span>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">Have Feedback? We'd Love to Hear It!</h4>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                      Found a bug? Have a feature request? Your insights help us build a better tool for the entire academic community.
                    </p>
                    <a 
                      href="mailto:feedback@checkmybib.com?subject=CheckMyBib Beta Feedback" 
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">mail</span>
                      Send Feedback
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
