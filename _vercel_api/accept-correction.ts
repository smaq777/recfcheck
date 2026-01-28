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

// Helper function to log reference updates
async function logReferenceUpdate(
  referenceId: string,
  userId: string | undefined,
  changeType: string,
  fieldName: string | undefined,
  oldValue: string | undefined,
  newValue: string | undefined,
  decision: string | undefined,
  manuallyVerified: boolean = false
) {
  try {
    await queryDatabase(
      `INSERT INTO reference_updates 
       (reference_id, user_id, change_type, field_name, old_value, new_value, decision, manually_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [referenceId, userId || null, changeType, fieldName || null, oldValue || null, newValue || null, decision || null, manuallyVerified]
    );
  } catch (error) {
    console.error('[ReferenceUpdate] Failed to log update:', error);
    // Don't fail the main operation if logging fails
  }
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

    // Get user ID from auth header if available
    const userIdHeader = req.headers['x-user-id'] || req.headers['authorization'];
    let userId: string | undefined;
    if (userIdHeader && userIdHeader.includes('Bearer')) {
      userId = userIdHeader.replace('Bearer ', '');
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
           issues = COALESCE(issues, '[]'::jsonb) || '["⚠ Warning ignored by user - accepted as-is"]'::jsonb,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [referenceId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      // Log the decision
      await logReferenceUpdate(referenceId, userId, 'ignored', null, null, null, 'ignored', true);

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: 'Warning ignored - reference accepted as-is'
      });
    }

    if (finalDecision === 'accepted') {
      // Get current reference to compare old and new values
      const currentRef = await queryDatabase(
        `SELECT * FROM "references" WHERE id = $1`,
        [referenceId]
      );

      if (!currentRef.rows || currentRef.rows.length === 0) {
        return res.status(404).json({ error: 'Reference not found' });
      }

      const oldData = currentRef.rows[0];

      // Apply corrections (either from API or manual edits)
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Track changes for logging
      const changes: Array<{ field: string; old: string; new: string }> = [];

      if (correctedData) {
        // Manual edits or specific corrections provided
        if (correctedData.title && correctedData.title !== oldData.original_title) {
          updates.push(`original_title = $${paramIndex++}`);
          values.push(correctedData.title);
          changes.push({ field: 'title', old: oldData.original_title, new: correctedData.title });
        }
        if (correctedData.authors && correctedData.authors !== oldData.original_authors) {
          updates.push(`original_authors = $${paramIndex++}`);
          values.push(correctedData.authors);
          changes.push({ field: 'authors', old: oldData.original_authors, new: correctedData.authors });
        }
        if (correctedData.year && correctedData.year !== oldData.original_year) {
          updates.push(`original_year = $${paramIndex++}`);
          values.push(correctedData.year);
          changes.push({ field: 'year', old: String(oldData.original_year), new: String(correctedData.year) });
        }
        if (correctedData.source && correctedData.source !== oldData.original_source) {
          updates.push(`original_source = $${paramIndex++}`);
          values.push(correctedData.source);
          changes.push({ field: 'source', old: oldData.original_source, new: correctedData.source });
        }
        if (correctedData.doi && correctedData.doi !== oldData.doi) {
          updates.push(`doi = $${paramIndex++}`);
          values.push(correctedData.doi);
          changes.push({ field: 'doi', old: oldData.doi, new: correctedData.doi });
        }
      } else {
        // Apply canonical values from API
        if (oldData.canonical_title && oldData.canonical_title !== oldData.original_title) {
          updates.push(`original_title = $${paramIndex++}`);
          values.push(oldData.canonical_title);
          changes.push({ field: 'title', old: oldData.original_title, new: oldData.canonical_title });
        }
        if (oldData.canonical_authors && oldData.canonical_authors !== oldData.original_authors) {
          updates.push(`original_authors = $${paramIndex++}`);
          values.push(oldData.canonical_authors);
          changes.push({ field: 'authors', old: oldData.original_authors, new: oldData.canonical_authors });
        }
        if (oldData.canonical_year && oldData.canonical_year !== oldData.original_year) {
          updates.push(`original_year = $${paramIndex++}`);
          values.push(oldData.canonical_year);
          changes.push({ field: 'year', old: String(oldData.original_year), new: String(oldData.canonical_year) });
        }
        if (oldData.venue && oldData.venue !== oldData.original_source) {
          updates.push(`original_source = $${paramIndex++}`);
          values.push(oldData.venue);
          changes.push({ field: 'source', old: oldData.original_source, new: oldData.venue });
        }
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

      // Log all changes
      for (const change of changes) {
        await logReferenceUpdate(
          referenceId,
          userId,
          'field_updated',
          change.field,
          change.old,
          change.new,
          'accepted',
          manually_verified || false
        );
      }

      // Also log the overall decision
      await logReferenceUpdate(
        referenceId,
        userId,
        'accepted',
        null,
        null,
        null,
        'accepted',
        manually_verified || false
      );

      return res.status(200).json({
        success: true,
        reference: result.rows[0],
        message: manually_verified ? 'Manual edits saved successfully' : 'Corrections applied successfully'
      });
    }

    // Rejected
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

    // Log the rejection
    await logReferenceUpdate(referenceId, userId, 'rejected', null, null, null, 'rejected', false);

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
