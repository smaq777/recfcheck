/**
 * Vercel API Route: GET /api/results
 * Retrieves analysis results for a job
 * 
 * Usage: GET /api/results?jobId=xxx
 */

import { getAnalysisJobResults } from '../db-service';

/**
 * Detect duplicate references based on title similarity
 */
function detectDuplicates(references: any[]): any[] {
  const titleMap = new Map<string, number[]>();
  
  // Normalize titles and group by similarity
  references.forEach((ref, index) => {
    const normalizedTitle = (ref.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (normalizedTitle) {
      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)!.push(index);
    }
  });
  
  // Mark duplicates
  titleMap.forEach((indices) => {
    if (indices.length > 1) {
      // Keep first occurrence, mark rest as duplicates
      for (let i = 1; i < indices.length; i++) {
        const idx = indices[i];
        references[idx].status = 'duplicate';
        references[idx].issues = [
          ...(references[idx].issues || []),
          `DUPLICATE OF ${references[indices[0]].bibtex_key || 'FIRST ENTRY'}`
        ];
        references[idx].duplicate_group_id = indices[0];
        references[idx].duplicate_group_count = indices.length;
      }
      
      // Mark first as having duplicates
      references[indices[0]].duplicate_group_count = indices.length;
      references[indices[0]].is_primary_duplicate = true;
    }
  });
  
  return references;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }

    const results = await getAnalysisJobResults(jobId as string);
    
    // Map database fields to frontend expected fields
    const mappedResults = results.map(ref => ({
      ...ref,
      // Map original_* fields expected by frontend
      original_title: ref.title,
      original_authors: ref.authors,
      original_year: ref.year,
      original_source: ref.source,
      // Ensure arrays and defaults
      issues: ref.issues || [],
      confidence_score: ref.confidence_score ?? 0,
      // Additional fields for frontend
      google_scholar_url: ref.doi ? `https://scholar.google.com/scholar?q=${encodeURIComponent(ref.doi)}` : null,
      openalex_url: ref.doi ? `https://openalex.org/works/${encodeURIComponent(ref.doi)}` : null,
      crossref_url: ref.doi ? `https://api.crossref.org/works/${encodeURIComponent(ref.doi)}` : null,
      semantic_scholar_url: ref.doi ? `https://www.semanticscholar.org/paper/${encodeURIComponent(ref.doi)}` : null,
      cited_by_count: null,
      verified_by: [],
    }));
    
    // Detect and mark duplicates
    const withDuplicates = detectDuplicates(mappedResults);

    console.log(`[Results] Returning ${withDuplicates.length} references for job ${jobId}`);

    return res.status(200).json({
      success: true,
      jobId,
      references: withDuplicates,
      count: withDuplicates.length,
    });
  } catch (error) {
    console.error('[Results] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch results',
    });
  }
}
