import React, { useState, useEffect, useMemo } from 'react';
import { AppView } from '../types';
import ReferenceDetailDrawer from './ReferenceDetailDrawer';
import DuplicateManager from './DuplicateManager';
import { exportCorrectedBibliography } from '../src/lib/exporters/bibliography-exporter';
import { savePageState, loadPageState, setupAutoSave, updatePageState } from '../src/lib/pageStateManager';

interface ResultsOverviewProps {
  onNavigate: (view: AppView) => void;
}

// API Response Types
interface ApiReference {
  id: string;
  bibtex_key: string;
  original_title: string;
  original_authors: string;
  original_year: number;
  original_source: string;
  canonical_title: string | null;
  canonical_authors: string | null;
  canonical_year: number | null;
  status: 'verified' | 'issue' | 'warning' | 'retracted' | 'duplicate' | 'not_found';
  confidence_score: number;
  venue: string | null;
  doi: string | null;
  is_retracted: boolean;
  cited_by_count: number | null;
  google_scholar_url: string | null;
  openalex_url: string | null;
  crossref_url: string | null;
  semantic_scholar_url: string | null;
  issues: string[];
  verified_by: string[];
  ai_insight?: string;
  user_decision?: 'accepted' | 'rejected' | null;
  duplicate_group_id?: string | null;
  is_primary_duplicate?: boolean;
}

type SortField = 'title' | 'status' | 'confidence' | 'year';
type SortOrder = 'asc' | 'desc';

const ResultsOverview: React.FC<ResultsOverviewProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [jobId, setJobId] = useState<string>('');
  const [jobName, setJobName] = useState<string>('bibliography.bib');
  const [references, setReferences] = useState<ApiReference[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'issue' | 'warning'>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRef, setSelectedRef] = useState<ApiReference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ignoredDuplicateGroups, setIgnoredDuplicateGroups] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    referenceId: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [justDeleted, setJustDeleted] = useState(false);

  // Setup page state persistence
  useEffect(() => {
    setupAutoSave();

    // Save current page state
    if (jobId) {
      savePageState({
        route: '/results',
        jobId,
        fileName: jobName,
        activeFilter
      });
    }
  }, [jobId, jobName, activeFilter]);

  // Load Data from API
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (justDeleted) {
        console.log('[Results] Skipping fetch due to recent deletion');
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const storedJobId = localStorage.getItem('current_job_id');
        if (!storedJobId) {
          setError('No job ID found. Please upload a file first.');
          setIsLoading(false);
          return;
        }

        setJobId(storedJobId);

        // Get auth token
        const user = localStorage.getItem('refcheck_user');
        if (!user) {
          setError('Please log in to view results.');
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(user);
        const token = userData.id || userData.uid;

        console.log('[Results] Fetching results for job:', storedJobId);

        const response = await fetch(`/api/results?jobId=${storedJobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[Results] RAW API Response:', data);
        console.log('[Results] Number of references:', data.references?.length);

        if (data.references && data.references.length > 0) {
          console.log('[Results] FIRST REFERENCE STRUCTURE:', JSON.stringify(data.references[0], null, 2));
          console.log('[Results] First ref keys:', Object.keys(data.references[0]));
        }

        if (active) {
          if (data.references && Array.isArray(data.references)) {
            setJobName(data.fileName || 'bibliography.bib');

            // NORMALIZE: Handle both field naming conventions
            const normalizedRefs = data.references.map((ref: any) => ({
              ...ref,
              // Ensure we have BOTH original_* and base fields
              original_title: ref.original_title || ref.title || 'Untitled',
              original_authors: ref.original_authors || ref.authors || 'Unknown',
              original_year: ref.original_year || ref.year || new Date().getFullYear(),
              original_source: ref.original_source || ref.source || '',
              bibtex_key: ref.bibtex_key || ref.key || 'no_key',
              issues: ref.issues || [],
              confidence_score: ref.confidence_score ?? ref.confidence ?? 0,
            }));

            console.log('[Results] NORMALIZED first ref:', JSON.stringify(normalizedRefs[0], null, 2));
            setReferences(normalizedRefs);
            console.log(`[Results] Loaded ${normalizedRefs.length} references`);
          } else {
            console.warn('[Results] No references array in response');
            setReferences([]);
          }
        }
      } catch (error: any) {
        console.error('[Results] Failed to fetch:', error);
        setError(error.message || 'Failed to load results');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchResults();
    return () => { active = false; };
  }, [justDeleted]);

  // Stats
  const stats = useMemo(() => {
    const all = references.length;
    const verified = references.filter(r => r.status === 'verified').length;
    const issues = references.filter(r =>
      r.status === 'issue' || r.status === 'retracted' || r.status === 'not_found'
    ).length;
    const warnings = references.filter(r => r.status === 'warning').length;

    return { all, verified, issues, warnings };
  }, [references]);

  // Group duplicates
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, ApiReference[]>();

    references.forEach(ref => {
      if (ref.duplicate_group_id && !ignoredDuplicateGroups.has(ref.duplicate_group_id)) {
        if (!groups.has(ref.duplicate_group_id)) {
          groups.set(ref.duplicate_group_id, []);
        }
        groups.get(ref.duplicate_group_id)!.push(ref);
      }
    });

    // Only return groups with 2+ references
    return Array.from(groups.entries())
      .filter(([_, refs]) => refs.length >= 2)
      .map(([groupId, refs]) => ({
        groupId,
        references: refs.sort((a, b) => {
          // Primary duplicate first
          if (a.is_primary_duplicate) return -1;
          if (b.is_primary_duplicate) return 1;
          // Then by confidence
          return (b.confidence_score || 0) - (a.confidence_score || 0);
        })
      }));
  }, [references, ignoredDuplicateGroups]);

  // Filtering & Sorting
  const filteredReferences = useMemo(() => {
    let filtered = references;

    // Status Filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'issue') {
        filtered = filtered.filter(r =>
          r.status === 'issue' || r.status === 'retracted' || r.status === 'not_found'
        );
      } else {
        filtered = filtered.filter(r => r.status === activeFilter);
      }
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.original_title?.toLowerCase().includes(query) ||
        r.original_authors?.toLowerCase().includes(query) ||
        r.bibtex_key?.toLowerCase().includes(query) ||
        r.canonical_title?.toLowerCase().includes(query)
      );
    }

    // Sort
    return filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'status') {
        const priority: Record<string, number> = {
          'retracted': 0, 'issue': 1, 'not_found': 2,
          'warning': 3, 'duplicate': 4, 'verified': 5
        };
        aVal = priority[a.status] ?? 99;
        bVal = priority[b.status] ?? 99;
      } else if (sortField === 'confidence') {
        aVal = a.confidence_score || 0;
        bVal = b.confidence_score || 0;
      } else if (sortField === 'title') {
        aVal = a.original_title || '';
        bVal = b.original_title || '';
      } else if (sortField === 'year') {
        aVal = a.original_year || 0;
        bVal = b.original_year || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [references, activeFilter, sortField, sortOrder, searchQuery]);

  // Handle merging duplicates
  const handleMergeDuplicates = async (groupId: string, selectedPrimaryId: string, idsToDelete: string[]) => {
    try {
      const user = localStorage.getItem('refcheck_user');
      if (!user) return;

      const userData = JSON.parse(user);
      const token = userData.id || userData.uid;

      const response = await fetch('/api/merge-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId,
          primaryId: selectedPrimaryId,
          idsToDelete
        }),
      });

      if (response.ok) {
        // Remove merged references from local state
        setReferences(prev => prev.filter(r => !idsToDelete.includes(r.id)));

        // Remove the group from duplicate groups (so it disappears from UI)
        setIgnoredDuplicateGroups(prev => new Set([...prev, groupId]));

        // Show success message
        setSuccessMessage(`✅ Successfully merged ${idsToDelete.length} duplicate${idsToDelete.length > 1 ? 's' : ''}. Your bibliography is now cleaner!`);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);

        console.log(`[Results] Merged duplicates - kept ${selectedPrimaryId}, removed ${idsToDelete.length} duplicates`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to merge duplicates');
      }
    } catch (error: any) {
      console.error('[Results] Failed to merge duplicates:', error);
      setError(`Failed to merge duplicates: ${error.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Handle ignoring a duplicate group
  const handleIgnoreDuplicateGroup = (groupId: string) => {
    setIgnoredDuplicateGroups(prev => new Set([...prev, groupId]));
    console.log(`[Results] Ignored duplicate group: ${groupId}`);
  };

  // Handle export in different formats
  const handleExport = (format: 'bibtex' | 'ris' | 'txt') => {
    try {
      exportCorrectedBibliography(
        references.map(r => ({
          ...r,
          bibtex_type: (r as any).bibtex_type,
          metadata: (r as any).metadata
        })) as any,
        format,
        jobName
      );
      setSuccessMessage(`Exported as ${format.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowExportMenu(false);
    } catch (error) {
      console.error('[Export] Error:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Handle deleting a reference
  const handleDeleteReference = (id: string, title: string) => {
    // Show custom confirmation modal
    setDeleteConfirmation({
      show: true,
      referenceId: id,
      title: title
    });
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (!deleteConfirmation || isDeleting) return;
    const { referenceId: id } = deleteConfirmation;
    setIsDeleting(true);

    try {
      const user = localStorage.getItem('refcheck_user');
      if (!user) return;

      const userData = JSON.parse(user);
      const token = userData.id || userData.uid;

      const response = await fetch(`/api/reference?id=${id}&jobId=${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove from local state
        setReferences(prev => prev.filter(r => r.id !== id));

        // Close drawer if this reference was selected
        if (selectedRef?.id === id) {
          setSelectedRef(null);
        }

        // Show success message
        setSuccessMessage('✅ Reference deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Close modal and set flag
        setDeleteConfirmation(null);
        setIsDeleting(false);
        setJustDeleted(true);
        setTimeout(() => setJustDeleted(false), 2000);

        console.log(`[Results] Deleted reference: ${id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete reference');
      }
    } catch (error: any) {
      console.error('[Results] Failed to delete reference:', error);
      setError(`Failed to delete reference: ${error.message}`);
      setTimeout(() => setError(null), 5000);
      setDeleteConfirmation(null);
      setIsDeleting(false);
    }
  };

  // Handle user accepting/rejecting corrections
  const handleApplyFix = async (id: string, accept: boolean, corrections?: any) => {
    try {
      const user = localStorage.getItem('refcheck_user');
      if (!user) return;

      const userData = JSON.parse(user);
      const token = userData.id || userData.uid;

      // Get the reference to extract corrected data
      const ref = references.find(r => r.id === id);
      if (!ref) return;

      // Use provided corrections or fall back to canonical data
      const correctedData = accept ? (corrections || {
        title: ref.canonical_title || ref.original_title,
        authors: ref.canonical_authors || ref.original_authors,
        year: ref.canonical_year || ref.original_year,
        source: ref.venue || ref.original_source,
        doi: ref.doi,
        bibtex_type: (ref as any).bibtex_type,
        metadata: (ref as any).metadata
      }) : null;

      console.log('[ResultsOverview] Applying corrections:', correctedData);

      const response = await fetch('/api/accept-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: jobId,
          referenceId: id,
          decision: accept ? 'accepted' : 'rejected',
          correctedData: correctedData
        }),
      });

      if (response.ok) {
        // Update local state AND selectedRef to show changes immediately
        setReferences(prev => prev.map(r => {
          if (r.id === id) {
            if (accept) {
              // Apply corrections to DISPLAYED values
              const correctedFields: string[] = [];
              const updated: any = { ...r };

              // Apply specific corrections if provided
              if (correctedData) {
                if (correctedData.title && correctedData.title !== r.original_title) {
                  updated.original_title = correctedData.title;
                  correctedFields.push('title');
                }
                if (correctedData.authors && correctedData.authors !== r.original_authors) {
                  updated.original_authors = correctedData.authors;
                  correctedFields.push('authors');
                }
                if (correctedData.year && correctedData.year !== r.original_year) {
                  updated.original_year = correctedData.year;
                  correctedFields.push('year');
                }
                if (correctedData.source && correctedData.source !== r.original_source) {
                  updated.original_source = correctedData.source;
                  correctedFields.push('venue');
                }
                if (correctedData.doi && correctedData.doi !== r.doi) {
                  updated.doi = correctedData.doi;
                  correctedFields.push('DOI');
                }
              }

              updated.status = 'verified' as const;
              updated.confidence_score = 100;
              updated.issues = correctedFields.length > 0
                ? [`✓ Corrected: ${correctedFields.join(', ')}`]
                : ['✓ Verified'];
              updated.user_decision = 'accepted' as const;

              // Update selectedRef if it's the same reference
              if (selectedRef?.id === id) {
                setSelectedRef(updated);
              }

              return updated;
            } else {
              // Mark as reviewed but keep original - user chose to ignore suggestions
              const updated = {
                ...r,
                user_decision: 'rejected' as const,
                status: 'verified' as const,
                issues: ['⚠ Needs review: User kept original values'] // Indicate user reviewed but didn't accept
              };

              if (selectedRef?.id === id) {
                setSelectedRef(updated);
              }

              return updated;
            }
          }
          return r;
        }));

        // Show success message
        setSuccessMessage(accept ? 'Fix applied successfully' : 'Reference marked as reviewed');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Close drawer
        if (selectedRef?.id === id) {
          setSelectedRef(null);
        }
      }
    } catch (e) {
      console.error("Fix failed", e);
    }
  };

  // Render issue badges
  const renderIssueBadges = (ref: ApiReference) => {
    const issues = ref.issues || [];
    
    // Check for critical issues from OpenAlex API
    const hasRetraction = issues.some(issue => 
      issue.includes('⚠️ RETRACTED PAPER') || 
      issue.toLowerCase().includes('retracted')
    );
    const hasPreprint = issues.some(issue => 
      issue.includes('⚠️ PREPRINT') || 
      issue.toLowerCase().includes('not peer-reviewed')
    );
    
    // CRITICAL: Show retraction badge (highest priority)
    if (ref.status === 'retracted' || hasRetraction) {
      return (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border-2 border-red-300 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">block</span>
            RETRACTED
          </span>
          {hasPreprint && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Preprint
            </span>
          )}
        </div>
      );
    }
    
    // IMPORTANT: Show preprint badge (high priority)
    if (hasPreprint) {
      return (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">science</span>
            PREPRINT
          </span>
          <span className="text-[10px] text-amber-600 font-medium">Not Peer-Reviewed</span>
        </div>
      );
    }

    // Check if this reference was corrected by user
    const hasCorrectedBadge = issues.some(issue => issue.startsWith('✓ Corrected'));
    const hasNeedsReviewBadge = issues.some(issue => issue.includes('Needs review'));

    if (ref.status === 'verified' && hasCorrectedBadge) {
      // Show green "Corrected" badge for user-accepted fixes
      const correctedIssue = issues.find(i => i.startsWith('✓ Corrected')) || '';
      const fieldsFixed = correctedIssue.replace('✓ Corrected: ', '').trim();
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
          <span className="mr-1">✓</span> Corrected {fieldsFixed ? `(${fieldsFixed})` : ''}
        </span>
      );
    }

    if (ref.status === 'verified' && hasNeedsReviewBadge) {
      // Show amber "Needs Review" badge for user-rejected fixes
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
          ⚠ Needs Review
        </span>
      );
    }

    if (ref.status === 'verified' && (!ref.issues || ref.issues.length === 0)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
          Verified
        </span>
      );
    }

    // Show first 2 issues (original behavior for uncorrected issues)
    // Filter out retraction/preprint issues since we handle them above
    const filteredIssues = issues.filter(issue => 
      !issue.includes('⚠️ RETRACTED') && 
      !issue.includes('⚠️ PREPRINT')
    );
    const displayIssues = filteredIssues.slice(0, 2);
    
    return (
      <div className="flex flex-wrap gap-2">
        {displayIssues.map((issue, i) => {
          let colorClass = "bg-warning/10 text-warning border-warning/20";
          if (issue.toLowerCase().includes("missing") ||
            issue.toLowerCase().includes("not found")) {
            colorClass = "bg-error/10 text-error border-error/20";
          }

          // Shorten issue text for display
          const shortIssue = issue.length > 30 ? issue.substring(0, 30) + '...' : issue;

          return (
            <span key={i} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
              {shortIssue}
            </span>
          );
        })}
        {filteredIssues.length > 2 && (
          <span className="text-xs text-slate-400">+{filteredIssues.length - 2} more</span>
        )}
      </div>
    );
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="material-symbols-outlined text-success">check_circle</span>;
      case 'issue':
      case 'not_found':
        return <span className="material-symbols-outlined text-error">cancel</span>;
      case 'warning':
        return <span className="material-symbols-outlined text-warning">warning</span>;
      case 'retracted':
        return <span className="material-symbols-outlined text-error">block</span>;
      case 'duplicate':
        return <span className="material-symbols-outlined text-orange-600">content_copy</span>;
      default:
        return <span className="material-symbols-outlined text-slate-400">help</span>;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-3xl w-full">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 lg:p-12 border border-slate-200 dark:border-slate-700">
            {/* Welcome Icon */}
            <div className="flex justify-center mb-6">
              <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-primary">library_books</span>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3">
                Welcome to RefCheck! 👋
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Let's verify your first bibliography together
              </p>
            </div>

            {/* How It Works */}
            <div className="space-y-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                How RefCheck Works
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">1</div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Upload</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Upload your document (.bib, .pdf, .tex) containing references
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">2</div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Analyze</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    We verify each reference against academic databases
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">3</div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Review</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Get detailed results with issues, corrections, and insights
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">description</span>
                Supported Formats
              </h3>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  .bib (BibTeX)
                </span>
                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  .pdf (PDF Documents)
                </span>
                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  .tex (LaTeX)
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={() => onNavigate(AppView.NEW_CHECK)}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-bold text-lg rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
              >
                <span className="material-symbols-outlined text-2xl">upload_file</span>
                Upload Your First Document
                <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                Free account: 5 checks per month • No credit card required
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              💡 <span className="font-semibold">Pro tip:</span> The more complete your bibliography, the better our verification!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden relative h-[calc(100vh-65px)]">
      {/* Success Message Notification */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-right duration-300">
          <div className="bg-success text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-success/20">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Left Panel: Results Table & Dashboard */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Hero Dashboard Section */}
        <div className="flex-none px-6 py-6 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark z-10">
          <div className="max-w-6xl mx-auto w-full">

            {/* Title & Actions */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight truncate max-w-md" title={jobName}>
                    {jobName}
                  </h1>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded border border-border-light dark:border-border-dark">
                    BibTeX
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Analyzed just now
                </p>
              </div>
              <div className="flex gap-3 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center justify-center rounded-lg h-10 px-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 text-sm font-bold shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Export
                  </button>

                  {/* Export Dropdown Menu */}
                  {showExportMenu && (
                    <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-lg shadow-xl z-50 min-w-[200px]">
                      <div className="p-2">
                        <button
                          onClick={() => handleExport('bibtex')}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                          <div className="text-left">
                            <div className="font-semibold">BibTeX (.bib)</div>
                            <div className="text-xs text-slate-500">LaTeX references</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport('ris')}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                          <div className="text-left">
                            <div className="font-semibold">RIS (.ris)</div>
                            <div className="text-xs text-slate-500">EndNote, Zotero</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleExport('txt')}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">article</span>
                          <div className="text-left">
                            <div className="font-semibold">Plain Text (.txt)</div>
                            <div className="text-xs text-slate-500">Word document</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total References */}
              <div
                onClick={() => setActiveFilter('all')}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-5 border-2 border-primary/30 shadow-soft group cursor-pointer hover:border-primary transition-colors ${activeFilter === 'all' ? 'ring-2 ring-primary border-transparent shadow-lg' : ''}`}
              >
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-primary text-6xl">library_books</span>
                </div>
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">Total References</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.all}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">detected</span>
                </div>
                <div className="w-full bg-primary/20 h-1 mt-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Verified */}
              <div
                onClick={() => setActiveFilter('verified')}
                className={`relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-5 border border-border-light dark:border-border-dark shadow-soft group cursor-pointer hover:border-success/50 transition-colors ${activeFilter === 'verified' ? 'ring-2 ring-success border-transparent' : ''}`}
              >
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-success text-6xl">check_circle</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Verified</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.verified}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                  <div className="bg-success h-full rounded-full" style={{ width: `${stats.all > 0 ? (stats.verified / stats.all) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Issues */}
              <div
                onClick={() => setActiveFilter('issue')}
                className={`relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-5 border border-error ring-1 ring-error/20 shadow-soft cursor-pointer hover:bg-error/5 ${activeFilter === 'issue' ? 'ring-2 ring-error' : ''}`}
              >
                <div className="absolute right-0 top-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-error text-6xl">cancel</span>
                </div>
                <p className="text-error font-bold text-sm mb-1 uppercase tracking-wider">Issues Found</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.issues}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Require attention</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                  <div className="bg-error h-full rounded-full" style={{ width: `${stats.all > 0 ? (stats.issues / stats.all) * 100 : 0}%` }}></div>
                </div>
              </div>

              {/* Warnings */}
              <div
                onClick={() => setActiveFilter('warning')}
                className={`relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-5 border border-border-light dark:border-border-dark shadow-soft group cursor-pointer hover:border-warning/50 transition-colors ${activeFilter === 'warning' ? 'ring-2 ring-warning border-transparent' : ''}`}
              >
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-warning text-6xl">warning</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Warnings</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.warnings}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                  <div className="bg-warning h-full rounded-full" style={{ width: `${stats.all > 0 ? (stats.warnings / stats.all) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-surface-light dark:bg-surface-dark p-1 rounded-lg border border-border-light dark:border-border-dark shadow-sm">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'all' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter('issue')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'issue' ? 'bg-error/10 text-error font-bold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Issues ({stats.issues})
                </button>
                <button
                  onClick={() => setActiveFilter('verified')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'verified' ? 'bg-success/10 text-success font-bold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Verified
                </button>
                <button
                  onClick={() => setActiveFilter('warning')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeFilter === 'warning' ? 'bg-warning/10 text-warning font-bold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Warnings
                </button>
              </div>
              <div className="relative group flex-1 max-w-sm ml-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-surface-light dark:bg-surface-dark placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                  placeholder="Search references..."
                  type="text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6 pt-4">
          <div className="max-w-6xl mx-auto w-full">
            {/* Success Message */}
            {successMessage && (
              <div style={{
                marginBottom: '20px',
                padding: '16px 20px',
                backgroundColor: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '8px',
                color: '#155724',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '16px 20px',
                backgroundColor: '#f8d7da',
                border: '2px solid #dc3545',
                borderRadius: '8px',
                color: '#721c24',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px' }}>❌</span>
                {error}
              </div>
            )}

            {/* Duplicate Manager */}
            {duplicateGroups.length > 0 && (
              <DuplicateManager
                duplicateGroups={duplicateGroups}
                onMergeDuplicates={handleMergeDuplicates}
                onIgnoreGroup={handleIgnoreDuplicateGroup}
              />
            )}

            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-card overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="size-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-indigo-600 dark:text-indigo-400 animate-spin">autorenew</span>
                  </div>
                  <p>Loading references...</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12" scope="col">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-32" scope="col">Key</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" scope="col">Title</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20" scope="col">Year</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-48" scope="col">Issue Type</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28" scope="col">Confidence</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20" scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {filteredReferences.map(ref => (
                      <tr
                        key={ref.id}
                        onClick={() => setSelectedRef(ref)}
                        className={`cursor-pointer transition-colors relative ${selectedRef?.id === ref.id ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      >
                        <td className="px-3 py-4 whitespace-nowrap">
                          {getStatusIcon(ref.status)}
                          {selectedRef?.id === ref.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-medium text-primary dark:text-primary-light bg-primary/5 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {ref.bibtex_key || 'no_key'}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {ref.original_title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1" title={ref.original_authors}>
                            {ref.original_authors}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                          {ref.original_year || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {renderIssueBadges(ref)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap align-middle">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${ref.confidence_score > 80 ? 'bg-success' : ref.confidence_score > 50 ? 'bg-warning' : 'bg-error'}`}
                              style={{ width: `${ref.confidence_score}%` }}>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {ref.confidence_score}% Match
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleDeleteReference(ref.id, ref.original_title);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-error hover:bg-error/10 transition-colors"
                            title="Delete this reference"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {filteredReferences.length > 0 && (
              <div className="flex items-center justify-between px-2 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {filteredReferences.length} of {stats.all} references
                </p>
                <div className="flex gap-2">
                  <button className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Drawer Panel */}
      {selectedRef && (
        <ReferenceDetailDrawer
          reference={{
            id: selectedRef.id,
            key: selectedRef.bibtex_key || 'unknown',
            title: selectedRef.original_title || 'Untitled',
            authors: selectedRef.original_authors || 'Unknown',
            year: selectedRef.original_year || new Date().getFullYear(),
            source: selectedRef.original_source || '',
            status: selectedRef.status as any,
            issues: selectedRef.issues || [],
            confidence: selectedRef.confidence_score || 0,
            doi: selectedRef.doi || undefined,
            canonicalTitle: selectedRef.canonical_title || undefined,
            canonicalYear: selectedRef.canonical_year || undefined,
            canonicalAuthors: selectedRef.canonical_authors || undefined,
            venue: selectedRef.venue || undefined,
          }}
          isOpen={selectedRef !== null}
          onClose={() => setSelectedRef(null)}
          onApplyFix={handleApplyFix}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-error/5 dark:bg-error/10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error/10 dark:bg-error/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Reference?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Are you sure you want to permanently delete this reference?
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-3">
                  "{deleteConfirmation.title}"
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${isDeleting ? 'bg-error/50 cursor-not-allowed' : 'bg-error hover:bg-error/90'}`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete Reference
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsOverview;
