/**
 * Vercel API Route: GET /api/reference-history
 * Fetches the update history for a specific reference
 */

import { queryDatabase } from '../db-service';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceId } = req.query;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    // Fetch all updates for the reference, ordered by most recent first
    const result = await queryDatabase(
      `SELECT 
         id,
         reference_id,
         user_id,
         change_type,
         field_name,
         old_value,
         new_value,
         decision,
         manually_verified,
         created_at
       FROM reference_updates
       WHERE reference_id = $1
       ORDER BY created_at DESC`,
      [referenceId]
    );

    if (!result.rows) {
      return res.status(200).json({ updates: [] });
    }

    return res.status(200).json({
      success: true,
      updates: result.rows
    });
  } catch (error: any) {
    console.error('[ReferenceHistory] Error:', error);
    
    // If table doesn't exist yet, return empty array instead of error
    if (error.message && error.message.includes('reference_updates')) {
      return res.status(200).json({
        success: true,
        updates: []
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch reference history'
    });
  }
}
