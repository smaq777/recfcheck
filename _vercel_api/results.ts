/**
 * Vercel API Route: GET /api/results
 * Retrieves analysis results for a job
 * 
 * Usage: GET /api/results?jobId=xxx
 */

import { getAnalysisJobResults } from '../db-service';

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

    return res.status(200).json({
      success: true,
      jobId,
      references: results,
      count: results.length,
    });
  } catch (error) {
    console.error('[Results] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch results',
    });
  }
}
