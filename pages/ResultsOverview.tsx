
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Reference } from '../types';
import { verifyWithOpenAlex, getAiVerificationInsight } from '../api';

interface ResultsOverviewProps {
  onNavigate: (view: AppView) => void;
}

const ResultsOverview: React.FC<ResultsOverviewProps> = ({ onNavigate }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [references, setReferences] = useState<Reference[]>([
    { 
      id: '1', 
      key: 'smith2021quantum', 
      title: 'Quantum effects in micro-architectural systems', 
      authors: 'J. Smith, A. Doe', 
      year: 2021, 
      source: 'Nature', 
      status: 'warning', 
      issues: ['Auditing...'], 
      confidence: 0
    },
    { 
      id: '2', 
      key: 'jones2019intro', 
      title: 'Introduction to Neural Rendering', 
      authors: 'B. Jones et al.', 
      year: 2019, 
      source: 'IEEE', 
      status: 'warning', 
      issues: ['Auditing...'], 
      confidence: 0
    },
    { 
      id: '3', 
      key: 'liu2023large', 
      title: 'A Survey on LLMs for Healthcare', 
      authors: 'Y. Liu, Z. Chen', 
      year: 2023, 
      source: 'arXiv', 
      status: 'warning', 
      issues: ['Auditing...'], 
      confidence: 0
    }
  ]);

  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Auto-verify on mount
  useEffect(() => {
    const runAudit = async () => {
      setIsVerifying(true);
      const workingSet = [...references];
      for (let i = 0; i < workingSet.length; i++) {
        const result = await verifyWithOpenAlex(workingSet[i]);
        workingSet[i] = { ...workingSet[i], ...result };
        setReferences([...workingSet]);
      }
      setIsVerifying(false);
    };
    runAudit();
  }, []);

  const handleApplyFix = (id: string) => {
    setReferences(prev => prev.map(r => {
      if (r.id === id) {
        return { 
          ...r, 
          status: 'verified', 
          issues: [], 
          title: r.canonicalTitle || r.title, 
          year: r.canonicalYear || r.year,
          confidence: 100 
        };
      }
      return r;
    }));
    setSelectedRef(null);
  };

  const handleFetchAi = async (ref: Reference) => {
    setIsAiLoading(true);
    const insight = await getAiVerificationInsight(ref);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  const handleExportBibTeX = () => {
    const jobId = "8X92"; // Mock Job ID from session
    const url = `/api/jobs/${jobId}/export?format=bib`;
    
    // Logic to trigger the export endpoint
    console.log(`Calling export endpoint: ${url}`);
    
    // Since we don't have a real backend in this environment, 
    // we alert the user and simulate what would happen.
    alert(`Exporting results as BibTeX file...\nRequesting: ${url}`);
    
    // In a real production app with a backend:
    // window.location.href = url;
    
    setShowExportOptions(false);
  };

  const stats = {
    verified: references.filter(r => r.status === 'verified').length,
    issues: references.filter(r => r.status === 'issue' || r.status === 'retracted').length,
    warnings: references.filter(r => r.status === 'warning').length,
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      <main className="flex-1 flex flex-col p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <nav className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
                <button onClick={() => onNavigate(AppView.NEW_CHECK)} className="hover:text-primary">New Audit</button>
                <span>/</span>
                <span className="text-slate-600">Active Results</span>
              </nav>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Dashboard</h1>
              <p className="text-slate-500 font-medium mt-1">Cross-referencing your bibliography with the global OpenAlex registry.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="h-12 px-6 rounded-xl bg-white border border-border-light text-slate-700 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">ios_share</span>
                  Export
                </button>
                {showExportOptions && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border-light rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    <button className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400 text-sm">table_view</span> CSV
                    </button>
                    <button 
                      onClick={handleExportBibTeX}
                      className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-t border-border-light"
                    >
                      <span className="material-symbols-outlined text-slate-400 text-sm">code</span> BibTeX
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsFixingAll(true)}
                className="h-12 px-8 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Apply All Safe Fixes
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl border border-border-light p-6 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Total Analyzed</span>
               <span className="text-4xl font-black text-slate-900">{references.length}</span>
            </div>
            <div className="bg-white rounded-3xl border border-border-light p-6 shadow-sm border-l-8 border-l-success">
               <span className="text-[10px] font-black text-success uppercase tracking-widest mb-2 block">Verified</span>
               <span className="text-4xl font-black text-slate-900">{stats.verified}</span>
            </div>
            <div className={`bg-white rounded-3xl border border-border-light p-6 shadow-sm border-l-8 ${stats.issues > 0 ? 'border-l-error' : 'border-l-slate-100'}`}>
               <span className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${stats.issues > 0 ? 'text-error' : 'text-slate-400'}`}>Major Issues</span>
               <span className="text-4xl font-black text-slate-900">{stats.issues}</span>
            </div>
            <div className="bg-white rounded-3xl border border-border-light p-6 shadow-sm border-l-8 border-l-warning">
               <span className="text-[10px] font-black text-warning uppercase tracking-widest mb-2 block">Review Needed</span>
               <span className="text-4xl font-black text-slate-900">{stats.warnings}</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-[2rem] border border-border-light shadow-sm overflow-hidden mb-12">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-border-light">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Details</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Confidence</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {references.map((ref, i) => (
                  <tr 
                    key={ref.id}
                    onClick={() => { setSelectedRef(ref); setAiInsight(null); }}
                    className={`cursor-pointer group transition-all duration-300 ${selectedRef?.id === ref.id ? 'bg-primary/5' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="px-8 py-6 w-20">
                      <div className={`size-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        ref.status === 'verified' ? 'bg-green-100 text-success' : 
                        ref.status === 'retracted' ? 'bg-red-100 text-error animate-pulse' : 
                        ref.status === 'issue' ? 'bg-red-50 text-error' : 'bg-amber-50 text-warning'
                      }`}>
                        <span className="material-symbols-outlined font-black">
                          {ref.status === 'verified' ? 'verified' : ref.status === 'retracted' ? 'dangerous' : ref.status === 'issue' ? 'error' : 'pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900 mb-0.5 line-clamp-1 group-hover:text-primary transition-colors">{ref.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ref.authors} • {ref.year}</p>
                    </td>
                    <td className="px-8 py-6 w-48">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              ref.confidence > 90 ? 'bg-success' : ref.confidence > 60 ? 'bg-warning' : 'bg-error'
                            }`}
                            style={{ width: `${ref.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{ref.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {ref.issues?.map(issue => (
                          <span key={issue} className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                            ref.status === 'verified' ? 'bg-green-50 text-success border-green-100' :
                            ref.status === 'retracted' ? 'bg-red-100 text-error border-error/20' :
                            'bg-slate-50 text-slate-500 border-border-light'
                          }`}>
                            {issue}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Slide-out */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[500px] bg-white shadow-2xl border-l border-border-light transform transition-transform duration-500 ease-in-out z-[100] ${
        selectedRef ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedRef && (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-border-light flex justify-between items-center bg-slate-50/50">
               <div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Detailed Report</span>
                 <h3 className="text-xl font-black text-slate-900 font-mono tracking-tighter truncate max-w-[300px]">{selectedRef.key}</h3>
               </div>
               <button onClick={() => setSelectedRef(null)} className="size-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-all">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {/* Registry Comparison Card */}
              <section className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Comparison</h4>
                 <div className="grid gap-3">
                   <div className="p-5 rounded-2xl bg-slate-50 border border-border-light">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Original Metadata</p>
                     <p className="text-sm font-bold text-slate-700 leading-snug">{selectedRef.title}</p>
                     <p className="text-xs text-slate-500 mt-2 font-mono">{selectedRef.authors} ({selectedRef.year})</p>
                   </div>
                   
                   {selectedRef.canonicalTitle && (
                     <div className="p-5 rounded-2xl bg-white border-2 border-primary/20 shadow-sm relative overflow-hidden">
                       <div className="absolute -right-2 -top-2 opacity-5 scale-150"><span className="material-symbols-outlined text-9xl">verified</span></div>
                       <p className="text-[9px] font-black text-primary uppercase mb-2">Registry Findings (OpenAlex)</p>
                       <p className="text-sm font-bold text-slate-900 leading-snug">{selectedRef.canonicalTitle}</p>
                       <p className="text-xs text-primary font-black mt-2 font-mono uppercase tracking-widest">{selectedRef.venue} ({selectedRef.canonicalYear})</p>
                       <div className="mt-4 flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">DOI:</span>
                          <span className="text-[10px] font-mono text-primary font-bold underline cursor-pointer">{selectedRef.doi || 'Not Available'}</span>
                       </div>
                     </div>
                   )}
                 </div>
              </section>

              {/* AI Expert Analysis */}
              <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    Gemini AI Diagnostic
                  </span>
                  {aiInsight && <button onClick={() => handleFetchAi(selectedRef)} className="text-[10px] font-black text-primary hover:underline uppercase">Regenerate</button>}
                </div>
                
                {isAiLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-3 bg-primary/10 rounded w-full"></div>
                    <div className="h-3 bg-primary/10 rounded w-5/6"></div>
                  </div>
                ) : aiInsight ? (
                  <p className="text-sm font-medium text-slate-700 italic border-l-2 border-primary/20 pl-4 leading-relaxed">"{aiInsight}"</p>
                ) : (
                  <button 
                    onClick={() => handleFetchAi(selectedRef)}
                    className="w-full h-12 bg-white border border-primary/20 rounded-xl text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    Generate Diagnostic Report
                  </button>
                )}
              </section>

              {/* Action Stack */}
              <div className="pt-6 space-y-4">
                {selectedRef.status !== 'verified' && (
                  <button 
                    onClick={() => handleApplyFix(selectedRef.id)}
                    className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Apply Registry Fix
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                   <button className="h-12 border border-border-light rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Ignore Flag</button>
                   <button className="h-12 border border-border-light rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Edit Manual</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsOverview;
