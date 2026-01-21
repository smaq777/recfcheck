
import React from 'react';
import { AppView } from '../types';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-border-light bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">library_books</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight">RefCheck</span>
          </div>
          <div className="hidden md:flex gap-8">
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-primary">Product</a>
            <button onClick={() => onNavigate(AppView.PRICING)} className="text-sm font-medium text-slate-500 hover:text-primary">Pricing</button>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-primary">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate(AppView.NEW_CHECK)} className="text-sm font-bold text-slate-900 px-3 py-2">Log In</button>
            <button 
              onClick={() => onNavigate(AppView.NEW_CHECK)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-primary-hover transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-20 lg:pt-32 lg:pb-40 px-6">
        <div className="mx-auto max-w-7xl relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6 max-w-2xl text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight">
              Verify your <br/>
              <span className="text-primary">bibliography</span> in minutes
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mx-auto lg:mx-0 max-w-lg">
              Ensure academic integrity with automated checks. Upload your BibTeX and instantly detect metadata mismatches, missing fields, and retracted citations.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
              <button 
                onClick={() => onNavigate(AppView.NEW_CHECK)}
                className="h-14 px-8 rounded-xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover hover:-translate-y-1 transition-all flex items-center gap-2"
              >
                Get started <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button 
                onClick={() => onNavigate(AppView.REPORT)}
                className="h-14 px-8 rounded-xl bg-white border border-border-light text-slate-900 font-bold text-lg hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-primary">description</span>
                View sample report
              </button>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-4 pt-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="size-8 rounded-full border-2 border-white bg-slate-200" style={{ backgroundImage: `url('https://picsum.photos/id/${10 + i}/40/40')`, backgroundSize: 'cover' }} />
                ))}
              </div>
              <p>Used by 10,000+ researchers</p>
            </div>
          </div>

          <div className="relative group perspective-1000">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-full max-w-[600px] bg-white rounded-2xl shadow-2xl border border-border-light overflow-hidden transform lg:rotate-2 group-hover:rotate-0 transition-transform duration-700">
              <div className="h-10 bg-slate-50 border-b border-border-light flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-400"></div>
                  <div className="size-2.5 rounded-full bg-yellow-400"></div>
                  <div className="size-2.5 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto text-[10px] font-mono font-medium text-slate-400 bg-white px-3 py-1 rounded border border-border-light">analysis_report_v2.bib</div>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { name: 'Smith et al.', status: 'Verified', color: 'text-success', bg: 'bg-green-100', icon: 'check' },
                  { name: 'Doe & Johnson', status: 'Retracted', color: 'text-error', bg: 'bg-red-100', icon: 'close' },
                  { name: 'Williams (2019)', status: 'Missing DOI', color: 'text-amber-600', bg: 'bg-amber-100', icon: 'priority_high' }
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border-light hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-full ${row.bg} flex items-center justify-center ${row.color}`}>
                        <span className="material-symbols-outlined text-[16px]">{row.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{row.name}</p>
                        <p className="text-[10px] text-slate-400">Reference analyzed 2m ago</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${row.color}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-border-light bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Trusted by researchers at top institutions</p>
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-40 grayscale">
            <span className="text-2xl font-black font-serif">MIT</span>
            <span className="text-2xl font-black font-serif">Stanford</span>
            <span className="text-2xl font-black font-serif">Oxford</span>
            <span className="text-2xl font-black font-serif">Cambridge</span>
            <span className="text-2xl font-black font-serif">Harvard</span>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto rounded-3xl bg-primary p-12 lg:p-20 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all"></div>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight">Ready for a perfect bibliography?</h2>
            <p className="text-lg text-blue-100 max-w-xl">Join thousands of academics who publish with confidence using RefCheck's automated validation engine.</p>
            <button 
              onClick={() => onNavigate(AppView.NEW_CHECK)}
              className="mt-4 px-10 py-4 rounded-xl bg-white text-primary font-black text-lg hover:scale-105 transition-all shadow-xl"
            >
              Start Checking Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
