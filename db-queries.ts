// Database queries for RefCheck application
import { query, transaction } from './db-connection';

// ============================================
// USER OPERATIONS
// ============================================

export async function createUser(email: string, passwordHash: string, fullName?: string) {
  const result = await query(
    'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
    [email, passwordHash, fullName]
  );
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

export async function getUserById(userId: string) {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

export async function updateUserVerification(userId: string, verified: boolean) {
  await query('UPDATE users SET email_verified = $1 WHERE id = $2', [verified, userId]);
}

export async function setResetToken(email: string, token: string, expires: Date) {
  await query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
    [token, expires, email]
  );
}

// ============================================
// JOB OPERATIONS
// ============================================

export async function createJob(userId: string, fileName: string, fileType: string, totalReferences: number) {
  const result = await query(
    `INSERT INTO jobs (user_id, file_name, file_type, total_references, status) 
     VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
    [userId, fileName, fileType, totalReferences]
  );
  return result.rows[0];
}

export async function getJobById(jobId: string) {
  const result = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  return result.rows[0];
}

export async function getUserJobs(userId: string, limit = 50) {
  const result = await query(
    `SELECT * FROM jobs WHERE user_id = $1 
     ORDER BY upload_time DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function updateJobProgress(jobId: string, progress: number, message?: string) {
  await query(
    'UPDATE jobs SET progress = $1, progress_message = $2 WHERE id = $3',
    [progress, message, jobId]
  );
}

export async function completeJob(jobId: string, status: 'completed' | 'failed', errorMessage?: string) {
  await query(
    `UPDATE jobs SET status = $1, completed_at = CURRENT_TIMESTAMP, 
     error_message = $2, progress = 100 WHERE id = $3`,
    [status, errorMessage, jobId]
  );
}

// ============================================
// REFERENCE OPERATIONS
// ============================================

export async function createReference(jobId: string, referenceData: any) {
  const result = await query(
    `INSERT INTO references (
      job_id, bibtex_key,
      original_title, original_authors, original_year, original_source,
      canonical_title, canonical_authors, canonical_year,
      status, confidence_score, venue, doi, is_retracted, cited_by_count,
      google_scholar_url, openalex_url, crossref_url, semantic_scholar_url,
      duplicate_group_id, duplicate_group_count, is_primary_duplicate
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *`,
    [
      jobId,
      referenceData.bibtex_key,
      referenceData.original_title,
      referenceData.original_authors,
      referenceData.original_year,
      referenceData.original_source,
      referenceData.canonical_title,
      referenceData.canonical_authors,
      referenceData.canonical_year,
      referenceData.status,
      referenceData.confidence_score,
      referenceData.venue,
      referenceData.doi,
      referenceData.is_retracted || false,
      referenceData.cited_by_count,
      referenceData.google_scholar_url,
      referenceData.openalex_url,
      referenceData.crossref_url,
      referenceData.semantic_scholar_url,
      referenceData.duplicate_group_id,
      referenceData.duplicate_group_count,
      referenceData.is_primary_duplicate || false
    ]
  );
  return result.rows[0];
}

export async function getJobReferences(jobId: string) {
  const result = await query(
    'SELECT * FROM references WHERE job_id = $1 ORDER BY created_at',
    [jobId]
  );
  return result.rows;
}

export async function getReferenceById(referenceId: string) {
  const result = await query('SELECT * FROM references WHERE id = $1', [referenceId]);
  return result.rows[0];
}

export async function updateReferenceDecision(
  referenceId: string,
  decision: 'accepted' | 'rejected',
  correctedData?: { title?: string; authors?: string; year?: number }
) {
  if (decision === 'accepted' && correctedData) {
    await query(
      `UPDATE references SET 
        user_decision = $1,
        corrected_title = $2,
        corrected_authors = $3,
        corrected_year = $4,
        status = 'verified'
       WHERE id = $5`,
      [decision, correctedData.title, correctedData.authors, correctedData.year, referenceId]
    );
  } else {
    await query(
      'UPDATE references SET user_decision = $1 WHERE id = $2',
      [decision, referenceId]
    );
  }
}

export async function markDuplicates(jobId: string, duplicateGroupId: string, referenceIds: string[], primaryId: string) {
  await transaction(async (client) => {
    // Update all duplicates in the group
    for (const refId of referenceIds) {
      await client.query(
        `UPDATE references SET 
          duplicate_group_id = $1,
          duplicate_group_count = $2,
          is_primary_duplicate = $3,
          status = CASE WHEN id = $4 THEN status ELSE 'duplicate' END
         WHERE id = $5`,
        [duplicateGroupId, referenceIds.length, refId === primaryId, primaryId, refId]
      );
    }
  });
}

export async function deleteDuplicateReferences(jobId: string, referenceIds: string[]) {
  await query(
    'DELETE FROM references WHERE job_id = $1 AND id = ANY($2)',
    [jobId, referenceIds]
  );
}

// ============================================
// VERIFICATION SOURCES
// ============================================

export async function addVerificationSource(
  referenceId: string,
  sourceName: string,
  found: boolean,
  confidence?: number
) {
  await query(
    'INSERT INTO verification_sources (reference_id, source_name, found, confidence) VALUES ($1, $2, $3, $4)',
    [referenceId, sourceName, found, confidence]
  );
}

export async function getVerificationSources(referenceId: string) {
  const result = await query(
    'SELECT * FROM verification_sources WHERE reference_id = $1',
    [referenceId]
  );
  return result.rows;
}

// ============================================
// REFERENCE ISSUES
// ============================================

export async function addReferenceIssue(referenceId: string, issueText: string, issueType: string = 'warning') {
  await query(
    'INSERT INTO reference_issues (reference_id, issue_text, issue_type) VALUES ($1, $2, $3)',
    [referenceId, issueText, issueType]
  );
}

export async function getReferenceIssues(referenceId: string) {
  const result = await query(
    'SELECT * FROM reference_issues WHERE reference_id = $1',
    [referenceId]
  );
  return result.rows;
}

// ============================================
// EXPORT HISTORY
// ============================================

export async function logExport(jobId: string, userId: string, format: string) {
  await query(
    'INSERT INTO export_history (job_id, user_id, export_format) VALUES ($1, $2, $3)',
    [jobId, userId, format]
  );
}

export async function getExportHistory(userId: string) {
  const result = await query(
    `SELECT e.*, j.file_name FROM export_history e
     JOIN jobs j ON e.job_id = j.id
     WHERE e.user_id = $1
     ORDER BY e.exported_at DESC LIMIT 100`,
    [userId]
  );
  return result.rows;
}

// ============================================
// ACTIVITY LOG
// ============================================

export async function logActivity(
  userId: string | null,
  jobId: string | null,
  action: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  await query(
    `INSERT INTO activity_log (user_id, job_id, action, details, ip_address, user_agent) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, jobId, action, details ? JSON.stringify(details) : null, ipAddress, userAgent]
  );
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export async function getJobSummary(jobId: string) {
  const result = await query('SELECT * FROM job_summary WHERE id = $1', [jobId]);
  return result.rows[0];
}

export async function getUserStats(userId: string) {
  const result = await query(
    `SELECT 
      COUNT(*) as total_jobs,
      SUM(total_references) as total_references_checked,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs
     FROM jobs WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}
