
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

        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
          <div className="flex items-center gap-2 text-primary mb-2">
            <span className="material-symbols-outlined text-[20px] font-black">diamond</span>
            <span className="font-black text-sm">Pro Plan</span>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">Your next billing date is Oct 24, 2024.</p>
          <button onClick={() => onNavigate(AppView.PRICING)} className="text-xs font-black text-primary hover:underline uppercase tracking-widest">Manage Plan</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 p-10 md:p-16">
        <div className="max-w-4xl mx-auto pb-32">
          <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Account & Subscription</h1>
            <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">View your plan details, update payment methods, and manage your billing cycle.</p>
          </div>

          <section className="bg-white rounded-2xl border border-border-light shadow-sm mb-10 overflow-hidden">
            <div className="px-8 py-6 border-b border-border-light flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-primary text-xl">payments</span> CURRENT SUBSCRIPTION
              </h2>
              <span className="bg-green-100 text-success text-[10px] font-black px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">PRO ACTIVE</span>
            </div>

            <div className="p-10 space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[120px]">diamond</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Pro Plan</h3>
                  <p className="text-slate-500 font-medium">Billed annually • $12.00/month</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onNavigate(AppView.PRICING)}
                    className="px-6 py-3 rounded-xl bg-[#2b2d56] text-white text-xs font-bold shadow-lg hover:bg-primary-hover transition-all"
                  >
                    Change Plan
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Priority analysis queue',
                    'Unlimited bibliography checks',
                    'Rich metadata export',
                    'Team collaboration tools',
                    'Advanced duplicate detection',
                    'Priority support'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                      {feature}
                    </div>
                  ))}
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
