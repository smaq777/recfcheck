/**
 * Vercel API Route: POST /api/accept-correction
 * Updates a reference when user accepts or rejects corrections
 */

import { queryDatabase } from '../db-service';

interface AcceptCorrectionRequest {
  referenceId: string;
  accepted: boolean;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceId, accepted }: AcceptCorrectionRequest = req.body;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    console.log(`[AcceptCorrection] Reference ${referenceId}, accepted: ${accepted}`);

    if (accepted) {
      // User accepted corrections - apply canonical values to original fields
      const result = await queryDatabase(
        `UPDATE bibliography_references 
         SET 
           title = COALESCE(canonical_title, title),
           authors = COALESCE(canonical_authors, authors),
           year = COALESCE(canonical_year, year),
           source = COALESCE(venue, source),
           status = 'verified',
           confidence_score = 100,
           issues = ARRAY[CONCAT('✓ Corrected: ', 
             CASE 
               WHEN canonical_title IS NOT NULL AND canonical_title != title THEN 'title, '
               ELSE ''
             END ||
             CASE 
               WHEN canonical_authors IS NOT NULL AND canonical_authors != authors THEN 'authors, '
               ELSE ''
             END ||
             CASE 
               WHEN canonical_year IS NOT NULL AND canonical_year != year THEN 'year, '
               ELSE ''
             END ||
             CASE 
               WHEN venue IS NOT NULL AND venue != source THEN 'venue'
               ELSE ''
             END
           )],
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [referenceId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      console.log(`[AcceptCorrection] Updated reference:`, result.rows[0]);

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: 'Corrections applied successfully'
      });
    } else {
      // User rejected corrections - mark as reviewed but keep original
      const result = await queryDatabase(
        `UPDATE bibliography_references 
         SET 
           status = 'verified',
           issues = ARRAY['⚠ Needs review: User kept original values'],
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [referenceId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      console.log(`[AcceptCorrection] Marked as reviewed:`, result.rows[0]);

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: 'Reference marked as reviewed'
      });
    }
  } catch (error) {
    console.error('[AcceptCorrection] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update reference'
    });
  }
}
