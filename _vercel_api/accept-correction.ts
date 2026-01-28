/**
 * Vercel API Route: POST /api/accept-correction
 * Updates a reference when user accepts, rejects, or ignores corrections
 */

import { queryDatabase } from '../db-service';

interface AcceptCorrectionRequest {
  referenceId: string;
  jobId?: string;
  decision: 'accepted' | 'rejected' | 'ignored';
  correctedData?: {
    title?: string;
    authors?: string;
    year?: number;
    source?: string;
    doi?: string;
    bibtex_type?: string;
    metadata?: any;
  };
  manually_verified?: boolean;
  accepted?: boolean; // Legacy support
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      referenceId, 
      decision, 
      correctedData, 
      manually_verified, 
      accepted // Legacy support
    }: AcceptCorrectionRequest = req.body;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    // Handle legacy 'accepted' boolean
    const finalDecision = decision || (accepted ? 'accepted' : 'rejected');

    console.log(`[AcceptCorrection] Reference ${referenceId}, decision: ${finalDecision}, manually_verified: ${manually_verified}`);

    if (finalDecision === 'ignored') {
      // User ignored warning - mark as manually verified with original data
      const result = await queryDatabase(
        `UPDATE "references" 
         SET 
           status = 'verified',
           manually_verified = TRUE,
           issues = ARRAY['⚠ Warning ignored by user - accepted as-is'],
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [referenceId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: 'Warning ignored - reference accepted as-is'
      });
    }

    if (finalDecision === 'accepted') {
      // Apply corrections (either from API or manual edits)
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (correctedData) {
        // Manual edits or specific corrections provided
        if (correctedData.title) {
          updates.push(`original_title = $${paramIndex++}`);
          values.push(correctedData.title);
        }
        if (correctedData.authors) {
          updates.push(`original_authors = $${paramIndex++}`);
          values.push(correctedData.authors);
        }
        if (correctedData.year) {
          updates.push(`original_year = $${paramIndex++}`);
          values.push(correctedData.year);
        }
        if (correctedData.source) {
          updates.push(`original_source = $${paramIndex++}`);
          values.push(correctedData.source);
        }
        if (correctedData.doi) {
          updates.push(`doi = $${paramIndex++}`);
          values.push(correctedData.doi);
        }
      } else {
        // Apply canonical values from API
        updates.push(`original_title = COALESCE(canonical_title, original_title)`);
        updates.push(`original_authors = COALESCE(canonical_authors, original_authors)`);
        updates.push(`original_year = COALESCE(canonical_year, original_year)`);
        updates.push(`original_source = COALESCE(venue, original_source)`);
      }

      updates.push(`status = $${paramIndex++}`);
      values.push('verified');

      if (manually_verified) {
        updates.push(`manually_verified = $${paramIndex++}`);
        values.push(true);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(referenceId);

      const query = `UPDATE "references" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      
      const result = await queryDatabase(query, values);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: manually_verified ? 'Manual edits saved successfully' : 'Corrections applied successfully'
      });
    }

    // Rejected
    const result = await queryDatabase(
      `UPDATE "references" 
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

    return res.status(200).json({
      success: true,
      reference: result.rows[0],
      message: 'Reference marked as reviewed'
    });
  } catch (error) {
    console.error('[AcceptCorrection] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update reference'
    });
  }
}
