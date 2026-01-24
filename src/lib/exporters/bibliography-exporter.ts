/**
 * Bibliography Export Utilities
 * Exports corrected references to BibTeX, RIS, and Word formats
 */

interface ExportReference {
  bibtex_key: string;
  original_title: string;
  original_authors: string;
  original_year: number;
  original_source?: string;
  doi?: string;
  url?: string;
  venue?: string;
  bibtex_type?: string;
  metadata?: {
    publisher?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    editor?: string;
    container_title?: string;
    is_conference?: boolean;
    address?: string;
    month?: string;
  };
}

/**
 * Export to BibTeX format
 */
export function exportToBibTeX(references: ExportReference[]): string {
  let bibtex = '';

  references.forEach(ref => {
    const type = ref.bibtex_type || 'article';
    const metadata = ref.metadata || {};

    bibtex += `@${type}{${ref.bibtex_key},\n`;
    bibtex += `  title = {${ref.original_title}},\n`;
    bibtex += `  author = {${ref.original_authors}},\n`;
    bibtex += `  year = {${ref.original_year}},\n`;

    // Venue handling based on type
    const venue = ref.venue || ref.original_source || metadata.container_title;
    if (venue) {
      if (type === 'inproceedings') {
        bibtex += `  booktitle = {${venue}},\n`;
      } else {
        bibtex += `  journal = {${venue}},\n`;
      }
    }

    // Rich metadata
    if (metadata.editor) bibtex += `  editor = {${metadata.editor}},\n`;
    if (metadata.publisher) bibtex += `  publisher = {${metadata.publisher}},\n`;
    if (metadata.pages) bibtex += `  pages = {${metadata.pages}},\n`;
    if (metadata.volume) bibtex += `  volume = {${metadata.volume}},\n`;
    if (metadata.issue) bibtex += `  number = {${metadata.issue}},\n`;
    if (metadata.month) bibtex += `  month = {${metadata.month}},\n`;
    if (metadata.address) bibtex += `  address = {${metadata.address}},\n`;

    if (ref.doi) {
      bibtex += `  doi = {${ref.doi}},\n`;
    }

    if (ref.url) {
      bibtex += `  url = {${ref.url}},\n`;
    }

    bibtex += `}\n\n`;
  });

  return bibtex;
}

/**
 * Export to RIS format (Research Information Systems)
 * Used by reference managers like EndNote, Mendeley, Zotero
 */
export function exportToRIS(references: ExportReference[]): string {
  let ris = '';

  references.forEach(ref => {
    ris += 'TY  - JOUR\n'; // Journal Article
    ris += `TI  - ${ref.original_title}\n`;

    // Split authors and add individually
    const authors = ref.original_authors.split(/[,;&]|\\s+and\\s+/).map(a => a.trim());
    authors.forEach(author => {
      if (author) {
        ris += `AU  - ${author}\n`;
      }
    });

    ris += `PY  - ${ref.original_year}\n`;

    if (ref.venue || ref.original_source) {
      ris += `JO  - ${ref.venue || ref.original_source}\n`;
    }

    if (ref.doi) {
      ris += `DO  - ${ref.doi}\n`;
    }

    if (ref.url) {
      ris += `UR  - ${ref.url}\n`;
    }

    ris += 'ER  - \n\n';
  });

  return ris;
}

/**
 * Export to plain text format (suitable for Word)
 * Follows APA-style formatting
 */
export function exportToPlainText(references: ExportReference[]): string {
  let text = 'REFERENCES\n\n';

  references.forEach((ref, index) => {
    // Format: Authors (Year). Title. Journal. DOI
    const authors = ref.original_authors.replace(/\\s+and\\s+/, ', & ');
    text += `${index + 1}. ${authors} (${ref.original_year}). ${ref.original_title}. `;

    if (ref.venue || ref.original_source) {
      text += `${ref.venue || ref.original_source}. `;
    }

    if (ref.doi) {
      text += `https://doi.org/${ref.doi}`;
    }

    text += '\n\n';
  });

  return text;
}

/**
 * Download file to user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export references with user-confirmed corrections
 */
export function exportCorrectedBibliography(
  references: ExportReference[],
  format: 'bibtex' | 'ris' | 'txt',
  filename: string
) {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'bibtex':
      content = exportToBibTeX(references);
      mimeType = 'application/x-bibtex';
      extension = '.bib';
      break;
    case 'ris':
      content = exportToRIS(references);
      mimeType = 'application/x-research-info-systems';
      extension = '.ris';
      break;
    case 'txt':
      content = exportToPlainText(references);
      mimeType = 'text/plain';
      extension = '.txt';
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const finalFilename = filename.replace(/\\.[^.]+$/, '') + extension;
  downloadFile(content, finalFilename, mimeType);
}
