import React, { useState } from 'react';

// Import the citation service
const CITATION_STYLES = {
  // Academic styles
  apa: { name: 'APA 7th Edition', type: 'academic' },
  harvard: { name: 'Harvard', type: 'academic' },
  mla: { name: 'MLA 9th Edition', type: 'academic' },
  chicago: { name: 'Chicago 17th Edition', type: 'academic' },
  ieee: { name: 'IEEE', type: 'academic' },
  vancouver: { name: 'Vancouver', type: 'academic' },
  
  // LaTeX styles
  'latex-plain': { name: 'LaTeX Plain', type: 'latex' },
  'latex-alpha': { name: 'LaTeX Alpha', type: 'latex' },
  'latex-unsrt': { name: 'LaTeX Unsrt', type: 'latex' },
  'latex-abbrv': { name: 'LaTeX Abbrv', type: 'latex' },
  'natbib': { name: 'NatBib', type: 'latex' },
  'biblatex': { name: 'BibLaTeX', type: 'latex' }
};

const EXPORT_FORMATS = {
  bibtex: 'BibTeX (.bib)',
  json: 'JSON (.json)',
  csv: 'CSV (.csv)',
  word: 'Word Document (.txt)',
  latex: 'LaTeX (.tex)',
  endnote: 'EndNote (.enw)',
  ris: 'RIS (.ris)'
};

// Simple formatReference function for the component
function formatReference(reference, style = 'apa') {
  // Map reference fields correctly - use primary fields first, then fallbacks
  const authors = reference.authors || reference.canonicalAuthors || reference.original_authors || 'Unknown Author';
  const year = reference.year || reference.canonicalYear || reference.original_year || 'Unknown Year';
  const title = reference.title || reference.canonicalTitle || reference.original_title || 'Unknown Title';
  const venue = reference.source || reference.venue || reference.original_source || 'Unknown Venue';

  // Simple formatting for different styles
  switch (style) {
    case 'apa':
      const apaAuthorsInText = formatAuthorsForInText(authors);
      const apaAuthorsBibliography = formatAuthorsForBibliography(authors);
      return {
        inText: `(${apaAuthorsInText}, ${year})`,
        bibliography: `${apaAuthorsBibliography}. (${year}). ${title}. ${venue}.${reference.doi ? ` https://doi.org/${reference.doi}` : ''}`,
        style: 'APA 7th'
      };
    
    case 'harvard':
      const harvardAuthors = formatAuthorsSimple(authors);
      return {
        inText: `${harvardAuthors.lastName} ${year}`,
        bibliography: `${harvardAuthors.full} ${year}. ${title}. ${venue}.`,
        style: 'Harvard'
      };
    
    case 'mla':
      const mlaAuthors = formatAuthorsMLA(authors);
      return {
        inText: `(${mlaAuthors.lastName})`,
        bibliography: `${mlaAuthors.full}. "${title}" ${venue}, ${year}.`,
        style: 'MLA 9th'
      };
    
    case 'chicago':
      const chicagoAuthors = formatAuthorsSimple(authors);
      return {
        inText: `(${chicagoAuthors.lastName} ${year})`,
        bibliography: `${chicagoAuthors.full}. "${title}." ${venue} (${year}).`,
        style: 'Chicago 17th'
      };
    
    case 'ieee':
      return {
        inText: `[1]`,
        bibliography: `${authors}, "${title}" ${venue}, ${year}.`,
        style: 'IEEE'
      };
    
    case 'vancouver':
      return {
        inText: `(1)`,
        bibliography: `${formatAuthorsVancouver(authors)}. ${title}. ${venue}. ${year}.`,
        style: 'Vancouver'
      };
    
    case 'natbib':
      const key = reference.bibtex_key || generateBibtexKey(reference);
      return {
        inText: `\\citep{${key}}`,
        inTextNarrative: `\\citet{${key}}`,
        bibliography: generateBibtexEntry(reference),
        style: 'NatBib',
        latex: true,
        preview: `${formatAuthorsSimple(authors).lastName} (${year})`
      };
    
    case 'biblatex':
      const bibKey = reference.bibtex_key || generateBibtexKey(reference);
      return {
        inText: `\\autocite{${bibKey}}`,
        bibliography: generateBibtexEntry(reference),
        style: 'BibLaTeX',
        latex: true
      };
    
    default:
      // Default to LaTeX styles
      const latexKey = reference.bibtex_key || generateBibtexKey(reference);
      return {
        inText: `\\cite{${latexKey}}`,
        bibliography: generateBibtexEntry(reference),
        style: 'LaTeX',
        latex: true
      };
  }
}

// Helper functions for author formatting
function formatAuthorsForInText(authorsString) {
  if (!authorsString) return 'Unknown';
  
  const authors = authorsString.split(' and ');
  if (authors.length === 1) {
    const parts = authors[0].trim().split(' ');
    return parts[parts.length - 1]; // Last name only
  } else if (authors.length === 2) {
    const lastName1 = authors[0].split(' ').pop();
    const lastName2 = authors[1].split(' ').pop();
    return `${lastName1} & ${lastName2}`;
  } else {
    const firstName = authors[0];
    const firstLastName = firstName.split(' ').pop();
    return `${firstLastName} et al.`;
  }
}

function formatAuthorsForBibliography(authorsString) {
  if (!authorsString) return 'Unknown Author';
  
  const authors = authorsString.split(' and ');
  
  if (authors.length === 1) {
    return authors[0].trim();
  } else if (authors.length === 2) {
    return `${authors[0]} & ${authors[1]}`;
  } else {
    // For APA bibliography, show all authors (up to 20)
    if (authors.length <= 20) {
      const formatted = authors.slice(0, -1).join(', ') + ', & ' + authors[authors.length - 1];
      return formatted;
    } else {
      // Only use et al. for 21+ authors in bibliography
      return `${authors[0]} et al.`;
    }
  }
}

function formatAuthorsSimple(authorsString) {
  if (!authorsString) return { full: 'Unknown Author', lastName: 'Unknown' };
  
  const authors = authorsString.split(' and ');
  if (authors.length === 1) {
    const parts = authors[0].trim().split(' ');
    const lastName = parts[parts.length - 1];
    return { full: authors[0], lastName };
  } else if (authors.length === 2) {
    const lastName1 = authors[0].split(' ').pop();
    const lastName2 = authors[1].split(' ').pop();
    return { 
      full: `${authors[0]} & ${authors[1]}`,
      lastName: `${lastName1} & ${lastName2}`
    };
  } else {
    const firstName = authors[0];
    const firstLastName = firstName.split(' ').pop();
    return { 
      full: `${firstName} et al.`,
      lastName: `${firstLastName} et al.`
    };
  }
}

function formatAuthorsMLA(authorsString) {
  if (!authorsString) return { full: 'Unknown Author', lastName: 'Unknown' };
  
  const authors = authorsString.split(' and ');
  const firstAuthor = authors[0];
  const parts = firstAuthor.split(' ');
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  
  if (authors.length === 1) {
    return { full: `${lastName}, ${firstName}`, lastName };
  } else {
    return { full: `${lastName}, ${firstName}, et al.`, lastName };
  }
}

function formatAuthorsVancouver(authorsString) {
  if (!authorsString) return 'Unknown Author';
  
  const authors = authorsString.split(' and ');
  const formattedAuthors = authors.map(author => {
    const parts = author.trim().split(' ');
    const lastName = parts.pop();
    const initials = parts.map(name => name.charAt(0).toUpperCase()).join('');
    return `${lastName} ${initials}`;
  });
  
  if (formattedAuthors.length <= 6) {
    return formattedAuthors.join(', ');
  } else {
    return `${formattedAuthors.slice(0, 6).join(', ')}, et al.`;
  }
}

function generateBibtexKey(ref) {
  // Use original key if available (like "Jamil2025"), otherwise generate
  if (ref.key && ref.key !== '' && ref.key !== 'undefined') {
    return ref.key;
  }
  
  // Fallback generation if no key exists
  const authorsStr = ref.authors || ref.canonicalAuthors || ref.original_authors || 'Unknown';
  const authorParts = authorsStr.split(' and ')[0].split(' ');
  const lastNameMatch = authorParts[authorParts.length - 1];
  const author = lastNameMatch && lastNameMatch !== 'undefined' ? lastNameMatch : 'Unknown';
  const year = ref.year || ref.canonicalYear || ref.original_year || '0000';
  return `${author}${year}`;
}

function generateBibtexEntry(ref) {
  const key = ref.key || generateBibtexKey(ref);
  const type = ref.bibtex_type || 'article';
  
  // Use correct field mapping with proper fallbacks
  const title = ref.title || ref.canonicalTitle || ref.original_title || 'undefined';
  const authors = ref.authors || ref.canonicalAuthors || ref.original_authors || 'undefined';
  const year = ref.year || ref.canonicalYear || ref.original_year || 'undefined';
  const journal = ref.source || ref.venue || ref.original_source || 'Information and Computer Security';
  
  let entry = `@${type}{${key},\n`;
  entry += `  title = {${title}},\n`;
  entry += `  author = {${authors}},\n`;
  entry += `  year = {${year}},\n`;
  entry += `  journal = {${journal}},\n`;
  
  if (ref.doi) entry += `  doi = {${ref.doi}},\n`;
  if (ref.metadata?.volume) entry += `  volume = {${ref.metadata.volume}},\n`;
  if (ref.metadata?.pages) entry += `  pages = {${ref.metadata.pages}},\n`;
  
  entry += '}';
  return entry;
}

export function CitationPreview({ reference, onExport, jobId }) {
  const [selectedStyle, setSelectedStyle] = useState('apa');
  const [selectedFormat, setSelectedFormat] = useState('bibtex');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success', icon: 'check_circle' });
  const [isExporting, setIsExporting] = useState(false);
  
  const formattedCitation = formatReference(reference, selectedStyle);
  
  // Show styled notification modal
  const showNotification = (message, type = 'success', icon = '', duration = 3000) => {
    const iconMap = {
      success: 'check_circle',
      error: 'error', 
      info: 'info',
      warning: 'warning'
    };
    
    setNotification({ 
      show: true, 
      message, 
      type, 
      icon: icon || iconMap[type] || 'check_circle'
    });
    
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success', icon: 'check_circle' });
    }, duration);
  };
  
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!', 'success', 'content_copy');
    } catch (err) {
      console.error('Failed to copy: ', err);
      showNotification('Failed to copy. Please try again.', 'error');
    }
  };

  const handleExport = async () => {
    if (!jobId) {
      showNotification('No job ID available for export.', 'error');
      return;
    }

    setIsExporting(true);
    showNotification('Preparing export...', 'info', 'download', 1000);
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          format: selectedFormat,
          style: selectedStyle,
          referenceIds: [reference.id] // Single reference export
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `citation.${selectedFormat}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=\"(.+)\"/);  
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification('Export completed successfully!', 'success', 'download_done');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
      {/* Styled Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
          notification.type === 'success' ? 'bg-green-600 text-white' :
          notification.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        } animate-fade-in`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {notification.type === 'success' ? 'check_circle' :
               notification.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Citation Style
          </label>
          <select 
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-indigo-400"
          >
            {Object.entries(CITATION_STYLES).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name} {style.type === 'latex' && '(LaTeX)'}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Export Format
          </label>
          <select 
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-indigo-400"
          >
            {Object.entries(EXPORT_FORMATS).map(([key, format]) => (
              <option key={key} value={key}>{format}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {/* In-Text Citation Preview */}
        <div>
          <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
            📝 In-Text Citation
          </h4>
          <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-100">
            {formattedCitation.inText}
            {formattedCitation.inTextNarrative && (
              <>
                <br />
                <span className="text-slate-600 dark:text-slate-400">Narrative: </span>
                {formattedCitation.inTextNarrative}
              </>
            )}
          </div>
        </div>

        {/* Bibliography Entry Preview */}
        <div>
          <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
            📚 Bibliography Entry
          </h4>
          <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-100">
            {formattedCitation.bibliography}
          </div>
        </div>

        {/* LaTeX specific preview */}
        {formattedCitation.latex && (
          <div>
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
              🔧 LaTeX Commands
            </h4>
            <div className="bg-slate-900 text-green-400 p-3 rounded font-mono text-sm">
              <div>% In your document:</div>
              <div>{formattedCitation.inText}</div>
              <br />
              <div>% In your .bib file:</div>
              <div className="whitespace-pre-line">{formattedCitation.bibliography}</div>
            </div>
          </div>
        )}

        {/* Preview for specific styles */}
        {formattedCitation.preview && (
          <div>
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
              👁️ Preview
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800 font-mono text-sm text-blue-900 dark:text-blue-100">
              {formattedCitation.preview}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleCopy(formattedCitation.inText)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
          Copy Citation
        </button>
        
        <button
          onClick={() => handleCopy(formattedCitation.bibliography)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">library_books</span>
          Copy Bibliography
        </button>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Exporting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </>
          )}
        </button>
      </div>
      
      {/* Notification Modal */}
      {notification.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <span className={`material-symbols-outlined text-[28px] ${
                  notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  notification.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  notification.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>{notification.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {notification.type === 'success' ? 'Success!' :
                   notification.type === 'error' ? 'Error' :
                   notification.type === 'warning' ? 'Warning' : 'Information'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {notification.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setNotification({ show: false, message: '', type: 'success', icon: 'check_circle' })}
                className={`px-6 py-2 rounded-lg text-white text-sm font-bold transition-colors ${
                  notification.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  notification.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  notification.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}