/**
 * Bibliography File Parser
 * Extracts references from BibTeX, PDF, and other formats
 */

export interface ParsedReference {
  bibtex_key: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  doi?: string;
  url?: string;
}

/**
 * Parse BibTeX format
 * @param content Raw BibTeX content
 * @returns Array of parsed references
 */
export function parseBibTeX(content: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  // Regex to match @article{...}, @book{...}, etc. across multiple lines
  // Pattern: @type{key, field={value}, ...} until next @ or end
  const entryRegex = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*?)(?=\n@|\n\s*$)/gs;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const [fullMatch, type, key, fields] = match;
    
    // Helper function to extract field value with multiple delimiter support
    const extractField = (fieldName: string): string | undefined => {
      // Match field with =, then capture content within {}, "", or until comma/newline
      const pattern = new RegExp(`${fieldName}\\s*=\\s*(?:["{]([^"}]+)["}]|([^,}\\n]+))`, 'i');
      const match = fields.match(pattern);
      return match?.[1]?.trim() || match?.[2]?.trim();
    };

    // Parse ALL fields from BibTeX entry
    const title = extractField('title');
    const authors = extractField('author');
    const year = extractField('year');
    const doi = extractField('doi')?.replace(/[,}]+$/, ''); // Clean trailing chars
    const url = extractField('url');
    const journal = extractField('journal');
    const booktitle = extractField('booktitle');
    const volume = extractField('volume');
    const number = extractField('number');
    const pages = extractField('pages');
    const publisher = extractField('publisher');
    const issn = extractField('issn');
    const isbn = extractField('isbn');
    const month = extractField('month');
    const note = extractField('note');
    const address = extractField('address');
    const edition = extractField('edition');
    const series = extractField('series');

    // Build source from available venue information
    let source = journal || booktitle || 'Unknown';
    if (volume) source += `, Vol. ${volume}`;
    if (number) source += ` (${number})`;
    if (pages) source += `, pp. ${pages}`;

    console.log('[BibTeX Parser] Entry:', key, {
      title: title?.substring(0, 50) + '...',
      doi: doi,
      year: year,
      hasVolume: !!volume,
      hasPages: !!pages
    });

    // Only add if we have minimum required fields
    if (title && authors && year) {
      references.push({
        bibtex_key: key.trim(),
        title: title,
        authors: authors,
        year: parseInt(year, 10),
        source: source,
        doi: doi || undefined,
        url: url || undefined,
      });
    } else {
      console.warn('[BibTeX Parser] Skipping incomplete entry:', key, {
        hasTitle: !!title,
        hasAuthors: !!authors,
        hasYear: !!year
      });
    }
  }

  return references;
}

/**
 * Extract references from PDF text
 * Uses robust pattern matching for academic reference formats
 * PRIORITY: DOI is the primary truth source - extract it first!
 */
function extractReferencesFromText(text: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  // Split text into potential reference lines
  // References typically start with [1], 1., or a new paragraph
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 20);
  
  // Pattern 1: Numbered references [1], (1), 1.
  const numberedRefRegex = /^[\[\(]?(\d+)[\]\)\.]\s*(.+)$/;
  
  // Pattern 2: DOI extraction (most reliable!)
  const doiRegex = /(?:doi[:\s]*|https?:\/\/(?:dx\.)?doi\.org\/)(10\.\d{4,}(?:\.\d+)*\/\S+)/gi;
  
  // Pattern 3: Year extraction (YYYY) in parentheses or standalone
  const yearRegex = /\((\d{4})[a-z]?\)|,?\s*(\d{4})[a-z]?[,;\.\s]/;
  
  // Pattern 4: Author extraction - Last name, First initial(s) or First Last format
  const authorPatterns = [
    // Smith, J., Jones, A. B., and Brown, C.
    /^([A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:,\s+[A-Z]\.(?:\s+[A-Z]\.)?)+(?:,?\s+and\s+[A-Z][a-z]+(?:,\s+[A-Z]\.)+)?)/,
    // Smith J, Jones AB, Brown C
    /^([A-Z][a-z]+\s+[A-Z]{1,3}(?:,\s+[A-Z][a-z]+\s+[A-Z]{1,3})*)/,
    // J. Smith, A.B. Jones
    /^([A-Z]\.\s*[A-Z][a-z]+(?:,\s+[A-Z]\.\s*[A-Z][a-z]+)*)/,
  ];
  
  // Pattern 5: Title extraction - typically after authors and before year/venue
  // Titles often end with period or are in quotes
  const titlePatterns = [
    /"([^"]+)"/,  // Quoted title
    /\.\s+([A-Z][^.]*?)\.\s+/, // Title between periods
    /\(\d{4}\)\.\s*([^.]+?)\./, // After year
  ];
  
  let currentRef: Partial<ParsedReference> = {};
  let refIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new numbered reference
    const numberedMatch = line.match(numberedRefRegex);
    
    if (numberedMatch) {
      // Save previous reference if it has minimum data
      if (currentRef.title && currentRef.authors && currentRef.year) {
        references.push({
          bibtex_key: currentRef.bibtex_key || `ref${refIndex}`,
          title: currentRef.title,
          authors: currentRef.authors,
          year: currentRef.year,
          source: currentRef.source || 'Unknown',
          doi: currentRef.doi,
          url: currentRef.url,
        });
      }
      
      // Start new reference
      refIndex = parseInt(numberedMatch[1]);
      const refContent = numberedMatch[2];
      currentRef = { bibtex_key: `ref${refIndex}` };
      
      // Extract DOI first (highest priority!)
      const doiMatch = refContent.match(doiRegex);
      if (doiMatch) {
        currentRef.doi = doiMatch[1] || doiMatch[0].replace(/^.*?(10\.\d+)/, '$1');
        console.log(`[PDF] Found DOI: ${currentRef.doi}`);
      }
      
      // Extract year
      const yearMatch = refContent.match(yearRegex);
      if (yearMatch) {
        currentRef.year = parseInt(yearMatch[1] || yearMatch[2]);
      }
      
      // Extract authors (try multiple patterns)
      for (const authorPattern of authorPatterns) {
        const authorMatch = refContent.match(authorPattern);
        if (authorMatch) {
          currentRef.authors = authorMatch[1].trim();
          // Clean up "and" to comma
          currentRef.authors = currentRef.authors.replace(/\s+and\s+/g, ', ');
          break;
        }
      }
      
      // Extract title (try multiple patterns)
      for (const titlePattern of titlePatterns) {
        const titleMatch = refContent.match(titlePattern);
        if (titleMatch && titleMatch[1].length > 10) {
          // Don't accept titles that look like DOIs or URLs
          if (!titleMatch[1].includes('doi') && !titleMatch[1].includes('http')) {
            currentRef.title = titleMatch[1].trim();
            break;
          }
        }
      }
      
      // If no title found with patterns, extract manually
      if (!currentRef.title && currentRef.authors && currentRef.year) {
        // Title is between authors and year
        const afterAuthors = refContent.substring(refContent.indexOf(currentRef.authors) + currentRef.authors.length);
        const beforeYear = afterAuthors.split(currentRef.year.toString())[0];
        
        // Clean and extract potential title
        const potentialTitle = beforeYear
          .replace(/\(\d{4}\)/, '')
          .replace(/^\W+/, '')
          .replace(/\W+$/, '')
          .split(/[.;]/)
          .find(s => s.length > 15 && !s.includes('doi') && !s.includes('http'));
        
        if (potentialTitle) {
          currentRef.title = potentialTitle.trim();
        }
      }
      
      // Extract source/venue (journal or conference)
      // Usually italicized or after title
      const sourcePatterns = [
        /,\s*([A-Z][^,\.]+(?:Journal|Conference|Proceedings|Review|Magazine)[^,\.]*)/i,
        /In\s+([A-Z][^,\.]+(?:Conference|Proceedings|Workshop)[^,\.]*)/i,
      ];
      
      for (const sourcePattern of sourcePatterns) {
        const sourceMatch = refContent.match(sourcePattern);
        if (sourceMatch) {
          currentRef.source = sourceMatch[1].trim();
          break;
        }
      }
    } else if (currentRef.bibtex_key) {
      // This line is a continuation of the current reference
      // Look for missing fields
      
      if (!currentRef.doi) {
        const doiMatch = line.match(doiRegex);
        if (doiMatch) {
          currentRef.doi = doiMatch[1] || doiMatch[0].replace(/^.*?(10\.\d+)/, '$1');
          console.log(`[PDF] Found DOI in continuation: ${currentRef.doi}`);
        }
      }
      
      if (!currentRef.year) {
        const yearMatch = line.match(yearRegex);
        if (yearMatch) {
          currentRef.year = parseInt(yearMatch[1] || yearMatch[2]);
        }
      }
    }
  }
  
  // Don't forget the last reference
  if (currentRef.title && currentRef.authors && currentRef.year) {
    references.push({
      bibtex_key: currentRef.bibtex_key || `ref${refIndex}`,
      title: currentRef.title,
      authors: currentRef.authors,
      year: currentRef.year,
      source: currentRef.source || 'Unknown',
      doi: currentRef.doi,
      url: currentRef.url,
    });
  }
  
  // Validate and clean results
  const validRefs = references.filter(ref => {
    // Must have title that doesn't look like garbage
    const titleValid = ref.title && 
                      ref.title.length > 10 && 
                      !ref.title.toLowerCase().includes('doi:') &&
                      !ref.title.toLowerCase().startsWith('doi') &&
                      !ref.title.match(/^https?:\/\//i) &&
                      !ref.title.match(/^\d+\.\d+\//); // Don't accept "10.1002/..." as title
    
    // Must have reasonable author
    const authorValid = ref.authors && 
                       ref.authors.length > 2 && 
                       !ref.authors.toLowerCase().includes('unknown');
    
    // Year must be reasonable
    const yearValid = ref.year >= 1900 && ref.year <= new Date().getFullYear() + 1;
    
    if (!titleValid) {
      console.log(`[PDF] Rejected reference with invalid title: "${ref.title}"`);
    }
    
    return titleValid && authorValid && yearValid;
  });
  
  console.log(`[PDF] Validated ${validRefs.length} of ${references.length} extracted references`);
  
  return validRefs;
}

/**
 * Extract text from PDF (simplified - requires pdf-parse in production)
 * For now, return empty - in production use pdf-parse or pdfjs-dist
 */
export async function parsePDF(fileBuffer: Buffer): Promise<ParsedReference[]> {
  console.log('[PDF Parser] Attempting to extract references from PDF...');
  
  // Try to extract text from PDF (simplified approach)
  // PDFs can have text in various encodings, try UTF-8 and Latin-1
  let text = '';
  
  try {
    // Try UTF-8 first
    text = fileBuffer.toString('utf8');
  } catch {
    try {
      // Fallback to Latin-1
      text = fileBuffer.toString('latin1');
    } catch {
      console.error('[PDF Parser] Failed to decode PDF');
      return [];
    }
  }
  
  console.log('[PDF Parser] Extracted text length:', text.length);
  
  // Look for "References" or "Bibliography" section
  const refSectionRegex = /(?:^|\n)\s*(?:References|Bibliography|Works\s+Cited|Literature\s+Cited)\s*\n([\s\S]+?)(?:\n\s*\n|\Z)/im;
  const refMatch = text.match(refSectionRegex);
  
  let referencesText = text;
  if (refMatch) {
    console.log('[PDF Parser] Found references section');
    referencesText = refMatch[1];
  } else {
    console.log('[PDF Parser] No explicit references section, searching entire document');
    // Take last 30% of document (where references usually are)
    const startPos = Math.floor(text.length * 0.7);
    referencesText = text.substring(startPos);
  }
  
  // First, try to parse as BibTeX (some PDFs embed BibTeX)
  if (referencesText.includes('@article') || referencesText.includes('@book')) {
    console.log('[PDF Parser] Attempting BibTeX extraction');
    const bibtexRefs = parseBibTeX(referencesText);
    if (bibtexRefs.length > 0) {
      console.log(`[PDF Parser] Found ${bibtexRefs.length} BibTeX references`);
      return bibtexRefs;
    }
  }
  
  // Extract references using pattern matching
  const extractedRefs = extractReferencesFromText(referencesText);
  console.log(`[PDF Parser] Extracted ${extractedRefs.length} references via pattern matching`);
  
  return extractedRefs;
}

/**
 * Parse uploaded file based on type
 */
export async function parseFile(fileName: string, fileBuffer: Buffer): Promise<ParsedReference[]> {
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'bib') {
    const text = fileBuffer.toString('utf8');
    return parseBibTeX(text);
  } else if (ext === 'pdf') {
    return parsePDF(fileBuffer);
  } else if (ext === 'docx') {
    // DOCX parsing would require unzipper + xml parser
    console.warn('DOCX parsing not yet implemented');
    return [];
  } else if (ext === 'tex') {
    const text = fileBuffer.toString('utf8');
    // Extract BibTeX bibliography environment
    const bibRegex = /\\begin\{thebibliography\}([\s\S]*?)\end\{thebibliography\}/;
    const match = text.match(bibRegex);
    if (match) {
      return parseBibTeX(match[1]);
    }
    return [];
  }

  return [];
}

/**
 * Validate that references were found
 */
export function hasValidBibliography(references: ParsedReference[]): boolean {
  return references && references.length > 0;
}

/**
 * Get user-friendly error message for missing bibliography
 */
export function getMissingBibliographyError(fileName: string): string {
  return `❌ No bibliography found in "${fileName}". 

This file does not contain any extractable references or bibliography entries. 
Please ensure your file includes:
- A properly formatted bibliography section (@article, @book entries)
- BibTeX entries with required fields (title, author, year)
- Or a References section with citation information

Supported formats: .bib, .pdf, .tex, .docx`;
}
