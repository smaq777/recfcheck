
import React, { useState, useEffect, useMemo } from 'react';
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
      id: '1', key: 'smith2021quantum', title: 'Quantum effects in micro-architectural systems', 
      authors: 'J. Smith, A. Doe', year: 2021, source: 'Nature', status: 'verified', 
      confidence: 98, doi: '10.1038/s41567-021-01234-5'
    },
    { 
      id: '2', key: 'jones2019neural', title: 'Introduction to Neural Rendering', 
      authors: 'B. Jones et al.', year: 2019, source: 'Unknown Venue', status: 'warning', 
      issues: ['Auditing...'], confidence: 0
    },
    { 
      id: '3', key: 'liu2023healthcare', title: 'A Survey on LLMs for Healthcare', 
      authors: 'Y. Liu, Z. Chen', year: 2023, source: 'arXiv', status: 'warning', 
      issues: ['Auditing...'], confidence: 0
    },
    {
      id: '4', key: 'dup2022genomics', title: 'Genomic analysis of plant cells',
      authors: 'K. Patel', year: 2022, source: 'Science', status: 'duplicate',
      issues: ['DUPLICATE'], confidence: 85
    }
  ]);

  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Robust Audit Loop
  useEffect(() => {
    let active = true;
    const runAudit = async () => {
      setIsVerifying(true);
      const targets = references.filter(r => r.confidence === 0);
      for (const ref of targets) {
        if (!active) break;
        const result = await verifyWithOpenAlex(ref);
        setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, ...result } : r));
      }
      if (active) setIsVerifying(false);
    };
    runAudit();
    return () => { active = false; };
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
          source: r.venue || r.source,
          confidence: 100 
        };
      }
      return r;
    }));
    setSelectedRef(null);
  };

  const handleExportBibTeX = () => {
    alert("Exporting BibTeX to /api/jobs/REF-8X92/export?format=bib");
    setShowExportOptions(false);
  };

  const stats = useMemo(() => ({
    all: references.length,
    verified: references.filter(r => r.status === 'verified').length,
    issues: references.filter(r => ['issue', 'retracted', 'not_found'].includes(r.status)).length,
    warnings: references.filter(r => r.status === 'warning').length,
    duplicates: references.filter(r => r.status === 'duplicate').length,
  }), [references]);

  const filteredRefs = useMemo(() => 
    references.filter(r => activeFilter === 'all' || r.status === activeFilter)
  , [references, activeFilter]);

  const getStatusConfig = (status: ReferenceStatus) => {
    switch (status) {
      case 'verified': return { icon: 'check_circle', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10', label: 'VERIFIED' };
      case 'retracted': return { icon: 'block', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', label: 'RETRACTED PAPER' };
      case 'issue': return { icon: 'cancel', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', label: 'MAJOR ISSUE' };
      case 'warning': return { icon: 'warning', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10', label: 'WARNING' };
      case 'duplicate': return { icon: 'sync', color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', label: 'DUPLICATE' };
      case 'not_found': return { icon: 'help', color: 'text-slate-400', bg: 'bg-slate-100', label: 'NOT FOUND' };
      default: return { icon: 'pending', color: 'text-slate-300', bg: 'bg-slate-50', label: 'AUDITING' };
    }
  };

  const getBadgeStyle = (issue: string) => {
    if (issue.includes('RETRACTED')) return 'bg-red-50 text-[#ef4444] border-red-200';
    if (issue.includes('MISMATCH') || issue.includes('DISCREPANCY')) return 'bg-amber-50 text-[#f59e0b] border-amber-200';
    if (issue.includes('DOI') || issue.includes('VENUE')) return 'bg-blue-50 text-[#3b82f6] border-blue-200';
    return 'bg-slate-50 text-slate-500 border-slate-200';
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
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">📊 Audit Results</h1>
              <p className="text-slate-500 font-medium mt-1">Found {references.length} references in <span className="font-bold text-slate-900">thesis_references.bib</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowExportOptions(!showExportOptions)} className="h-12 px-6 rounded-xl bg-white border border-border-light text-slate-700 font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm relative">
                <span className="material-symbols-outlined text-[20px]">ios_share</span> Export
                {showExportOptions && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-border-light rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    <button onClick={handleExportBibTeX} className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-border-light"><span className="material-symbols-outlined text-sm">code</span> BibTeX</button>
                    <button className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><span className="material-symbols-outlined text-sm">table_view</span> CSV</button>
                  </div>
                )}
              </button>
              <button className="h-12 px-8 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Apply All Safe Fixes</button>
            </div>
          </div>

          {/* Quick Fixes available card */}
          {(stats.issues > 0 || stats.warnings > 0) && (
            <div className="bg-white rounded-[2rem] border-2 border-primary/20 p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-8 animate-fade-in">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-black">auto_fix_high</span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Quick Fixes Available</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-border-light">
                    <span className="text-sm font-bold text-slate-600">Add missing DOIs</span>
                    <span className="text-[10px] font-black uppercase text-success tracking-widest">Verified</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-border-light">
                    <span className="text-sm font-bold text-slate-600">Merge duplicates</span>
                    <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Clusters Found</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                 <button className="h-12 px-6 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-all">Review Each</button>
                 <button className="h-12 px-8 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Apply All Safe Fixes</button>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
            {[
              { id: 'all', label: 'All', count: stats.all, icon: 'list', color: 'text-slate-400' },
              { id: 'verified', label: 'Verified', count: stats.verified, icon: 'check_circle', color: 'text-[#10b981]' },
              { id: 'issue', label: 'Issues', count: stats.issues, icon: 'cancel', color: 'text-[#ef4444]' },
              { id: 'warning', label: 'Warnings', count: stats.warnings, icon: 'warning', color: 'text-[#f59e0b]' },
              { id: 'duplicate', label: 'Duplicates', count: stats.duplicates, icon: 'sync', color: 'text-[#a855f7]' }
            ].map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id as any)} className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col items-center transition-all ${activeFilter === f.id ? 'border-primary ring-4 ring-primary/5 -translate-y-1' : 'border-border-light hover:border-slate-300'}`}>
                <span className={`material-symbols-outlined ${f.color} mb-1`}>{f.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{f.label}</span>
                <span className="text-3xl font-black text-slate-900 mt-1">{f.count}</span>
              </button>
            ))}
          </div>

          {/* Reference List */}
          <div className="space-y-4 pb-24">
            {filteredRefs.map((ref) => {
              const cfg = getStatusConfig(ref.status);
              return (
                <div key={ref.id} onClick={() => { setSelectedRef(ref); setAiInsight(null); }} className={`group bg-white rounded-3xl border border-border-light p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer flex flex-col md:flex-row gap-8 items-start md:items-center ${selectedRef?.id === ref.id ? 'ring-2 ring-primary border-transparent' : ''}`}>
                  <div className={`size-16 md:size-20 rounded-[1.5rem] ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined text-[40px] font-black">{cfg.icon}</span>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter">{ref.key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full transition-all duration-700 ${ref.confidence > 90 ? 'bg-[#10b981]' : ref.confidence > 60 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`} style={{ width: `${ref.confidence}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{ref.confidence}%</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-1 group-hover:text-primary transition-colors">{ref.title}</h3>
                    <p className="text-sm font-bold text-slate-500">{ref.authors} • {ref.year} • {ref.source || 'No Venue'}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {ref.issues?.map(issue => <span key={issue} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getBadgeStyle(issue)}`}>{issue}</span>)}
                      {ref.status === 'verified' && <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-sm">verified</span> Verified</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 self-center">
                    <button className="h-12 px-6 rounded-xl bg-slate-50 border border-border-light text-slate-600 font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-2 whitespace-nowrap">
                      {ref.status === 'verified' ? 'View Details' : 'Review & Fix'} <span className="material-symbols-outlined text-[18px]">east</span>
                    </button>
                    {ref.doi && <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">DOI: {ref.doi}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Enhanced Detail Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[550px] bg-white shadow-2xl border-l border-border-light transform transition-transform duration-500 ease-in-out z-[100] ${selectedRef ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedRef && (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-border-light flex justify-between items-center bg-slate-50/50">
               <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Detailed Audit</span><h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter truncate max-w-[350px]">{selectedRef.key}</h3></div>
               <button onClick={() => setSelectedRef(null)} className="size-12 rounded-full hover:bg-slate-200 flex items-center justify-center transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Status Overview</h4>
                 <div className="space-y-4">
                   <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-300">Confidence Score</span><span className={`text-2xl font-black ${selectedRef.confidence > 90 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{selectedRef.confidence}%</span></div>
                   <div className="space-y-2">
                     {selectedRef.issues?.map((issue, idx) => (
                       <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-white/10 last:border-0"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-[#ef4444]">error</span><span className="font-bold">{issue}</span></div><span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-[#ef4444]/20 text-[#ef4444]">Critical</span></div>
                     ))}
                   </div>
                 </div>
              </section>

              {/* Issue-by-issue breakdown */}
              <div className="space-y-8">
                {selectedRef.issues?.filter(i => i !== 'Auditing...').map((issue, idx) => (
                  <section key={idx} className="space-y-4 border-l-4 border-primary/20 pl-6 py-2 animate-fade-in-up">
                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">{issue} <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded">Detected</span></h5>
                    <div className="grid gap-3">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-border-light relative"><span className="absolute -top-2 left-4 px-2 bg-slate-50 text-[8px] font-black text-slate-400 uppercase">Your Source</span><p className="text-sm font-bold text-slate-600 italic">"{issue.includes('TITLE') ? selectedRef.title : selectedRef.year}"</p></div>
                      {selectedRef.canonicalTitle && (
                        <div className="p-5 rounded-2xl bg-white border-2 border-primary/20 shadow-sm relative"><span className="absolute -top-3 left-4 px-2 bg-white text-[8px] font-black text-primary uppercase">Registry (OpenAlex)</span><p className="text-sm font-black text-slate-900 leading-snug">{issue.includes('TITLE') ? selectedRef.canonicalTitle : selectedRef.canonicalYear}</p>
                          <div className="mt-4 pt-4 border-t border-border-light"><p className="text-[10px] text-slate-500 leading-relaxed"><span className="font-black text-slate-900 uppercase mr-1">Why this matters:</span> Registry titles are the canonical target for indexing and impact factors.</p></div>
                          <div className="mt-4 flex gap-2"><button onClick={() => handleApplyFix(selectedRef.id)} className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest">Use Registry</button><button className="h-10 px-4 rounded-xl border border-border-light text-slate-400 text-xs font-bold">Keep Mine</button></div>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {/* AI Expert Insight */}
              <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10 space-y-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">psychology</span> Gemini AI Diagnostic</span>
                {isAiLoading ? <div className="space-y-3 animate-pulse"><div className="h-2 bg-primary/10 rounded w-full"></div><div className="h-2 bg-primary/10 rounded w-5/6"></div></div> : aiInsight ? <p className="text-sm font-medium text-slate-700 italic border-l-2 border-primary/20 pl-4 leading-relaxed">"{aiInsight}"</p> : <button onClick={() => handleFetchAi(selectedRef)} className="w-full h-12 bg-white border border-primary/20 rounded-xl text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Generate Diagnostic</button>}
              </section>

              <div className="pt-6 space-y-4">
                <button onClick={() => handleApplyFix(selectedRef.id)} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"><span className="material-symbols-outlined">auto_fix_high</span> Apply All Safe Fixes</button>
                <div className="grid grid-cols-2 gap-3"><button className="h-14 border border-border-light rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Mark Reviewed</button><button className="h-14 border border-border-light rounded-2xl text-xs font-black text-error/60 uppercase tracking-widest hover:bg-red-50 hover:text-error transition-all">Delete</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsOverview;
