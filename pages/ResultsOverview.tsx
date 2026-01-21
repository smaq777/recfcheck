
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Reference, ReferenceStatus, DuplicateGroup } from '../types';
import { verifyWithOpenAlex, getAiVerificationInsight } from '../services';

interface ResultsOverviewProps {
  onNavigate: (view: AppView) => void;
}

const ResultsOverview: React.FC<ResultsOverviewProps> = ({ onNavigate }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReferenceStatus | 'all'>('all');
  const [jobId, setJobId] = useState<string>('');
  const [references, setReferences] = useState<Reference[]>([]);

  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Fetch actual results from API
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // Get jobId from localStorage
        const storedJobId = localStorage.getItem('current_job_id');
        console.log('📋 JobID from localStorage:', storedJobId);
        if (!storedJobId) {
          console.error('No job ID found');
          setIsLoading(false);
          return;
        }
        
        setJobId(storedJobId);
        
        // Fetch results from API
        console.log('🔄 Fetching results for job:', storedJobId);
        const response = await fetch(`/api/results?jobId=${storedJobId}`);
        console.log('📥 API Response status:', response.status);
        if (!response.ok) {
          console.error('Failed to fetch results:', response.status);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('📊 API Response data:', data);
        
        if (!active) return;
        
        // Convert API response to Reference format
        if (data.references && Array.isArray(data.references)) {
          console.log(`✅ Converting ${data.references.length} references`);
          const convertedRefs: Reference[] = data.references.map((ref: any, idx: number) => ({
            id: ref.id || `ref_${idx}`,
            key: ref.bibtex_key || `ref${idx}`,
            title: ref.title || 'Unknown Title',
            authors: ref.authors || 'Unknown Author',
            year: ref.year || new Date().getFullYear(),
            source: ref.source || ref.venue || 'Unknown Venue',
            doi: ref.doi || '',
            status: ref.status as ReferenceStatus || 'warning',
            issues: ref.issues || [],
            confidence: ref.confidence_score || 0,
            canonicalTitle: ref.canonical_title,
            canonicalYear: ref.canonical_year,
            venue: ref.venue,
          }));
          console.log('📝 Converted references:', convertedRefs);
          setReferences(convertedRefs);
        } else {
          console.warn('⚠️ No references in response:', data);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    
    fetchResults();
    return () => { active = false; };
  }, []);

  const handleApplyFix = async (id: string, accept: boolean) => {
    const ref = references.find(r => r.id === id);
    if (!ref) return;

    try {
      const response = await fetch('/api/accept-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          referenceId: id,
          decision: accept ? 'accepted' : 'rejected',
          correctedData: accept ? {
            title: ref.canonicalTitle,
            authors: ref.canonicalAuthors,
            year: ref.canonicalYear,
          } : null,
        }),
      });

      if (response.ok) {
        setReferences(prev => prev.map(r => {
          if (r.id === id) {
            return { 
              ...r, 
              status: accept ? 'verified' : r.status,
              issues: accept ? [] : r.issues,
              title: accept ? (r.canonicalTitle || r.title) : r.title,
              year: accept ? (r.canonicalYear || r.year) : r.year,
              source: accept ? (r.venue || r.source) : r.source,
              confidence: accept ? 100 : r.confidence,
              userDecision: accept ? 'accepted' : 'rejected',
            };
          }
          return r;
        }));
        setSelectedRef(null);
      }
    } catch (error) {
      console.error('Failed to apply fix:', error);
    }
  };

  const handleExportBibTeX = async () => {
    try {
      window.open(`/api/export?jobId=${jobId}&format=bib`, '_blank');
      setShowExportOptions(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const openExternalLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const stats = useMemo(() => ({
    all: references.length,
    verified: references.filter(r => r.status === 'verified').length,
    issues: references.filter(r => ['issue', 'retracted', 'not_found'].includes(r.status)).length,
    warnings: references.filter(r => r.status === 'warning').length,
    duplicates: references.filter(r => r.status === 'duplicate').length,
  }), [references]);

  // Group duplicates together
  const duplicateGroups = useMemo(() => {
    const duplicates = references.filter(r => r.status === 'duplicate');
    const groups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (const ref of duplicates) {
      if (processed.has(ref.id)) continue;

      // Find all references with similar titles (case-insensitive)
      const similarRefs = duplicates.filter(r => {
        if (processed.has(r.id)) return false;
        
        const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const titleA = normalize(ref.title);
        const titleB = normalize(r.title);
        
        // Consider them duplicates if titles are very similar or exact match
        return titleA === titleB || 
               titleA.includes(titleB) || 
               titleB.includes(titleA) ||
               (ref.doi && r.doi && ref.doi === r.doi);
      });

      if (similarRefs.length > 0) {
        // Mark all as processed
        similarRefs.forEach(r => processed.add(r.id));

        // Find the canonical/best version (with DOI or highest confidence)
        const canonical = similarRefs.reduce((best, current) => {
          if (current.doi && !best.doi) return current;
          if (current.confidence > best.confidence) return current;
          return best;
        }, similarRefs[0]);

        // Check if any duplicate has issues beyond just being a duplicate
        const hasIssues = similarRefs.some(r => 
          r.issues && r.issues.some(issue => 
            !issue.toLowerCase().includes('duplicate')
          )
        );

        groups.push({
          id: `dup_group_${groups.length}`,
          references: similarRefs,
          canonicalReference: canonical,
          hasIssues,
        });
      }
    }

    return groups;
  }, [references]);

  const filteredRefs = useMemo(() => {
    // When showing duplicates, we'll handle them separately
    if (activeFilter === 'duplicate') {
      return []; // Duplicates are shown via duplicateGroups
    }
    // For 'all', exclude duplicates as they're shown in their own groups
    const nonDuplicates = references.filter(r => r.status !== 'duplicate');
    if (activeFilter === 'all') {
      return nonDuplicates;
    }
    return nonDuplicates.filter(r => r.status === activeFilter);
  }, [references, activeFilter]);

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

  // Handle merging duplicates - keep one, mark others as deleted
  const handleMergeDuplicates = async (group: DuplicateGroup, keepId: string) => {
    try {
      const toDelete = group.references.filter(r => r.id !== keepId);
      
      // In a real implementation, you'd call an API to mark these as merged/deleted
      // For now, we'll just update the local state
      setReferences(prev => prev.filter(r => !toDelete.find(d => d.id === r.id)));
      
      // If the kept one has issues, might want to show correction options
      const kept = group.references.find(r => r.id === keepId);
      if (kept?.canonicalTitle && kept.issues && kept.issues.length > 0) {
        setSelectedRef(kept);
      }
      
      console.log(`Merged ${toDelete.length} duplicates, kept ${keepId}`);
    } catch (error) {
      console.error('Failed to merge duplicates:', error);
    }
  };

  // Handle removing all duplicates in a group (when they're just duplicates, no other issues)
  const handleRemoveAllDuplicates = async (group: DuplicateGroup) => {
    try {
      // Keep the canonical (best) version, remove the rest
      const canonical = group.canonicalReference || group.references[0];
      const toRemove = group.references.filter(r => r.id !== canonical.id);
      
      setReferences(prev => prev.map(r => {
        if (r.id === canonical.id) {
          // Mark the canonical as verified if it has no other issues
          return {
            ...r,
            status: 'verified' as ReferenceStatus,
            issues: [],
          };
        }
        return r;
      }).filter(r => !toRemove.find(d => d.id === r.id)));
      
      console.log(`Removed ${toRemove.length} duplicates, kept canonical ${canonical.id}`);
    } catch (error) {
      console.error('Failed to remove duplicates:', error);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50">
      <main className="flex-1 flex flex-col p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/10">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">autorenew</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Retrieving Results...</h2>
                <p className="text-slate-500">Analysis ID: {jobId}</p>
              </div>
            </div>
          ) : references.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-slate-300">inbox</span>
                <h2 className="text-2xl font-bold text-slate-900">No Results Found</h2>
                <p className="text-slate-500">The uploaded file may not have any valid bibliography entries.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">📊 Audit Results</h1>
                  <p className="text-slate-500 font-medium mt-1">Found {references.length} references</p>
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
            {/* Show duplicate groups when filtering by duplicates */}
            {activeFilter === 'duplicate' && duplicateGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <span className="material-symbols-outlined text-6xl text-slate-300">check_circle</span>
                  <h2 className="text-2xl font-bold text-slate-900">No Duplicates Found</h2>
                  <p className="text-slate-500">All references appear to be unique.</p>
                </div>
              </div>
            )}

            {activeFilter === 'duplicate' && duplicateGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-3xl border-2 border-purple-200 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all">
                {/* Group Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="size-16 md:size-20 rounded-[1.5rem] bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[40px] font-black">content_copy</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        {group.references.length} Duplicates Found
                      </span>
                      {group.hasIssues && (
                        <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          Has Issues
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {group.canonicalReference?.canonicalTitle || group.canonicalReference?.title || group.references[0].title}
                    </h3>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      {group.canonicalReference?.canonicalAuthors || group.canonicalReference?.authors || group.references[0].authors} • {group.canonicalReference?.canonicalYear || group.canonicalReference?.year || group.references[0].year}
                    </p>
                  </div>
                </div>

                {/* Duplicate Instances */}
                <div className="space-y-3 mb-6 pl-4 border-l-4 border-purple-100">
                  {group.references.map((ref, idx) => (
                    <div key={ref.id} className="bg-slate-50 rounded-2xl p-4 relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-0.5 rounded">
                              {ref.key}
                            </span>
                            {ref.doi && (
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">link</span>
                                {ref.doi}
                              </span>
                            )}
                            {ref === group.canonicalReference && (
                              <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                Best Version
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-700 line-clamp-2">{ref.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{ref.authors} • {ref.year} • {ref.source || 'No Venue'}</p>
                          
                          {/* Show issues for this instance */}
                          {ref.issues && ref.issues.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {ref.issues.filter(issue => !issue.toLowerCase().includes('duplicate')).map(issue => (
                                <span key={issue} className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200">
                                  {issue}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                              <div 
                                className={`h-full transition-all ${ref.confidence > 90 ? 'bg-green-500' : ref.confidence > 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${ref.confidence}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-400">{ref.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                  {group.hasIssues ? (
                    <>
                      <button 
                        onClick={() => setSelectedRef(group.canonicalReference || group.references[0])}
                        className="flex-1 h-12 px-6 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                      >
                        <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
                        Review & Correct
                      </button>
                      <button 
                        onClick={() => handleMergeDuplicates(group, group.canonicalReference?.id || group.references[0].id)}
                        className="flex-1 h-12 px-6 rounded-xl border-2 border-purple-200 text-purple-700 font-bold flex items-center justify-center gap-2 hover:bg-purple-50 transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">merge</span>
                        Merge Duplicates
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-900">No Issues Detected</p>
                          <p className="text-xs text-green-700">These are just duplicates of the same paper</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveAllDuplicates(group)}
                        className="h-12 px-8 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-purple-600/20 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[20px]">cleaning_services</span>
                        Keep Best & Remove Duplicates
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Regular reference cards (non-duplicates) */}
            {activeFilter !== 'duplicate' && filteredRefs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <span className="material-symbols-outlined text-6xl text-slate-300">check_circle</span>
                  <h2 className="text-2xl font-bold text-slate-900">No {activeFilter === 'all' ? '' : activeFilter} References</h2>
                  <p className="text-slate-500">
                    {activeFilter === 'all' 
                      ? 'No references found.' 
                      : `No references with status "${activeFilter}".`}
                  </p>
                </div>
              </div>
            )}

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
            </>
          )}
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

              {/* Issue-by-issue breakdown with before/after */}
              <div className="space-y-8">
                {selectedRef.issues?.filter(i => i !== 'Auditing...').length > 0 && selectedRef.canonicalTitle ? (
                  // Only show before/after if there's a suggested correction
                  selectedRef.issues?.filter(i => i !== 'Auditing...').map((issue, idx) => (
                    <section key={idx} className="space-y-4 border-l-4 border-primary/20 pl-6 py-2 animate-fade-in-up">
                      <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">{issue} <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded">Detected</span></h5>
                      <div className="grid gap-3">
                        {/* BEFORE: Original from user */}
                        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 relative">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-error text-sm">error</span>
                            <span className="absolute -top-2 left-10 px-2 bg-red-50 text-[8px] font-black text-error uppercase">Your Source (Before)</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-bold text-slate-600"><span className="text-[10px] text-slate-400 uppercase mr-2">Title:</span>{(selectedRef as any).original_title || selectedRef.title}</p>
                            <p className="font-bold text-slate-600"><span className="text-[10px] text-slate-400 uppercase mr-2">Authors:</span>{(selectedRef as any).original_authors || selectedRef.authors}</p>
                            <p className="font-bold text-slate-600"><span className="text-[10px] text-slate-400 uppercase mr-2">Year:</span>{(selectedRef as any).original_year || selectedRef.year}</p>
                          </div>
                        </div>
                        
                        {/* AFTER: Corrected from registries */}
                        <div className="p-5 rounded-2xl bg-green-50 border-2 border-success/30 shadow-sm relative">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-success text-sm">check_circle</span>
                            <span className="absolute -top-2 left-10 px-2 bg-green-50 text-[8px] font-black text-success uppercase">Suggested Correction</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-black text-slate-900"><span className="text-[10px] text-slate-400 uppercase mr-2">Title:</span>{selectedRef.canonicalTitle}</p>
                            <p className="font-black text-slate-900"><span className="text-[10px] text-slate-400 uppercase mr-2">Authors:</span>{selectedRef.canonicalAuthors || selectedRef.authors}</p>
                            <p className="font-black text-slate-900"><span className="text-[10px] text-slate-400 uppercase mr-2">Year:</span>{selectedRef.canonicalYear || selectedRef.year}</p>
                            {selectedRef.venue && <p className="font-black text-slate-900"><span className="text-[10px] text-slate-400 uppercase mr-2">Venue:</span>{selectedRef.venue}</p>}
                            {selectedRef.doi && <p className="font-mono text-xs text-primary"><span className="text-[10px] text-slate-400 uppercase mr-2">DOI:</span>{selectedRef.doi}</p>}
                          </div>
                          
                          {/* External viewing links */}
                          <div className="mt-4 pt-4 border-t border-border-light">
                            <p className="text-[10px] text-slate-500 font-black uppercase mb-3">View Reference At:</p>
                            <div className="flex flex-wrap gap-2">
                              {(selectedRef as any).google_scholar_url && (
                                <button onClick={() => openExternalLink((selectedRef as any).google_scholar_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                                  <span className="material-symbols-outlined text-sm">school</span> Google Scholar
                                </button>
                              )}
                              {(selectedRef as any).openalex_url && (
                                <button onClick={() => openExternalLink((selectedRef as any).openalex_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                                  <span className="material-symbols-outlined text-sm">public</span> OpenAlex
                                </button>
                              )}
                              {(selectedRef as any).crossref_url && (
                                <button onClick={() => openExternalLink((selectedRef as any).crossref_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                                  <span className="material-symbols-outlined text-sm">link</span> Crossref
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-border-light"><p className="text-[10px] text-slate-500 leading-relaxed"><span className="font-black text-slate-900 uppercase mr-1">Why this matters:</span> This appears to be a typo or formatting error. The corrected version matches the official registry.</p></div>
                          
                          {/* Accept/Reject Buttons */}
                          <div className="mt-4 flex gap-2">
                            <button onClick={() => handleApplyFix(selectedRef.id, true)} className="flex-1 h-10 px-4 rounded-xl bg-success text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-sm">check</span> Accept Correction
                            </button>
                            <button onClick={() => handleApplyFix(selectedRef.id, false)} className="flex-1 h-10 px-4 rounded-xl border-2 border-error text-error text-xs font-bold hover:bg-error hover:text-white transition-all flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-sm">close</span> Keep Mine
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  ))
                ) : (
                  // No correction needed - just show reference info
                  <section className="space-y-4 bg-green-50 border-2 border-success/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-success text-2xl">check_circle</span>
                      <h5 className="text-sm font-black text-slate-900">Reference Verified</h5>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">This reference has been successfully verified in academic registries. No corrections needed.</p>
                    
                    {/* External viewing links */}
                    {((selectedRef as any).google_scholar_url || (selectedRef as any).openalex_url || (selectedRef as any).crossref_url) && (
                      <div className="mt-4 pt-4 border-t border-success/20">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-3">View Reference At:</p>
                        <div className="flex flex-wrap gap-2">
                          {(selectedRef as any).google_scholar_url && (
                            <button onClick={() => openExternalLink((selectedRef as any).google_scholar_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                              <span className="material-symbols-outlined text-sm">school</span> Google Scholar
                            </button>
                          )}
                          {(selectedRef as any).openalex_url && (
                            <button onClick={() => openExternalLink((selectedRef as any).openalex_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                              <span className="material-symbols-outlined text-sm">public</span> OpenAlex
                            </button>
                          )}
                          {(selectedRef as any).crossref_url && (
                            <button onClick={() => openExternalLink((selectedRef as any).crossref_url)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 text-[10px] font-bold transition-all">
                              <span className="material-symbols-outlined text-sm">link</span> Crossref
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* AI Expert Insight */}
              <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10 space-y-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">psychology</span> Gemini AI Diagnostic</span>
                {isAiLoading ? <div className="space-y-3 animate-pulse"><div className="h-2 bg-primary/10 rounded w-full"></div><div className="h-2 bg-primary/10 rounded w-5/6"></div></div> : aiInsight ? <p className="text-sm font-medium text-slate-700 italic border-l-2 border-primary/20 pl-4 leading-relaxed">"{aiInsight}"</p> : <button onClick={() => handleFetchAi(selectedRef)} className="w-full h-12 bg-white border border-primary/20 rounded-xl text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Generate Diagnostic</button>}
              </section>

              <div className="pt-6 space-y-4">
                <button onClick={() => handleApplyFix(selectedRef.id, true)} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"><span className="material-symbols-outlined">auto_fix_high</span> Accept All Fixes</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleApplyFix(selectedRef.id, false)} className="h-14 border border-border-light rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all">Keep Original</button>
                  <button className="h-14 border border-error/30 rounded-2xl text-xs font-black text-error/60 uppercase tracking-widest hover:bg-red-50 hover:text-error transition-all">Delete</button>
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
