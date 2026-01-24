import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Reference, ReferenceStatus } from '../types';
import ReferenceDetailModal from './ReferenceDetailModal';

interface ResultsOverviewProps {
  onNavigate: (view: AppView) => void;
}

type SortField = 'title' | 'status' | 'confidence';
type SortOrder = 'asc' | 'desc';

const ResultsOverview: React.FC<ResultsOverviewProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [jobId, setJobId] = useState<string>('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [activeFilter, setActiveFilter] = useState<ReferenceStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const storedJobId = localStorage.getItem('current_job_id');
        if (!storedJobId) {
          setIsLoading(false);
          return;
        }
        
        setJobId(storedJobId);
        const response = await fetch(`/api/results?jobId=${storedJobId}`);
        if (!response.ok) {
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        if (active && data.references) {
          setReferences(data.references.map((ref: any) => ({
            ...ref,
            status: ref.status as ReferenceStatus,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchResults();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    all: references.length,
    verified: references.filter(r => r.status === 'verified').length,
    issues: references.filter(r => ['issue', 'retracted', 'not_found'].includes(r.status)).length,
    warnings: references.filter(r => r.status === 'warning').length,
  }), [references]);

  const filteredReferences = useMemo(() => {
    let filtered = references;
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(r => r.status === activeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title?.toLowerCase().includes(query) ||
        r.authors?.toLowerCase().includes(query) ||
        r.doi?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'confidence') {
        aVal = a.confidence || 0;
        bVal = b.confidence || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [references, activeFilter, sortField, sortOrder, searchQuery]);

  const handleApplyFix = async (id: string, accept: boolean) => {
    try {
      const response = await fetch('/api/accept-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceId: id,
          correctedData: accept ? {
            title: (references.find(r => r.id === id) as any)?.canonicalTitle,
            authors: (references.find(r => r.id === id) as any)?.canonicalAuthors,
            year: (references.find(r => r.id === id) as any)?.canonicalYear,
          } : null,
        }),
      });

      if (response.ok) {
        setReferences(prev => prev.map(r => {
          if (r.id === id) {
            return { 
              ...r, 
              status: 'verified' as ReferenceStatus,
              confidence: 100,
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

  const handleExportBibTeX = () => {
    window.open(`/api/export?jobId=${jobId}&format=bib`, '_blank');
    setShowExportOptions(false);
  };

  const getStatusIcon = (status: ReferenceStatus) => {
    switch (status) {
      case 'verified':
        return <span className="material-symbols-outlined text-green-500 dark:text-green-400">check_circle</span>;
      case 'warning':
        return <span className="material-symbols-outlined text-yellow-500 dark:text-yellow-400">warning</span>;
      case 'issue':
        return <span className="material-symbols-outlined text-red-500 dark:text-red-400">error</span>;
      case 'retracted':
        return <span className="material-symbols-outlined text-red-600 dark:text-red-500">block</span>;
      default:
        return <span className="material-symbols-outlined text-gray-400">help</span>;
    }
  };

  const getStatusBadgeColor = (status: ReferenceStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'issue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'retracted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafb] to-[#eef1f7] dark:from-[#191d2e] dark:to-[#232942] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5eaf1] dark:border-[#2f3656] bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-lg">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 text-[#2c346d] dark:text-indigo-400">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M24 4L4 14v20c0 8 20 10 20 10s20-2 20-10V14L24 4z"/>
              </svg>
            </div>
            <h1 className="text-[#2c346d] dark:text-white text-lg font-bold">RefCheck</h1>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Results Overview
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 md:px-10 py-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="size-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-indigo-600 dark:text-indigo-400 animate-spin">autorenew</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Loading Results...</h2>
              <p className="text-gray-600 dark:text-gray-400">Job ID: {jobId}</p>
            </div>
          </div>
        ) : references.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">inbox</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">No Results Found</h2>
              <p className="text-gray-600 dark:text-gray-400">The uploaded file may not have any valid bibliography entries.</p>
              <button onClick={() => onNavigate(AppView.NEW_CHECK)} className="mt-6 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">
                Upload Another File
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Verification Results</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Found {references.length} references</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    className="h-12 px-6 rounded-xl bg-white dark:bg-gray-800 border border-[#e5eaf1] dark:border-[#2f3656] text-gray-700 dark:text-gray-300 font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
                  >
                    <span className="material-symbols-outlined">ios_share</span> Export
                  </button>
                  {showExportOptions && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-[#e5eaf1] dark:border-[#2f3656] rounded-xl shadow-xl z-50 overflow-hidden">
                      <button onClick={handleExportBibTeX} className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-[#e5eaf1] dark:border-[#2f3656]">
                        <span className="material-symbols-outlined text-sm">code</span> BibTeX
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm">table_view</span> CSV
                      </button>
                    </div>
                  )}
                </div>
                <button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#2c346d] to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all">
                  Apply Safe Fixes
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-[#e5eaf1] dark:border-[#2f3656]">
                <div className="text-2xl font-black text-[#2c346d] dark:text-indigo-400">{stats.all}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Total</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-[#e5eaf1] dark:border-[#2f3656]">
                <div className="text-2xl font-black text-green-600 dark:text-green-400">{stats.verified}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Verified</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-[#e5eaf1] dark:border-[#2f3656]">
                <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{stats.warnings}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Warnings</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-[#e5eaf1] dark:border-[#2f3656]">
                <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.issues}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Issues</p>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e5eaf1] dark:border-[#2f3656] p-6">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input 
                    type="text"
                    placeholder="Search by title, authors, or DOI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-[#e5eaf1] dark:border-[#2f3656] rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'verified', 'warning', 'issue', 'retracted'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setActiveFilter(status)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        activeFilter === status
                          ? 'bg-[#2c346d] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Sort Options */}
                <div className="flex gap-2 text-sm">
                  <select 
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="px-3 py-2 border border-[#e5eaf1] dark:border-[#2f3656] rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="title">Sort by Title</option>
                    <option value="status">Sort by Status</option>
                    <option value="confidence">Sort by Confidence</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-[#e5eaf1] dark:border-[#2f3656] rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <span className="material-symbols-outlined">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e5eaf1] dark:border-[#2f3656] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-[#e5eaf1] dark:border-[#2f3656]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Title</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Authors</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Year</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Confidence</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eaf1] dark:divide-[#2f3656]">
                    {filteredReferences.map((ref) => (
                      <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{ref.title || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ref.authors?.split(',')[0] || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ref.year || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${getStatusBadgeColor(ref.status)}`}>
                            <span className="text-base">{getStatusIcon(ref.status)}</span>
                            {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-blue-600"
                                style={{ width: `${ref.confidence || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{ref.confidence || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <button 
                            onClick={() => {
                              setSelectedRef(ref);
                              setShowDetailModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 font-semibold text-xs"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reference Detail Modal with Comparison */}
      <ReferenceDetailModal
        isOpen={showDetailModal && selectedRef !== null}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRef(null);
        }}
        referenceId={selectedRef?.id || ''}
        title={selectedRef?.title || ''}
        issueType={selectedRef?.status === 'issue' || selectedRef?.status === 'retracted' ? 'error' : 'warning'}
        mismatches={[
          {
            field: 'TITLE',
            yourBibtex: selectedRef?.title || '',
            canonical: (selectedRef as any)?.canonicalTitle || selectedRef?.title || '',
            isCritical: selectedRef?.status === 'issue',
          },
          {
            field: 'YEAR',
            yourBibtex: String(selectedRef?.year || ''),
            canonical: String((selectedRef as any)?.canonicalYear || selectedRef?.year || ''),
            isCritical: false,
          },
          {
            field: 'AUTHOR',
            yourBibtex: selectedRef?.authors?.split(',')[0] || '',
            canonical: ((selectedRef as any)?.canonicalAuthors || selectedRef?.authors || '').split(',')[0],
            isCritical: false,
          },
        ]}
        quickFixes={[
          {
            id: 'add-doi',
            title: 'Add missing DOI',
            description: 'Format to "LastName, FirstName"',
            suggestion: (selectedRef as any)?.suggestedDoi || '10.1109/TOSE.2022.3158900',
            icon: '🔗',
          },
          {
            id: 'normalize-authors',
            title: 'Normalize Author Names',
            description: 'Format to "LastName, FirstName"',
            suggestion: (selectedRef as any)?.normalizedAuthors || selectedRef?.authors || '',
            icon: '👥',
          },
        ]}
        onApplyFix={(fixId) => {
          console.log('Applied fix:', fixId);
        }}
        onUpdateReference={() => {
          if (selectedRef) {
            handleApplyFix(selectedRef.id, true);
          }
        }}
        onIgnore={() => {
          setShowDetailModal(false);
          setSelectedRef(null);
        }}
      />
    </div>
  );
};

const getStatusBadgeColor = (status: ReferenceStatus) => {
  switch (status) {
    case 'verified':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800';
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800';
    case 'issue':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800';
    case 'retracted':
      return 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-400 dark:border-red-700';
    case 'not_found':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  }
};

export default ResultsOverview;
