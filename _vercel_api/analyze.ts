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
import { verifyWithOpenAlex, getAiVerificationInsight } from '../api';

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
 * Async analysis of references (runs in background)
 * Vercel serverless: this may timeout, so save progress to DB
 */
async function analyzeReferencesAsync(jobId: string, userId: string, references: any[]) {
  try {
    let verifiedCount = 0;
    let issuesCount = 0;

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

        // 3. Save to database
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
          status: verification.status as any,
          confidence_score: (verification.confidence as number) || 0,
          canonical_title: verification.canonicalTitle,
          canonical_year: verification.canonicalYear,
          venue: verification.venue,
          issues: verification.issues as string[],
          is_retracted: verification.status === 'retracted',
          ai_insight: aiInsight,
        });

        if (verification.status === 'verified') verifiedCount++;
        if (verification.status === 'issue' || verification.status === 'retracted') issuesCount++;
      } catch (refError) {
        console.error(`[Analysis] Error analyzing reference ${ref.bibtex_key}:`, refError);
      }
    }

    // Update job completion status
    await updateAnalysisJobStatus(jobId, 'completed', {
      verified: verifiedCount,
      issues: issuesCount,
    });

    console.log(`[Analysis] Job ${jobId} completed: ${verifiedCount} verified, ${issuesCount} issues`);
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
