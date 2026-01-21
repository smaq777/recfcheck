
import React, { useState } from 'react';
import { AppView } from '../types';

interface SettingsPageProps {
  onNavigate: (view: AppView) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'billing' | 'api' | 'team'>('preferences');
  const [toggles, setToggles] = useState({
    typography: true,
    passiveVoice: false
  });

  return (
    <div className="flex-1 overflow-hidden h-screen flex">
      {/* Sidebar Nav */}
      <aside className="w-72 flex-shrink-0 flex flex-col justify-between bg-white border-r border-border-light h-full pt-10 pb-6 px-6">
        <div className="flex flex-col gap-3">
          <div className="pb-4 mb-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User Settings</h3>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'profile' ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">person</span> Profile
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'preferences' ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span> Preferences
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'billing' ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">credit_card</span> Billing
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'api' ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">api</span> API Keys
          </button>
          
          <div className="my-6 border-t border-border-light"></div>
          
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-4">Workspace</h3>
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'team' ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">group</span> Team Members
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
          {activeTab === 'preferences' && (
            <>
              <div className="flex flex-col gap-4 mb-12">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">App References</h1>
                <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">Configure how the analysis engine processes your data and manage your environment defaults.</p>
              </div>

              <section className="bg-white rounded-2xl border border-border-light shadow-sm mb-10 overflow-hidden">
                <div className="px-8 py-6 border-b border-border-light flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-xs font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <span className="material-symbols-outlined text-primary text-xl">psychology</span> ANALYSIS ENGINE
                  </h2>
                  <span className="bg-green-100 text-success text-[10px] font-black px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">V2.4 ACTIVE</span>
                </div>
                
                <div className="p-10 space-y-12">
                  <div className="grid md:grid-cols-3 gap-8 items-center">
                    <div className="col-span-1">
                      <label className="text-slate-900 font-black text-base block mb-1">Strictness Level</label>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">Determines how rigorous the AI checks for errors.</p>
                    </div>
                    <div className="col-span-2 relative">
                      <select className="w-full rounded-xl border-border-light bg-slate-50 py-4 px-5 font-bold text-slate-900 focus:ring-0 appearance-none cursor-pointer">
                        <option>Standard (Recommended)</option>
                        <option>Academic (Strict)</option>
                        <option>Discovery Mode</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="col-span-1">
                      <label className="text-slate-900 font-black text-base block mb-1">Auto-corrections</label>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">Automatically apply changes without prompt.</p>
                    </div>
                    <div className="col-span-2 space-y-4">
                      <div className="flex items-center justify-between p-5 rounded-2xl border border-border-light hover:border-primary/20 transition-all bg-white shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold text-sm">Fix basic typography</span>
                          <span className="text-slate-400 text-[10px]">Smart quotes, dashes, and spacing.</span>
                        </div>
                        <button 
                          onClick={() => setToggles(t => ({...t, typography: !t.typography}))}
                          className={`w-12 h-6 rounded-full relative transition-colors ${toggles.typography ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${toggles.typography ? 'translate-x-7' : 'translate-x-1'}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-5 rounded-2xl border border-border-light hover:border-primary/20 transition-all bg-white shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold text-sm">Convert passive voice</span>
                          <span className="text-slate-400 text-[10px]">Rewrite sentences to active voice automatically.</span>
                        </div>
                        <button 
                          onClick={() => setToggles(t => ({...t, passiveVoice: !t.passiveVoice}))}
                          className={`w-12 h-6 rounded-full relative transition-colors ${toggles.passiveVoice ? 'bg-primary' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${toggles.passiveVoice ? 'translate-x-7' : 'translate-x-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <div className="fixed bottom-0 right-0 w-[calc(100%-18rem)] bg-white/95 backdrop-blur-md border-t border-border-light p-6 md:px-16 flex justify-between items-center z-20">
            <button className="px-6 py-3 rounded-xl text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] transition-all">
              RESET DEFAULTS
            </button>
            <div className="flex items-center gap-8">
              <span className="text-xs font-bold text-slate-400 hidden sm:inline-block">Last saved: 10m ago</span>
              <button 
                onClick={() => alert("Preferences saved successfully.")}
                className="px-12 py-4 rounded-xl bg-[#2b2d56] hover:bg-primary-hover text-white font-black text-sm shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
