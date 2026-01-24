/**
 * Update Reference API Endpoint
 * Applies canonical data (from APIs) to a reference
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db-service';

interface UpdateReferenceRequest {
  referenceId: string;
  applyFields: string[]; // ['title', 'authors', 'year', 'doi', 'venue']
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceId, applyFields }: UpdateReferenceRequest = req.body;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    // Get the reference with canonical data
    const referenceResult = await query(
      `SELECT * FROM references WHERE id = $1`,
      [referenceId]
    );

    if (referenceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    const ref = referenceResult.rows[0];

    // Build UPDATE statement dynamically based on applyFields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (applyFields.includes('title') && ref.canonical_title) {
      updates.push(`original_title = $${paramIndex}`);
      values.push(ref.canonical_title);
      paramIndex++;
    }

    if (applyFields.includes('authors') && ref.canonical_authors) {
      updates.push(`original_authors = $${paramIndex}`);
      values.push(ref.canonical_authors);
      paramIndex++;
    }

    if (applyFields.includes('year') && ref.canonical_year) {
      updates.push(`original_year = $${paramIndex}`);
      values.push(ref.canonical_year);
      paramIndex++;
    }

    if (applyFields.includes('venue') && ref.venue) {
      updates.push(`original_source = $${paramIndex}`);
      values.push(ref.venue);
      paramIndex++;
    }

    if (applyFields.includes('doi') && ref.doi) {
      // DOI doesn't have original/canonical distinction, just update
      updates.push(`doi = $${paramIndex}`);
      values.push(ref.doi);
      paramIndex++;
    }

    // Always update status to 'verified' and set updated_at
    updates.push(`status = $${paramIndex}`);
    values.push('verified');
    paramIndex++;

    updates.push(`updated_at = NOW()`);

    // Add the reference ID as the last parameter
    values.push(referenceId);

    const updateQuery = `
      UPDATE references 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    return res.status(200).json({
      success: true,
      message: 'Reference updated successfully',
      reference: result.rows[0]
    });

  } catch (error: any) {
    console.error('Update reference error:', error);
    return res.status(500).json({ 
      error: 'Failed to update reference',
      details: error.message 
    });
  }
}
