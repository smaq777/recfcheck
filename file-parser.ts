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
  
  // Regex to match @article{...}, @book{...}, etc.
  const entryRegex = /@(\w+)\s*\{\s*([^,]+),\s*([^}]+)\}/gi;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const [fullMatch, type, key, fields] = match;
    
    // Parse fields within the entry
    const titleMatch = fields.match(/title\s*=\s*["{]([^"}]+)["}]/i);
    const authorsMatch = fields.match(/author\s*=\s*["{]([^"}]+)["}]/i);
    const yearMatch = fields.match(/year\s*=\s*["{]?(\d{4})["}]?/i);
    const doiMatch = fields.match(/doi\s*=\s*["{]([^"}]+)["}]/i);
    const urlMatch = fields.match(/url\s*=\s*["{]([^"}]+)["}]/i);
    const journalMatch = fields.match(/journal\s*=\s*["{]([^"}]+)["}]/i);
    const booktitleMatch = fields.match(/booktitle\s*=\s*["{]([^"}]+)["}]/i);

    if (titleMatch && authorsMatch && yearMatch) {
      references.push({
        bibtex_key: key.trim(),
        title: titleMatch[1].trim(),
        authors: authorsMatch[1].trim(),
        year: parseInt(yearMatch[1], 10),
        source: journalMatch?.[1] || booktitleMatch?.[1] || 'Unknown',
        doi: doiMatch?.[1],
        url: urlMatch?.[1],
      });
    }
  }

  return references;
}

/**
 * Extract references from PDF text
 * Uses pattern matching to detect common reference formats
 */
function extractReferencesFromText(text: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  
  // Pattern 1: Numbered references like [1] Author, Title, Journal, Year
  // Example: [1] Smith, J. (2023). Title of paper. Journal Name, 10(2), 123-145.
  const numberedPattern = /\[(\d+)\]\s+([^.]+?)\.\s*\((\d{4})\)\.?\s*([^.]+?)\.\s*([^.]+)/g;
  let match;
  
  while ((match = numberedPattern.exec(text)) !== null) {
    const [, number, authors, year, title, source] = match;
    references.push({
      bibtex_key: `ref${number}`,
      title: title.trim(),
      authors: authors.trim(),
      year: parseInt(year, 10),
      source: source.trim().split('.')[0], // Take first part before period
    });
  }
  
  // Pattern 2: DOI-based references
  // Extract DOIs and use them to build references
  const doiPattern = /doi[:\s]*(10\.\d{4,}\/[^\s]+)/gi;
  const dois: string[] = [];
  while ((match = doiPattern.exec(text)) !== null) {
    dois.push(match[1].trim());
  }
  
  // Pattern 3: Year-based citations (Author, Year)
  // Find patterns like "Smith, J. (2023)" in the text
  const citationPattern = /([A-Z][a-z]+(?:,?\s+[A-Z]\.?)+)[,\s]+\(?(\d{4})\)?/g;
  const citations = new Set<string>();
  while ((match = citationPattern.exec(text)) !== null) {
    citations.add(`${match[1]}_${match[2]}`);
  }
  
  // If we found DOIs but no numbered references, create references from DOIs
  if (references.length === 0 && dois.length > 0) {
    dois.forEach((doi, idx) => {
      references.push({
        bibtex_key: `doi_ref${idx + 1}`,
        title: 'Reference with DOI',
        authors: 'Unknown',
        year: new Date().getFullYear(),
        source: 'Unknown',
        doi,
      });
    });
  }
  
  return references;
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
