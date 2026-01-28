/**
 * Vercel API Route: POST /api/analyze
 * Handles file upload, parsing, and analysis
 * 
 * Usage (from frontend):
 * const formData = new FormData();
 * formData.append('file', file);
 * formData.append('userId', userId);
 * 
 * const response = await fetch('/api/analyze', { method: 'POST', body: formData });
 */

import { parseFile, hasValidBibliography, getMissingBibliographyError } from '../file-parser';
import { createAnalysisJob, saveBibliographyReference, updateAnalysisJobStatus } from '../db-service';
import { verifyWithOpenAlex, getAiVerificationInsight } from '../services';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

interface AnalyzeRequest {
  userId: string;
  file: Buffer;
  fileName: string;
}

interface AnalyzeResponse {
  success: boolean;
  jobId?: string;
  error?: string;
  references?: any[];
}

/**
 * POST /api/analyze - Main analysis endpoint
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const { userId, file, fileName } = await parseFormData(req);

    if (!userId || !file || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log(`[Analysis] Starting for file: ${fileName}, size: ${file.length} bytes`);

    // 1. Parse file for bibliography
    const references = await parseFile(fileName, file);

    // 2. Check if bibliography exists
    if (!hasValidBibliography(references)) {
      return res.status(400).json({
        success: false,
        error: getMissingBibliographyError(fileName),
      });
    }

    console.log(`[Analysis] Found ${references.length} references`);

    // 3. Create analysis job in database
    const job = await createAnalysisJob(userId, fileName, file.length, getFileType(fileName));

    // 4. Start async analysis (don't wait for it to complete)
    analyzeReferencesAsync(job.id, userId, references).catch(error => {
      console.error('[Analysis] Async analysis error:', error);
      updateAnalysisJobStatus(job.id, 'failed');
    });

    // Return job ID immediately (Vercel serverless timeout)
    return res.status(200).json({
      success: true,
      jobId: job.id,
      references: references.length,
      message: `Analysis started for ${references.length} references`,
    });
  } catch (error) {
    console.error('[Analysis] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
}

/**
 * Parse multipart form data
 */
async function parseFormData(req: any): Promise<{ userId: string; file: Buffer; fileName: string }> {
  return new Promise((resolve, reject) => {
    let fields: any = {};
    let file: Buffer | null = null;
    let fileName = '';

    req.on('data', (chunk: Buffer) => {
      // Handle form data parsing
      // In production, use busboy or formidable
      file = chunk;
    });

    req.on('end', () => {
      const userId = req.query.userId || req.body?.userId || 'anonymous';
      const filename = req.query.fileName || req.body?.fileName || 'upload';

      if (!file) {
        return reject(new Error('No file provided'));
      }

      resolve({ userId, file, fileName: filename });
    });

    req.on('error', reject);
  });
}

/**
 * Normalize title for duplicate detection
 * Removes punctuation, converts to lowercase, removes extra whitespace
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity percentage between two strings using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);
  
  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Calculate author similarity using name overlap
 * Returns 0-100 percentage
 */
function calculateAuthorSimilarity(authors1: string, authors2: string): number {
  if (!authors1 || !authors2) return 0;
  
  // Normalize and extract author names
  const extractNames = (str: string): Set<string> => {
    const normalized = str.toLowerCase()
      .replace(/[,;]/g, ' ')
      .replace(/\band\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Split by spaces and filter out initials/short words
    const names = normalized.split(/\s+/).filter(n => n.length > 2);
    return new Set(names);
  };
  
  const names1 = extractNames(authors1);
  const names2 = extractNames(authors2);
  
  if (names1.size === 0 || names2.size === 0) return 0;
  
  // Count matching names
  let matchCount = 0;
  for (const name of names1) {
    if (names2.has(name)) {
      matchCount++;
    }
  }
  
  // Jaccard similarity
  const unionSize = names1.size + names2.size - matchCount;
  return Math.round((matchCount / unionSize) * 100);
}

/**
 * Levenshtein distance algorithm for string similarity
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Check if two titles are duplicates using advanced similarity matching
 */
function areTitlesDuplicate(title1: string, title2: string): boolean {
  const similarity = calculateStringSimilarity(title1, title2);
  
  // Require 95% similarity for duplicate detection (very strict)
  return similarity >= 95;
}

/**
 * Detect duplicate references using multi-criteria matching
 * Priority order: DOI > Title+Year > Title similarity
 */
function detectDuplicates(references: any[]): Map<string, string[]> {
  const duplicateGroups = new Map<string, string[]>();
  const processed = new Set<number>();
  
  console.log(`[Duplicates] Analyzing ${references.length} references...`);
  
  for (let i = 0; i < references.length; i++) {
    if (processed.has(i)) continue;
    
    const ref1 = references[i];
    const group: string[] = [ref1.bibtex_key];
    
    for (let j = i + 1; j < references.length; j++) {
      if (processed.has(j)) continue;
      
      const ref2 = references[j];
      let isDuplicate = false;
      let matchReason = '';
      
      // CRITICAL RULE: DOI is the ultimate truth
      // If both have DOIs and they're DIFFERENT, they are DEFINITELY NOT duplicates
      const doi1 = ref1.doi?.toLowerCase().trim();
      const doi2 = ref2.doi?.toLowerCase().trim();
      
      if (doi1 && doi2 && doi1 !== doi2) {
        // Different DOIs = definitely different papers, skip all other checks
        continue;
      }
      
      // CRITERION 1: Exact DOI match (100% reliable - only way to confirm duplicate)
      if (doi1 && doi2 && doi1 === doi2) {
        isDuplicate = true;
        matchReason = `Exact DOI match: ${doi1}`;
      }
      
      // CRITERION 2: Very strict title+year+author match
      // Same authors can publish multiple similar papers - require VERY high threshold
      if (!isDuplicate && ref1.title && ref2.title) {
        const titleSimilarity = calculateStringSimilarity(ref1.title, ref2.title);
        const authorSimilarity = calculateAuthorSimilarity(ref1.authors, ref2.authors);
        
        // Require 99.5% title similarity AND exact year AND 80%+ author overlap
        // This prevents "Arabic SMS phishing URLs" vs "Arabic SMS phishing text" false positives
        if (titleSimilarity >= 99.5 && ref1.year === ref2.year && authorSimilarity >= 80) {
          isDuplicate = true;
          matchReason = `Near-identical title (${titleSimilarity.toFixed(1)}%) + exact year (${ref1.year}) + author overlap (${authorSimilarity.toFixed(1)}%)`;
        }
        
        // Log near-misses for debugging
        if (titleSimilarity >= 85 && titleSimilarity < 99.5 && ref1.year === ref2.year) {
          console.log(`[Duplicates] Near-miss (NOT duplicate):`);
          console.log(`  Title similarity: ${titleSimilarity.toFixed(1)}% (need 99.5%+)`);
          console.log(`  [${i}] "${ref1.title?.substring(0, 60)}..."`);
          console.log(`  [${j}] "${ref2.title?.substring(0, 60)}..."`);
        }
      }
      
      if (isDuplicate) {
        console.log(`[Duplicates] Found duplicate pair:`);
        console.log(`  [${i}] ${ref1.bibtex_key}: "${ref1.title?.substring(0, 60)}..."`);
        console.log(`  [${j}] ${ref2.bibtex_key}: "${ref2.title?.substring(0, 60)}..."`);
        console.log(`  Reason: ${matchReason}`);
        
        group.push(ref2.bibtex_key);
        processed.add(j);
      }
    }
    
    // Only create group if we found duplicates
    if (group.length > 1) {
      const groupId = `dup-${Date.now()}-${i}`;
      duplicateGroups.set(groupId, group);
      processed.add(i);
      console.log(`[Duplicates] Created group ${groupId} with ${group.length} entries`);
    }
  }
  
  console.log(`[Duplicates] Found ${duplicateGroups.size} duplicate groups`);
  return duplicateGroups;
}

/**
 * Async analysis of references (runs in background)
 * Vercel serverless: this may timeout, so save progress to DB
 */
async function analyzeReferencesAsync(jobId: string, userId: string, references: any[]) {
  try {
    let verifiedCount = 0;
    let issuesCount = 0;
    let warningsCount = 0;

    // Detect duplicates BEFORE verification
    const duplicateGroups = detectDuplicates(references);
    
    // Create a map of bibtex_key -> { groupId, isPrimary }
    const duplicateMap = new Map<string, { groupId: string; isPrimary: boolean }>();
    for (const [groupId, keys] of duplicateGroups.entries()) {
      keys.forEach((key, index) => {
        duplicateMap.set(key, {
          groupId,
          isPrimary: index === 0 // First one is primary
        });
      });
    }

    for (const ref of references) {
      try {
        // 1. Verify with OpenAlex
        const verification = await verifyWithOpenAlex({
          ...ref,
          id: ref.bibtex_key,
          status: 'pending',
          confidence: 0,
        });

        // 2. Get AI insight
        let aiInsight = '';
        if (verification.status !== 'not_found') {
          aiInsight = await getAiVerificationInsight({
            ...ref,
            ...verification,
            id: ref.bibtex_key,
          } as any);
        }

        // 3. Check if this ref is a duplicate
        const duplicateInfo = duplicateMap.get(ref.bibtex_key);
        const isDuplicate = duplicateInfo !== undefined;
        const duplicateGroupId = duplicateInfo?.groupId || null;
        const isPrimaryDuplicate = duplicateInfo?.isPrimary || false;

        // Determine final status
        const finalStatus = isDuplicate ? 'duplicate' : (verification.status as any);

        // 3.5. Generate Google Scholar search URL (free, no API needed)
        const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(`${ref.title}${ref.year ? ' ' + ref.year : ''}`)}`.trim();

        // 4. Save to database
        await saveBibliographyReference({
          job_id: jobId,
          user_id: userId,
          bibtex_key: ref.bibtex_key,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          source: ref.source,
          doi: ref.doi,
          url: ref.url,
          status: finalStatus,
          confidence_score: (verification.confidence as number) || 0,
          canonical_title: verification.canonicalTitle,
          canonical_year: verification.canonicalYear,
          venue: verification.venue,
          issues: isDuplicate 
            ? [...(verification.issues as string[] || []), 'Duplicate reference detected']
            : (verification.issues as string[]),
          is_retracted: verification.status === 'retracted',
          ai_insight: aiInsight,
          duplicate_group_id: duplicateGroupId,
          is_primary_duplicate: isPrimaryDuplicate,
          google_scholar_url: googleScholarUrl,
        });

        // Count statuses correctly
        if (finalStatus === 'verified') {
          verifiedCount++;
        } else if (finalStatus === 'warning') {
          warningsCount++;
        } else if (finalStatus === 'issue' || finalStatus === 'retracted' || finalStatus === 'not_found' || finalStatus === 'duplicate') {
          issuesCount++;
        }
      } catch (refError) {
        console.error(`[Analysis] Error analyzing reference ${ref.bibtex_key}:`, refError);
      }
    }

    // Update job completion status
    await updateAnalysisJobStatus(jobId, 'completed', {
      verified: verifiedCount,
      issues: issuesCount,
      warnings: warningsCount,
    });

    console.log(`[Analysis] Job ${jobId} completed: ${verifiedCount} verified, ${issuesCount} issues, ${warningsCount} warnings`);
  } catch (error) {
    console.error('[Analysis] Async job error:', error);
    await updateAnalysisJobStatus(jobId, 'failed');
  }
}

/**
 * Get file type from extension
 */
function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext || 'unknown';
}
