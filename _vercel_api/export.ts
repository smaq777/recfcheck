import { exportReferences } from '../src/lib/exporters/export-service.js';

// Import database function
async function getJobReferences(jobId) {
  const { query } = await import('../db-connection.js');
  const result = await query(
    'SELECT * FROM "references" WHERE job_id = $1 ORDER BY created_at',
    [jobId]
  );
  return result.rows;
}

async function getReferenceById(referenceId) {
  const { query } = await import('../db-connection.js');
  const result = await query(
    'SELECT * FROM "references" WHERE id = $1',
    [referenceId]
  );
  return result.rows[0];
}

async function logActivity(userId, jobId, action, details) {
  try {
    const { query } = await import('../db-connection.js');
    await query(
      'INSERT INTO activity_log (user_id, job_id, action, details) VALUES ($1, $2, $3, $4)',
      [userId, jobId, action, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, format = 'bibtex', style = 'apa', referenceIds } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get references
    let references;
    
    if (referenceIds && referenceIds.length > 0) {
      // Get specific references
      references = [];
      for (const refId of referenceIds) {
        const ref = await getReferenceById(refId);
        if (ref) references.push(ref);
      }
    } else {
      // Get all references for the job
      references = await getJobReferences(jobId);
    }

    if (references.length === 0) {
      return res.status(404).json({ error: 'No references found' });
    }

    // Export in requested format
    const exported = await exportReferences(references, format, style);
    
    // Get user ID from headers if available (for logging)
    const authHeader = req.headers.authorization || req.headers['x-user-id'];
    let userId = null;
    if (authHeader) {
      userId = authHeader.replace('Bearer ', '');
    }

    // Log export activity
    if (userId) {
      await logActivity(userId, jobId, 'export', { 
        format, 
        style, 
        count: references.length,
        referenceIds: referenceIds || 'all'
      });
    }

    // Set response headers
    res.setHeader('Content-Type', exported.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    
    if (exported.instructions) {
      res.setHeader('X-Instructions', exported.instructions);
    }

    // For LaTeX exports, also provide the .bib file if available
    if (exported.bibContent) {
      res.setHeader('X-Bib-Content', Buffer.from(exported.bibContent).toString('base64'));
      res.setHeader('X-Bib-Filename', exported.bibFilename);
    }
    
    return res.status(200).send(exported.content);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Export failed',
      details: error.message 
    });
  }
}