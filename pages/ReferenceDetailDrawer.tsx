import React, { useState } from 'react';
import { Reference, ReferenceStatus } from '../types';

interface ReferenceDetailDrawerProps {
  reference: Reference | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyFix?: (id: string, accept: boolean) => void;
}

interface QuickFix {
  id: string;
  field: string;
  icon: string;
  title: string;
  description: string;
  value: string;
  applied: boolean;
}

type TabType = 'summary' | 'differences' | 'suggestions' | 'history';

const ReferenceDetailDrawer: React.FC<ReferenceDetailDrawerProps> = ({
  reference,
  isOpen,
  onClose,
  onApplyFix,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (!reference) return null;

  // Get values with fallback for both naming conventions (canonical_title vs canonicalTitle)
  const canonicalTitle = (reference as any).canonical_title || reference.canonicalTitle;
  const canonicalYear = (reference as any).canonical_year || reference.canonicalYear;
  const canonicalAuthors = (reference as any).canonical_authors || reference.canonicalAuthors;
  const originalTitle = (reference as any).original_title || reference.title;
  const originalYear = (reference as any).original_year || reference.year;
  const originalAuthors = (reference as any).original_authors || reference.authors;
  const venue = reference.venue;
  const doi = reference.doi;

  // Detect differences between original and canonical
  const differences = [];

  if (canonicalTitle && originalTitle !== canonicalTitle) {
    differences.push({
      field: 'Title',
      original: originalTitle,
      canonical: canonicalTitle,
      isCritical: true
    });
  }

  if (canonicalYear && Number(originalYear) !== Number(canonicalYear)) {
    differences.push({
      field: 'Year',
      original: String(originalYear),
      canonical: String(canonicalYear),
      isCritical: true
    });
  }

  if (canonicalAuthors && originalAuthors !== canonicalAuthors) {
    differences.push({
      field: 'Author',
      original: originalAuthors,
      canonical: canonicalAuthors,
      isCritical: false
    });
  }

  // Add venue if present (shown in Differences tab)
  if (venue) {
    differences.push({
      field: 'Venue',
      original: (reference as any).original_source || reference.source || 'N/A',
      canonical: venue,
      isCritical: false
    });
  }

  // Add DOI comparison (shown in Differences tab) - ONLY if there's an actual difference
  if (doi) {
    // Don't show "Not in your upload" if user already provided the DOI
    const showDoiDifference = false; // DOI from upload is already correct
  } else {
    // User didn't provide DOI - show as info, not a critical difference
    differences.push({
      field: 'DOI',
      original: 'Not provided in upload',
      canonical: 'Consider adding for better tracking',
      isCritical: false
    });
  }

  // Generate quick fixes based on differences detected
  const quickFixes: QuickFix[] = [];

  // Note: Using variables already declared above (canonicalTitle, originalTitle, etc.)
  // IMPORTANT: In the database, 'doi' field IS the original DOI from user's upload
  // The API doesn't return a separate canonical DOI, it validates the existing one
  const userUploadDoi = doi; // This is what the user uploaded
  const hasUserDoi = Boolean(doi && doi.trim());

  // Debug logging
  console.log('[QuickFixes] Reference data:', {
    canonical_title: canonicalTitle,
    original_title: originalTitle,
    canonical_authors: canonicalAuthors,
    original_authors: originalAuthors,
    canonical_year: canonicalYear,
    original_year: originalYear,
    user_doi: userUploadDoi,
    has_doi: hasUserDoi
  });

  // Fix 1: Add DOI - ONLY if user didn't provide one AND verification found issues
  // Skip this fix if user already has a DOI in their upload
  const needsDoiFix = !hasUserDoi && reference.issues?.some((issue: string) =>
    issue.toLowerCase().includes('doi') || issue.toLowerCase().includes('identifier')
  );

  if (needsDoiFix && doi && doi.trim() !== '' && doi !== 'N/A') {
    quickFixes.push({
      id: 'add-doi',
      field: 'DOI',
      icon: 'link',
      title: 'Add missing DOI',
      description: 'Digital Object Identifier found in academic database',
      value: doi,
      applied: false
    });
  }

  // Fix 2: Title correction (if canonical is different and exists)
  if (canonicalTitle && originalTitle && canonicalTitle.toLowerCase() !== originalTitle.toLowerCase()) {
    quickFixes.push({
      id: 'fix-title',
      field: 'Title',
      icon: 'spellcheck',
      title: 'Correct title',
      description: `Update to verified database version`,
      value: canonicalTitle,
      applied: false
    });
  }

  // Fix 3: Year correction
  if (canonicalYear && originalYear && Number(canonicalYear) !== Number(originalYear)) {
    quickFixes.push({
      id: 'fix-year',
      field: 'Year',
      icon: 'calendar_today',
      title: 'Correct publication year',
      description: `Change from ${originalYear} to ${canonicalYear}`,
      value: String(canonicalYear),
      applied: false
    });
  }

  // Fix 4: Author normalization (expand "et al." or add missing authors)
  if (canonicalAuthors && originalAuthors &&
    canonicalAuthors.toLowerCase().trim() !== originalAuthors.toLowerCase().trim()) {
    // Parse authors - handle both comma-separated and "AND" separated formats
    const parseAuthors = (str: string) => {
      return str.split(/\s+(?:and|AND)\s+|[,;&]/).map(a => a.trim()).filter(a => a.length > 0);
    };
    const originalCount = parseAuthors(originalAuthors).length;
    const canonicalCount = parseAuthors(canonicalAuthors).length;

    if (originalCount !== canonicalCount || originalAuthors.includes('et al')) {
      quickFixes.push({
        id: 'fix-authors',
        field: 'Authors',
        icon: 'group',
        title: `Update author list (${originalCount} → ${canonicalCount} authors)`,
        description: 'Complete verified author list from academic database',
        value: canonicalAuthors,
        applied: false
      });
    } else {
      // Just formatting differences
      quickFixes.push({
        id: 'normalize-authors',
        field: 'Authors',
        icon: 'group',
        title: 'Normalize author names',
        description: 'Format to standard citation style',
        value: canonicalAuthors,
        applied: false
      });
    }
  }

  // Fix 5: Add venue/publication info
  if (venue && !reference.source) {
    quickFixes.push({
      id: 'add-venue',
      field: 'Venue',
      icon: 'location_on',
      title: 'Add publication venue',
      description: 'Journal/conference information from database',
      value: venue,
      applied: false
    });
  }

  console.log(`[QuickFixes] Generated ${quickFixes.length} fixes:`, quickFixes.map(f => f.id));

  const handleApplyQuickFix = (fixId: string) => {
    setAppliedFixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fixId)) {
        newSet.delete(fixId);
      } else {
        newSet.add(fixId);
      }
      return newSet;
    });
  };

  const handleUpdateReference = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      if (!onApplyFix) {
        throw new Error("Update handler not available");
      }

      // Build corrections object from applied quick fixes
      const corrections: any = {};

      appliedFixes.forEach(fixId => {
        const fix = quickFixes.find(f => f.id === fixId);
        if (fix) {
          switch (fix.id) {
            case 'add-doi':
            case 'fix-doi':
              corrections.doi = fix.value;
              break;
            case 'fix-title':
              corrections.title = fix.value;
              break;
            case 'fix-year':
              corrections.year = parseInt(fix.value);
              break;
            case 'fix-authors':
            case 'normalize-authors':
              corrections.authors = fix.value;
              break;
            case 'add-venue':
              corrections.source = fix.value;
              break;
          }
        }
      });

      // If no quick fixes were applied, use canonical data from verification
      if (Object.keys(corrections).length === 0) {
        if (canonicalTitle && canonicalTitle !== originalTitle) {
          corrections.title = canonicalTitle;
        }
        if (canonicalAuthors && canonicalAuthors !== originalAuthors) {
          corrections.authors = canonicalAuthors;
        }
        if (canonicalYear && Number(canonicalYear) !== Number(originalYear)) {
          corrections.year = Number(canonicalYear);
        }
        if (doi && (!reference.doi || reference.doi.trim() === '')) {
          corrections.doi = doi;
        }
      }

      // Always include metadata and bibtex_type if they exist on the reference
      if ((reference as any).bibtex_type) corrections.bibtex_type = (reference as any).bibtex_type;
      if ((reference as any).metadata) corrections.metadata = (reference as any).metadata;

      console.log('[ReferenceDetailDrawer] Applying corrections:', corrections);

      // Delegate to parent which handles API call and state update
      await onApplyFix(reference.id, true, corrections);

      setUpdateSuccess(true);
      setAppliedFixes(new Set()); // Clear applied fixes

      // Show success message then close drawer
      setTimeout(() => {
        setUpdateSuccess(false);
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Update reference error:', error);
      setUpdateError(error.message || 'Failed to update reference');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIgnore = () => {
    if (onApplyFix) {
      onApplyFix(reference.id, false);
    }
  };

  const getStatusConfig = () => {
    switch (reference.status) {
      case 'verified':
        return {
          bg: 'bg-success/10',
          text: 'text-success',
          icon: 'check_circle',
          label: 'Verified Reference'
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          icon: 'warning',
          label: 'Warning - Check Details'
        };
      case 'issue':
      case 'retracted':
        return {
          bg: 'bg-error/10',
          text: 'text-error',
          icon: 'close',
          label: 'Metadata mismatch'
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-500',
          icon: 'help',
          label: 'Unknown Status'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const conflictCount = differences.filter(d => d.isCritical).length;

  return (
    <aside
      className={`w-full max-w-[800px] h-full flex flex-col bg-background-light dark:bg-background-dark shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'
        } relative`}
    >
      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0 flex flex-col gap-6">
        {/* Top Controls */}
        <div className="flex justify-between items-start">
          <div className="flex gap-5 items-start">
            <div className={`flex items-center justify-center shrink-0 w-16 h-16 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              <span className="material-symbols-outlined text-[32px] font-bold">{statusConfig.icon}</span>
            </div>
            <div className="flex flex-col pt-1">
              <h2 className="text-slate-900 dark:text-white text-2xl font-extrabold leading-tight tracking-tight">
                {statusConfig.label}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1 font-mono">
                Reference ID: #{reference.key || 'unknown'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'summary'
              ? 'text-primary dark:text-indigo-400 border-b-[3px] border-primary dark:border-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('differences')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'differences'
              ? 'text-primary dark:text-indigo-400 border-b-[3px] border-primary dark:border-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            Differences
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'suggestions'
              ? 'text-primary dark:text-indigo-400 border-b-[3px] border-primary dark:border-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'history'
              ? 'text-primary dark:text-indigo-400 border-b-[3px] border-primary dark:border-indigo-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="drawer-content flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8 custom-scrollbar">

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <section className="flex flex-col gap-6">
            {/* Status & Confidence Card */}
            <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                Verification Status
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${reference.status === 'verified' ? 'bg-success/10 text-success' :
                    reference.status === 'warning' ? 'bg-warning/10 text-warning' :
                      reference.status === 'retracted' ? 'bg-error/10 text-error' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {reference.status === 'verified' ? 'check_circle' :
                        reference.status === 'warning' ? 'warning' :
                          reference.status === 'retracted' ? 'cancel' : 'help'}
                    </span>
                    {reference.status.charAt(0).toUpperCase() + reference.status.slice(1)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${reference.confidence >= 80 ? 'bg-success' :
                          reference.confidence >= 50 ? 'bg-warning' : 'bg-error'
                          }`}
                        style={{ width: `${reference.confidence}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white min-w-[48px]">
                      {reference.confidence}%
                    </span>
                  </div>
                  {reference.confidence < 80 && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">⚠️ Confidence Score Breakdown:</p>
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {reference.canonicalTitle && reference.title && reference.title.toLowerCase() !== reference.canonicalTitle.toLowerCase() && (
                          <div className="flex items-start gap-2">
                            <span className="text-warning font-bold">▸</span>
                            <span>Title mismatch: Your version differs from academic database</span>
                          </div>
                        )}
                        {reference.canonicalYear && reference.year && reference.year !== reference.canonicalYear && (
                          <div className="flex items-start gap-2">
                            <span className="text-error font-bold">▸</span>
                            <span>Year discrepancy: You have {reference.year}, database shows {reference.canonicalYear}</span>
                          </div>
                        )}
                        {reference.canonicalAuthors && reference.authors && reference.canonicalAuthors.toLowerCase() !== reference.authors.toLowerCase() && (
                          <div className="flex items-start gap-2">
                            <span className="text-warning font-bold">▸</span>
                            <span>Author list differs: {reference.authors.split(',').length} in your file vs {reference.canonicalAuthors.split(',').length} in database</span>
                          </div>
                        )}
                        {!reference.doi && (
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 font-bold">▸</span>
                            <span>DOI not found - reduces verifiability</span>
                          </div>
                        )}
                        {reference.confidence < 50 && (
                          <div className="flex items-start gap-2">
                            <span className="text-error font-bold">▸</span>
                            <span className="font-semibold">Multiple significant mismatches detected - please review carefully</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">article</span>
                Reference Details
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title</p>
                  <p className="text-slate-900 dark:text-white font-medium leading-relaxed">
                    {reference.canonicalTitle || reference.original_title || reference.title}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Authors</p>
                  <p className="text-slate-900 dark:text-white font-medium leading-relaxed">
                    {reference.canonicalAuthors || reference.canonical_authors || reference.original_authors || reference.authors || <span className="text-slate-400 italic">N/A</span>}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Year</p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {reference.canonicalYear || reference.original_year || reference.year}
                    </p>
                  </div>
                  {reference.venue && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Venue</p>
                      <p className="text-slate-900 dark:text-white font-medium">{reference.venue}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Citation & DOI Card */}
            <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">format_quote</span>
                Citation Information
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">DOI</p>
                  {reference.doi ? (
                    <a
                      href={`https://doi.org/${reference.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary dark:text-indigo-400 hover:underline font-mono text-sm flex items-center gap-1"
                    >
                      {reference.doi}
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic text-sm">N/A</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Citation Count</p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {reference.citedByCount || reference.cited_by_count || <span className="text-slate-400 italic">N/A</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification URLs Card */}
            {(reference.openalex_url || reference.crossref_url || reference.semantic_scholar_url || reference.google_scholar_url) && (
              <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Verification Sources
                </h4>
                <div className="space-y-2.5">
                  {reference.openalex_url && (
                    <a
                      href={reference.openalex_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-indigo-400 hover:bg-primary/5 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">science</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">OpenAlex</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-indigo-400 text-[18px]">open_in_new</span>
                    </a>
                  )}
                  {reference.crossref_url && (
                    <a
                      href={reference.crossref_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-indigo-400 hover:bg-primary/5 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">check_circle</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Crossref</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-indigo-400 text-[18px]">open_in_new</span>
                    </a>
                  )}
                  {reference.semantic_scholar_url && (
                    <a
                      href={reference.semantic_scholar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-indigo-400 hover:bg-primary/5 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[18px]">school</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Semantic Scholar</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-indigo-400 text-[18px]">open_in_new</span>
                    </a>
                  )}
                  {reference.google_scholar_url && (
                    <a
                      href={reference.google_scholar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-indigo-400 hover:bg-primary/5 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px]">search</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Google Scholar</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary dark:group-hover:text-indigo-400 text-[18px]">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Issues Card */}
            {reference.issues && reference.issues.length > 0 && (
              <div className="bg-white dark:bg-surface-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Issues Detected ({reference.issues.length})
                </h4>
                <div className="space-y-2.5">
                  {reference.issues.map((issue, idx) => {
                    // Determine severity based on keywords with enhanced detection
                    const isRetracted = issue.includes('⚠️ RETRACTED PAPER') || issue.toLowerCase().includes('retracted');
                    const isPreprint = issue.includes('⚠️ PREPRINT') || (issue.toLowerCase().includes('preprint') && issue.toLowerCase().includes('not peer-reviewed'));
                    const isCritical = isRetracted || issue.toLowerCase().includes('critical');
                    const isMajor = !isCritical && !isPreprint && (issue.toLowerCase().includes('mismatch') || issue.toLowerCase().includes('incorrect') || issue.toLowerCase().includes('major'));
                    const isMinor = !isCritical && !isMajor && !isPreprint;

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${
                          isRetracted ? 'bg-red-50 border-red-300 shadow-sm' :
                          isPreprint ? 'bg-amber-50 border-amber-300 shadow-sm' :
                          isCritical ? 'bg-error/5 border-error/20' :
                          isMajor ? 'bg-warning/5 border-warning/20' :
                            'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isRetracted ? 'bg-red-100' :
                          isPreprint ? 'bg-amber-100' :
                          isCritical ? 'bg-error/10' :
                          isMajor ? 'bg-warning/10' :
                            'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                          <span className={`material-symbols-outlined text-[18px] ${
                            isRetracted ? 'text-red-700' :
                            isPreprint ? 'text-amber-700' :
                            isCritical ? 'text-error' :
                            isMajor ? 'text-warning' :
                              'text-blue-600 dark:text-blue-400'
                            }`}>
                            {isRetracted ? 'block' : 
                             isPreprint ? 'science' :
                             isCritical ? 'cancel' : 
                             isMajor ? 'warning' : 'info'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm leading-relaxed ${
                            isRetracted ? 'text-red-900 font-semibold' :
                            isPreprint ? 'text-amber-900 font-semibold' :
                            'text-slate-700 dark:text-slate-300'
                          }`}>
                            {issue}
                          </p>
                          {isPreprint && (
                            <p className="text-xs text-amber-700 mt-1">
                              This paper has not undergone formal peer review. Verify findings independently.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Retraction Warning */}
            {reference.is_retracted && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-700 text-[32px]">block</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-900 font-bold text-xl mb-2 flex items-center gap-2">
                      ⚠️ Retracted Paper - Do Not Cite
                    </h4>
                    <p className="text-red-800 text-sm leading-relaxed mb-3">
                      This paper has been officially retracted from the academic literature and should <strong>not be cited</strong> in your work. Retraction indicates serious concerns about the paper's validity, methodology, or integrity.
                    </p>
                    <div className="bg-white/50 rounded-md p-3 border border-red-200">
                      <p className="text-xs text-red-900 font-semibold mb-1">⚠️ Recommended Action:</p>
                      <p className="text-xs text-red-800">
                        Remove this reference from your bibliography immediately or replace it with a validated alternative source. Citing retracted papers may harm the credibility of your research.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Differences Tab */}
        {activeTab === 'differences' && (
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-1">Field-by-Field Comparison</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                See how your uploaded reference compares to verified academic database records
              </p>
            </div>

            {/* Comparison Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-700">
                    <th className="py-4 px-5 w-32 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Field</th>
                    <th className="py-4 px-5 w-[42%] text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>
                        <span className="text-amber-700 dark:text-amber-400">Your Upload (Current)</span>
                      </div>
                    </th>
                    <th className="py-4 px-5 w-[42%] text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                        <span className="text-emerald-700 dark:text-emerald-400">Academic APIs (Verified)</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 w-20 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Title Comparison */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">article</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Title</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {reference.original_title || reference.title || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
                        {reference.canonicalTitle || reference.canonical_title || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {(reference.canonicalTitle || reference.canonical_title) &&
                        (reference.original_title || reference.title) &&
                        (reference.canonicalTitle || reference.canonical_title).toLowerCase() === (reference.original_title || reference.title).toLowerCase() ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">warning</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Authors Comparison */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">people</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Authors</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {reference.original_authors || reference.authors || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                      {(reference.original_authors || reference.authors) && (
                        <p className="text-xs text-slate-400 mt-1">
                          {(reference.original_authors || reference.authors).split(/\s+(?:and|AND)\s+|[,;&]/).filter((a: string) => a.trim()).length} author(s) listed
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
                        {reference.canonicalAuthors || reference.canonical_authors || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                      {(reference.canonicalAuthors || reference.canonical_authors) && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          ✓ {(reference.canonicalAuthors || reference.canonical_authors).split(/\s+(?:and|AND)\s+|[,;&]/).filter((a: string) => a.trim()).length} verified author(s)
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {(reference.canonicalAuthors || reference.canonical_authors) && (reference.original_authors || reference.authors) ? (
                        (() => {
                          const parseAuthors = (str: string) => str.split(/\s+(?:and|AND)\s+|[,;&]/).map(a => a.trim()).filter(a => a.length > 0);
                          const origCount = parseAuthors(reference.original_authors || reference.authors);
                          const canonCount = parseAuthors(reference.canonicalAuthors || reference.canonical_authors);
                          return origCount.length === canonCount.length ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30">
                              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px]">close</span>
                            </span>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">remove</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Year Comparison */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">calendar_today</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Year</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                        {reference.original_year || reference.year || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                        {reference.canonicalYear || reference.canonical_year || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {(reference.canonicalYear || reference.canonical_year) && (reference.original_year || reference.year) &&
                        (reference.canonicalYear || reference.canonical_year) === (reference.original_year || reference.year) ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check</span>
                        </span>
                      ) : (reference.canonicalYear || reference.canonical_year) && (reference.original_year || reference.year) ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">warning</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">remove</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Venue Comparison */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">location_on</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Venue</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {reference.original_source || reference.source || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
                        {reference.venue || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {reference.venue && (reference.original_source || reference.source) ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check</span>
                        </span>
                      ) : reference.venue ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">add</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">remove</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* DOI Comparison */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">link</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">DOI</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-mono break-all">
                        {reference.original_doi || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 font-mono break-all font-medium">
                        {reference.doi || <span className="text-slate-400 italic">N/A</span>}
                      </p>
                      {reference.doi && (
                        <a
                          href={`https://doi.org/${reference.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          Verify DOI
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {reference.doi && reference.original_doi ? (
                        reference.doi === reference.original_doi ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]">warning</span>
                          </span>
                        )
                      ) : reference.doi ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30" title="DOI found by API">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">add</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30" title="DOI not found">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px]">close</span>
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Citation Count */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-5 align-top bg-white dark:bg-background-dark">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">format_quote</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Citations</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-top bg-amber-50/30 dark:bg-amber-900/5">
                      <p className="text-sm text-slate-400 italic">Not in upload</p>
                    </td>
                    <td className="py-4 px-5 align-top bg-emerald-50/30 dark:bg-emerald-900/5">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                        {reference.citedByCount || reference.cited_by_count || <span className="text-slate-400 italic">N/A</span>}
                        {(reference.citedByCount || reference.cited_by_count) && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-2">times cited</span>
                        )}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top bg-white dark:bg-background-dark text-center">
                      {(reference.citedByCount || reference.cited_by_count) ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">add</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">remove</span>
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 mt-2 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[14px]">check</span>
                </span>
                <span>Match</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[14px]">warning</span>
                </span>
                <span>Mismatch</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[14px]">add</span>
                </span>
                <span>Added by API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[14px]">close</span>
                </span>
                <span>Missing</span>
              </div>
            </div>
          </section>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <section className="flex flex-col gap-4 pb-20">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold pt-4">Quick Fixes</h3>

            {quickFixes.length > 0 ? (
              <div className="grid gap-3">
                {quickFixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-indigo-400 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{fix.icon}</span>
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white font-semibold text-sm">{fix.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          {fix.description}
                        </p>
                        {fix.value && (
                          <p className="text-slate-600 dark:text-slate-300 text-xs font-mono mt-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                            {fix.value.length > 60 ? fix.value.substring(0, 60) + '...' : fix.value}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyQuickFix(fix.id)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${appliedFixes.has(fix.id)
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                        }`}
                    >
                      {appliedFixes.has(fix.id) ? '✓ Applied' : 'Apply'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                <p className="text-sm">No suggestions available. Reference is accurate.</p>
              </div>
            )}
          </section>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <section className="flex flex-col gap-4">
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">history</span>
              <p className="text-sm">No previous updates for this reference</p>
            </div>
          </section>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark z-10 shrink-0">
        {/* Success/Error Messages */}
        {updateSuccess && (
          <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-success text-[24px]">check_circle</span>
            <div className="flex-1">
              <p className="text-success font-semibold">Reference Updated Successfully!</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Changes have been applied to your bibliography.</p>
            </div>
          </div>
        )}
        {updateError && (
          <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-error text-[24px]">error</span>
            <div className="flex-1">
              <p className="text-error font-semibold">Update Failed</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{updateError}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleIgnore}
            disabled={isUpdating}
            className="px-6 py-3 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            Ignore Warning
          </button>
          <button
            onClick={handleUpdateReference}
            disabled={isUpdating || updateSuccess}
            className="flex-1 px-6 py-3 rounded-lg bg-primary hover:bg-indigo-900 text-white text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Updating...
              </>
            ) : updateSuccess ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Updated!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Update Reference
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ReferenceDetailDrawer;
