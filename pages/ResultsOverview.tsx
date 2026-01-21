
import React, { useState, useEffect } from 'react';
import { AppView, Reference, ReferenceStatus } from '../types';
import { verifyWithOpenAlex, getAiVerificationInsight } from '../api';

interface ResultsOverviewProps {
  onNavigate: (view: AppView) => void;
}

const ResultsOverview: React.FC<ResultsOverviewProps> = ({ onNavigate }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReferenceStatus | 'all'>('all');
  const [references, setReferences] = useState<Reference[]>([
    { 
      id: '1', 
      key: 'smith2021quantum', 
      title: 'Quantum effects in micro-architectural systems', 
      authors: 'J. Smith, A. Doe', 
      year: 2021, 
      source: 'Nature', 
      status: 'verified', 
      issues: [], 
      confidence: 98,
      doi: '10.1038/s41567-021-01234-5'
    },
    { 
      id: '2', 
      key: 'jones2019neural', 
      title: 'Introduction to Neural Rendering', 
      authors: 'B. Jones et al.', 
      year: 2019, 
      source: 'Unknown Venue', 
      status: 'issue', 
      issues: ['TITLE MISMATCH', 'YEAR DISCREPANCY', 'MISSING DOI'], 
      confidence: 51,
      canonicalTitle: 'Neural Rendering: A Comprehensive Introduction',
      canonicalYear: 2020,
      venue: 'ACM Transactions on Graphics (TOG)'
    },
    { 
      id: '3', 
      key: 'liu2023healthcare', 
      title: 'A Survey on LLMs for Healthcare', 
      authors: 'Y. Liu, Z. Chen', 
      year: 2023, 
      source: 'arXiv', 
      status: 'warning', 
      issues: ['MISSING VENUE', 'REGISTRY DOI AVAILABLE'], 
      confidence: 72,
      doi: '10.48550/arXiv.2301.00000',
      venue: 'NPJ Digital Medicine'
    },
    { 
      id: '4', 
      key: 'dup2022genomics', 
      title: 'Genomic analysis of plant cells', 
      authors: 'K. Patel', 
      year: 2022, 
      source: 'Science', 
      status: 'duplicate', 
      issues: ['DUPLICATE'], 
      confidence: 85
    }
  ]);

  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    // Only verify if we have un-audited entries (simulated)
    const runAudit = async () => {
      // Logic for background verification
    };
    runAudit();
  }, []);

  const handleApplyFix = (id: string, field?: string) => {
    setReferences(prev => prev.map(r => {
      if (r.id === id) {
        if (!field) {
          // Full Fix
          return { 
            ...r, 
            status: 'verified', 
            issues: [], 
            title: r.canonicalTitle || r.title, 
            year: r.canonicalYear || r.year,
            venue: r.venue || r.source,
            confidence: 100 
          };
        }
        // Specific field fix could be implemented here
      }
      return r;
    }));
    setSelectedRef(null);
  };

  const stats = {
    verified: references.filter(r => r.status === 'verified').length,
    issues: references.filter(r => r.status === 'issue' || r.status === 'retracted' || r.status === 'not_found').length,
    warnings: references.filter(r => r.status === 'warning').length,
    duplicates: references.filter(r => r.status === 'duplicate').length,
  };

  const filteredRefs = references.filter(r => activeFilter === 'all' || r.status === activeFilter);

  const getStatusIcon = (status: ReferenceStatus) => {
    switch (status) {
      case 'verified': return { icon: 'check_circle', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10', label: 'Verified' };
      case 'issue': return { icon: 'cancel', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', label: 'Issues' };
      case 'warning': return { icon: 'warning', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10', label: 'Warning' };
      case 'duplicate': return { icon: 'sync', color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', label: 'Duplicate' };
      case 'retracted': return { icon: 'block', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', label: 'Retracted' };
      default: return { icon: 'help', color: 'text-slate-400', bg: 'bg-slate-100', label: 'Review' };
    }
  };

  const getIssueBadgeStyle = (issue: string) => {
    if (issue.includes('RETRACTED')) return 'bg-red-100 text-[#ef4444] border-red-200';
    if (issue.includes('MISMATCH') || issue.includes('DISCREPANCY')) return 'bg-amber-100 text-[#f59e0b] border-amber-200';
    if (issue.includes('DOI') || issue.includes('VENUE')) return 'bg-blue-100 text-[#3b82f6] border-blue-200';
    if (issue.includes('DUPLICATE')) return 'bg-purple-100 text-[#a855f7] border-purple-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const handleFetchAi = async (ref: Reference) => {
    setIsAiLoading(true);
    const insight = await getAiVerificationInsight(ref);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      <main className="flex-1 flex flex-col p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Results</h1>
              <p className="text-slate-500 font-medium mt-1">Found {references.length} references in <span className="text-slate-900 font-bold">thesis_references.bib</span></p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="h-12 px-6 rounded-xl bg-white border border-border-light text-slate-700 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">ios_share</span> Export
              </button>
              <button className="h-12 px-8 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Download All Cleaned
              </button>
            </div>
          </div>

          {/* Quick Fixes Card */}
          {(stats.issues > 0 || stats.warnings > 0 || stats.duplicates > 0) && (
            <div className="bg-white rounded-[2rem] border-2 border-primary/20 p-8 shadow-xl shadow-primary/5 flex flex-col md:flex-row justify-between items-center gap-8 animate-fade-in">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-black">auto_fix_high</span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Quick Fixes Available</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-border-light">
                    <span className="text-sm font-bold text-slate-600">Add 4 missing DOIs</span>
                    <span className="text-[10px] font-black uppercase text-success tracking-widest">Verified</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-border-light">
                    <span className="text-sm font-bold text-slate-600">Fill 2 missing venues</span>
                    <span className="text-[10px] font-black uppercase text-success tracking-widest">High Conf</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-border-light">
                    <span className="text-sm font-bold text-slate-600">Merge 1 duplicate group</span>
                    <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Cluster</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                 <button className="h-12 px-6 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-all">Review Each</button>
                 <button className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">Apply All Safe Fixes</button>
              </div>
            </div>
          )}

          {/* Filter Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { id: 'all', label: 'Total', count: references.length, icon: 'list', color: 'text-slate-400', active: activeFilter === 'all' },
              { id: 'verified', label: 'Verified', count: stats.verified, icon: 'check_circle', color: 'text-[#10b981]', active: activeFilter === 'verified' },
              { id: 'issue', label: 'Issues', count: stats.issues, icon: 'cancel', color: 'text-[#ef4444]', active: activeFilter === 'issue' },
              { id: 'warning', label: 'Warnings', count: stats.warnings, icon: 'warning', color: 'text-[#f59e0b]', active: activeFilter === 'warning' },
              { id: 'duplicate', label: 'Duplicates', count: stats.duplicates, icon: 'sync', color: 'text-[#a855f7]', active: activeFilter === 'duplicate' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col items-center transition-all ${
                  f.active ? 'border-primary ring-4 ring-primary/5 -translate-y-1' : 'border-border-light hover:border-slate-300'
                }`}
              >
                <span className={`material-symbols-outlined ${f.color} mb-1`}>{f.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{f.label}</span>
                <span className="text-3xl font-black text-slate-900 mt-1">{f.count}</span>
              </button>
            ))}
          </div>

          {/* References List */}
          <div className="space-y-4 pb-20">
            {filteredRefs.map((ref) => {
              const status = getStatusIcon(ref.status);
              return (
                <div 
                  key={ref.id}
                  onClick={() => { setSelectedRef(ref); setAiInsight(null); }}
                  className={`group relative bg-white rounded-3xl border border-border-light p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer flex flex-col md:flex-row gap-8 items-start md:items-center ${
                    selectedRef?.id === ref.id ? 'ring-2 ring-primary border-transparent' : ''
                  }`}
                >
                  <div className={`size-16 md:size-20 rounded-[1.5rem] ${status.bg} ${status.color} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                    <span className="material-symbols-outlined text-[40px] font-black">{status.icon}</span>
                  </div>
                  
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter">{ref.key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-1000 ${ref.confidence > 90 ? 'bg-[#10b981]' : ref.confidence > 60 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`} style={{ width: `${ref.confidence}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{ref.confidence}%</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-1 group-hover:text-primary transition-colors">{ref.title}</h3>
                    <p className="text-sm font-bold text-slate-500">{ref.authors} • {ref.year} • {ref.source}</p>
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {ref.issues?.map(issue => (
                        <span key={issue} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${getIssueBadgeStyle(issue)}`}>
                          {issue}
                        </span>
                      ))}
                      {!ref.issues?.length && <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">Metadata sync success</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 self-center">
                    <button className="h-12 px-6 rounded-xl bg-slate-50 border border-border-light text-slate-600 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-2 whitespace-nowrap">
                      {ref.status === 'verified' ? 'View Details' : 'Review & Fix'}
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    {ref.doi && <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">DOI: {ref.doi}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Enhanced Detail Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[550px] bg-white shadow-2xl border-l border-border-light transform transition-transform duration-500 ease-in-out z-[100] ${
        selectedRef ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedRef && (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-border-light flex justify-between items-center bg-slate-50/50">
               <div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Audit Breakdown</span>
                 <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter truncate max-w-[350px]">{selectedRef.key}</h3>
               </div>
               <button onClick={() => setSelectedRef(null)} className="size-12 rounded-full hover:bg-slate-200 flex items-center justify-center transition-all">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {/* Status Overview Card */}
              <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><span className="material-symbols-outlined text-9xl">fact_check</span></div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Status Overview</h4>
                 <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-slate-300">Confidence Score</span>
                     <span className={`text-2xl font-black ${selectedRef.confidence > 90 ? 'text-[#10b981]' : selectedRef.confidence > 60 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>{selectedRef.confidence}%</span>
                   </div>
                   <div className="space-y-2">
                     {selectedRef.issues?.map((issue, idx) => (
                       <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-white/10 last:border-0">
                         <div className="flex items-center gap-2">
                           <span className={`material-symbols-outlined text-sm ${issue.includes('RETRACTED') || issue.includes('MISMATCH') ? 'text-[#ef4444]' : 'text-[#3b82f6]'}`}>
                             {issue.includes('RETRACTED') ? 'block' : 'error'}
                           </span>
                           <span className="font-bold">{issue}</span>
                         </div>
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                           issue.includes('RETRACTED') ? 'bg-[#ef4444]/20 text-[#ef4444]' : 
                           issue.includes('MISMATCH') ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#3b82f6]/20 text-[#3b82f6]'
                         }`}>
                           {issue.includes('RETRACTED') ? 'Critical' : 'High'}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
              </section>

              {/* Issue Breakdown */}
              {selectedRef.status !== 'verified' && (
                <div className="space-y-8">
                  {selectedRef.issues?.map((issue, idx) => {
                    const isTitle = issue.includes('TITLE');
                    const isYear = issue.includes('YEAR');
                    const isDoi = issue.includes('DOI');

                    return (
                      <section key={idx} className="space-y-4 border-l-4 border-primary/20 pl-6 py-2">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">{issue}</h5>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-400">Audit {idx+1}</span>
                        </div>

                        <div className="grid gap-3">
                          <div className="p-5 rounded-2xl bg-slate-50 border border-border-light relative">
                            <span className="absolute -top-2 left-4 px-2 bg-slate-50 text-[8px] font-black text-slate-400 uppercase">Your BibTeX</span>
                            <p className="text-sm font-bold text-slate-600 italic">
                              {isTitle ? selectedRef.title : isYear ? selectedRef.year : 'Missing'}
                            </p>
                          </div>
                          
                          {(isTitle || isYear || isDoi) && (
                            <div className="p-5 rounded-2xl bg-white border-2 border-primary/20 shadow-sm relative">
                              <span className="absolute -top-3 left-4 px-2 bg-white text-[8px] font-black text-primary uppercase">Registry (OpenAlex)</span>
                              <p className="text-sm font-black text-slate-900 leading-snug">
                                {isTitle ? selectedRef.canonicalTitle : isYear ? selectedRef.canonicalYear : selectedRef.doi}
                              </p>
                              <div className="mt-4 pt-4 border-t border-border-light">
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  <span className="font-black text-slate-900 uppercase mr-1">Why this matters:</span>
                                  {isTitle ? 'Title mismatch often indicates outdated preprint titles or volume naming inconsistencies.' : 
                                   isYear ? 'Using the publication year instead of the submission year ensures indexing consistency.' : 
                                   'DOIs are required for reliable citation tracking and open-access verification.'}
                                </p>
                              </div>
                              <div className="mt-4 flex gap-2">
                                <button 
                                  onClick={() => handleApplyFix(selectedRef.id)}
                                  className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
                                >
                                  Use Registry Value
                                </button>
                                <button className="h-10 px-4 rounded-xl border border-border-light text-slate-400 text-xs font-bold hover:text-slate-900 transition-all">Keep Mine</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {/* AI Expert Insights */}
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
                    <div className="h-2 bg-primary/10 rounded w-full"></div>
                    <div className="h-2 bg-primary/10 rounded w-5/6"></div>
                  </div>
                ) : aiInsight ? (
                  <p className="text-sm font-medium text-slate-700 italic border-l-2 border-primary/20 pl-4 leading-relaxed">"{aiInsight}"</p>
                ) : (
                  <button onClick={() => handleFetchAi(selectedRef)} className="w-full h-12 bg-white border border-primary/20 rounded-xl text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">
                    Generate Diagnostic Report
                  </button>
                )}
              </section>

              {/* Action Stack */}
              <div className="pt-6 space-y-4">
                <button 
                  onClick={() => handleApplyFix(selectedRef.id)}
                  className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">auto_fix_high</span>
                  Apply All Safe Fixes
                </button>
                <div className="grid grid-cols-2 gap-3">
                   <button className="h-14 border border-border-light rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Mark as Reviewed</button>
                   <button className="h-14 border border-border-light rounded-2xl text-xs font-black text-error/60 uppercase tracking-widest hover:bg-red-50 hover:text-error transition-all">Delete Entry</button>
                </div>
              </div>

              {/* Canonical Metadata Card */}
              {selectedRef.canonicalTitle && (
                <section className="bg-white rounded-3xl border border-border-light p-8 space-y-6">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canonical Metadata (OpenAlex)</h5>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Title</span>
                      <p className="text-sm font-black text-slate-900 leading-snug">{selectedRef.canonicalTitle}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <span className="text-[9px] font-black text-slate-400 uppercase">Year</span>
                         <p className="text-sm font-black text-slate-900">{selectedRef.canonicalYear}</p>
                       </div>
                       <div>
                         <span className="text-[9px] font-black text-slate-400 uppercase">Venue</span>
                         <p className="text-sm font-black text-slate-900 truncate">{selectedRef.venue}</p>
                       </div>
                    </div>
                    <div>
                       <span className="text-[9px] font-black text-slate-400 uppercase">Citations</span>
                       <p className="text-sm font-black text-slate-900">1,247 indexed citations</p>
                    </div>
                  </div>
                  <button className="w-full h-12 rounded-xl border border-border-light text-primary font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50">
                    View in OpenAlex
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </button>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsOverview;
