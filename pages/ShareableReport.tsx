
import React from 'react';
import { AppView } from '../types';

interface ShareableReportProps {
  onNavigate: (view: AppView) => void;
}

const ShareableReport: React.FC<ShareableReportProps> = ({ onNavigate }) => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border-light bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl font-black">library_books</span>
            </div>
            <span className="text-xl font-black tracking-tight text-primary">CheckMyBib</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[10px] font-black uppercase tracking-widest text-slate-400 sm:block">Viewing public report</span>
            <button 
              onClick={() => onNavigate(AppView.NEW_CHECK)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primary-hover transition-all shadow-xl shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              Duplicate Check
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="bg-white rounded-3xl border border-border-light shadow-xl overflow-hidden">
          <div className="px-8 py-5 border-b border-border-light bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-success font-black">check_circle</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-success">Audit Complete</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ID: REF-8X92-2023</span>
          </div>
          
          <div className="p-10 flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 leading-[1.1]">
                Bibliography Audit:<br/>
                <span className="text-primary">Impact of AI on Healthcare</span>
              </h1>
              <div className="flex flex-wrap gap-8 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">calendar_today</span> Oct 24, 2023</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">person</span> Jane Doe</div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">visibility</span> Public Access</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-border-light rounded-2xl p-6 flex flex-col items-center min-w-[160px] shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Trust Score</span>
              <div className="text-5xl font-black text-primary mb-2">93%</div>
              <span className="px-3 py-1 rounded-full bg-green-100 text-success text-[10px] font-black uppercase tracking-widest">Excellent</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Refs', val: '45', icon: 'list', color: 'text-slate-400' },
            { label: 'Verified', val: '42', icon: 'verified', color: 'text-success' },
            { label: 'Issues', val: '3', icon: 'error', color: 'text-error' },
            { label: 'Warnings', val: '0', icon: 'warning', color: 'text-warning' }
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-border-light p-6 shadow-sm flex flex-col gap-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
              </div>
              <span className={`text-3xl font-black ${stat.color === 'text-slate-400' ? 'text-slate-900' : stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">Detailed Audit Findings</h2>
          <div className="bg-white rounded-3xl border border-border-light shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-border-light">
                <tr>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Reference Details</th>
                  <th className="px-8 py-5">Source</th>
                  <th className="px-8 py-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light font-bold">
                {[
                  { title: 'Novel approaches to neural networks', meta: 'Smith, J. et al. (2021)', status: 'verified', source: 'Nature' },
                  { title: 'Analysis of Cellular Regeneration', meta: 'Doe, R. (2019)', status: 'retracted', source: 'Journal of Science' }
                ].map((row, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${row.status === 'retracted' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${row.status === 'verified' ? 'text-success' : 'text-error'}`}>
                          {row.status === 'verified' ? 'check_circle' : 'cancel'}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${row.status === 'verified' ? 'text-success' : 'text-error'}`}>
                          {row.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm text-slate-900 leading-tight">{row.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{row.meta}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">{row.source}</span>
                    </td>
                    <td className="px-8 py-6 text-right text-xs text-slate-400">Oct 24, 2023</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Public CTA */}
        <div className="bg-primary rounded-3xl p-12 lg:p-16 text-center text-white relative overflow-hidden group shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-400 blur-3xl"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">Validate your own research</h2>
            <p className="text-xl text-blue-100 max-w-2xl font-medium leading-relaxed">Don't let a retracted paper compromise your work. Join thousands of researchers ensuring their citations are accurate and issue-free.</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={() => onNavigate(AppView.NEW_CHECK)}
                className="px-10 py-4 rounded-xl bg-white text-primary font-black text-lg hover:scale-105 transition-all shadow-xl"
              >
                Run Free Check
              </button>
              <button 
                onClick={() => onNavigate(AppView.PRICING)}
                className="px-10 py-4 rounded-xl bg-white/10 border border-white/30 text-white font-black text-lg hover:bg-white/20 transition-all"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShareableReport;
