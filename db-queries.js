import { query, transaction } from './db-connection.js';

// ==================== USER OPERATIONS ====================

/**
 * Create a new user
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} passwordHash - Hashed password
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(email, name, passwordHash) {
  const result = await query(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, name, passwordHash]
  );
  return result.rows[0];
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserByEmail(email) {
  const result = await query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Get user by ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(userId) {
  const result = await query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

// ==================== JOB OPERATIONS ====================

/**
 * Create a new verification job
 * @param {string} userId - User UUID
 * @param {string} fileName - Uploaded file name
 * @param {string} fileType - File type (bib, pdf, etc.)
 * @param {number} totalReferences - Total number of references
 * @returns {Promise<Object>} Created job object
 */
export async function createJob(userId, fileName, fileType, totalReferences) {
  const result = await query(
    `INSERT INTO jobs (user_id, file_name, file_type, total_references, status, progress)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, fileName, fileType, totalReferences, 'processing', 0]
  );
  return result.rows[0];
}

/**
 * Get job by ID
 * @param {string} jobId - Job UUID
 * @returns {Promise<Object|null>} Job object or null
 */
export async function getJobById(jobId) {
  const result = await query(
    `SELECT * FROM jobs WHERE id = $1 LIMIT 1`,
    [jobId]
  );
  return result.rows[0] || null;
}

/**
 * Update job progress
 * @param {string} jobId - Job UUID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} currentStep - Current processing step description
 * @returns {Promise<Object>} Updated job object
 */
export async function updateJobProgress(jobId, progress, currentStep) {
  const result = await query(
    `UPDATE jobs 
     SET progress = $1, progress_message = $2
     WHERE id = $3
     RETURNING *`,
    [progress, currentStep, jobId]
  );
  return result.rows[0];
}

/**
 * Mark job as completed
 * @param {string} jobId - Job UUID
 * @param {string} status - Final status ('completed' or 'failed')
 * @returns {Promise<Object>} Updated job object
 */
export async function completeJob(jobId, status = 'completed') {
  const result = await query(
    `UPDATE jobs 
     SET status = $1, progress = 100, completed_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, jobId]
  );
  return result.rows[0];
}

/**
 * Get all jobs for a user
 * @param {string} userId - User UUID
 * @param {number} limit - Maximum number of jobs to return
 * @returns {Promise<Array>} Array of job objects
 */
export async function getUserJobs(userId, limit = 50) {
  const result = await query(
    `SELECT j.*,
     (SELECT COUNT(*)::int FROM "references" r WHERE r.job_id = j.id AND r.status = 'verified') as verified_count,
     (SELECT COUNT(*)::int FROM "references" r WHERE r.job_id = j.id AND r.issues IS NOT NULL AND jsonb_typeof(r.issues) = 'array' AND jsonb_array_length(r.issues) > 0) as issues_count
     FROM jobs j 
     WHERE user_id = $1 
     ORDER BY upload_time DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// ==================== REFERENCE OPERATIONS ====================

/**
 * Create a new reference entry
 * @param {string} jobId - Job UUID
 * @param {Object} referenceData - Reference data object
 * @returns {Promise<Object>} Created reference object
 */
export async function createReference(jobId, referenceData) {
  const {
    originalCitation,
    originalTitle,
    originalAuthors,
    originalYear,
    originalVenue,
    suggestedTitle,
    suggestedAuthors,
    suggestedYear,
    suggestedVenue,
    suggestedDoi,
    bibtexEntry,
    verificationSources,
    issues,
    status
  } = referenceData;

  const result = await query(
    `INSERT INTO "references" (
      job_id, bibtex_key, original_title, original_authors, original_year, original_source,
      canonical_title, canonical_authors, canonical_year,
      corrected_title, corrected_authors, corrected_year,
      status, confidence_score, venue, doi, is_retracted,
      cited_by_count, google_scholar_url, openalex_url, crossref_url, semantic_scholar_url,
      duplicate_group_id, duplicate_group_count, is_primary_duplicate, issues,
      metadata, bibtex_type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
    RETURNING *`,
    [
      jobId,
      referenceData.bibtexKey,
      originalTitle,
      originalAuthors || null,
      originalYear,
      referenceData.originalSource,
      suggestedTitle,
      suggestedAuthors || null,
      suggestedYear,
      referenceData.correctedTitle,
      referenceData.correctedAuthors || null,
      referenceData.correctedYear,
      status || 'verified',
      referenceData.confidenceScore,
      suggestedVenue,
      suggestedDoi,
      referenceData.is_retracted || false,
      referenceData.cited_by_count || null,
      referenceData.google_scholar_url || null,
      referenceData.openalex_url || null,
      referenceData.crossref_url || null,
      referenceData.semantic_scholar_url || null,
      referenceData.duplicate_group_id || null,
      referenceData.duplicate_group_count || null,
      referenceData.is_primary_duplicate || false,
      issues ? JSON.stringify(issues) : '[]',
      referenceData.metadata ? JSON.stringify(referenceData.metadata) : '{}',
      referenceData.bibtex_type || 'article'
    ]
  );
  return result.rows[0];
}

/**
 * Get all references for a job
 * @param {string} jobId - Job UUID
 * @returns {Promise<Array>} Array of reference objects
 */
export async function getJobReferences(jobId) {
  const result = await query(
    `SELECT * FROM "references" 
     WHERE job_id = $1 
     ORDER BY created_at ASC`,
    [jobId]
  );
  return result.rows;
}

/**
 * Get a single reference by ID
 * @param {string} referenceId - Reference UUID
 * @returns {Promise<Object|null>} Reference object or null
 */
export async function getReferenceById(referenceId) {
  const result = await query(
    `SELECT * FROM "references" WHERE id = $1 LIMIT 1`,
    [referenceId]
  );
  return result.rows[0] || null;
}

/**
 * Update reference decision (accept/reject)
 * @param {string} referenceId - Reference UUID
 * @param {string} decision - User decision ('accepted' or 'rejected')
 * @param {Object} correctedData - Corrected reference data
 * @returns {Promise<Object>} Updated reference object
 */
export async function updateReferenceDecision(referenceId, decision, correctedData = {}) {
  console.log('[updateReferenceDecision] Updating reference:', referenceId, 'Decision:', decision);
  console.log('[updateReferenceDecision] Corrected data:', correctedData);

  // If accepted, apply canonical values to the original fields
  if (decision === 'accepted' && correctedData) {
    // Calculate which fields were corrected for the issues array
    const correctedFields = [];
    const updates = {};

    if (correctedData.title) {
      updates.title = correctedData.title;
      correctedFields.push('title');
    }
    if (correctedData.authors) {
      updates.authors = correctedData.authors;
      correctedFields.push('authors');
    }
    if (correctedData.year) {
      updates.year = correctedData.year;
      correctedFields.push('year');
    }
    if (correctedData.source) {
      updates.source = correctedData.source;
      correctedFields.push('venue');
    }

    const result = await query(
      `UPDATE "references" 
       SET 
         original_title = COALESCE($2, original_title),
         original_authors = COALESCE($3, original_authors),
         original_year = COALESCE($4, original_year),
         original_source = COALESCE($5, original_source),
         metadata = COALESCE($6, metadata),
         bibtex_type = COALESCE($7, bibtex_type),
         status = 'verified',
         confidence_score = 100,
         issues = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        referenceId,
        correctedData.title || null,
        correctedData.authors || null,
        correctedData.year || null,
        correctedData.source || null,
        correctedData.metadata ? JSON.stringify(correctedData.metadata) : null,
        correctedData.bibtex_type || null,
        JSON.stringify([`✓ Corrected: ${correctedFields.join(', ')}`])
      ]
    );

    console.log('[updateReferenceDecision] Updated to:', result.rows[0]);
    return result.rows[0];
  } else {
    // User rejected - mark as reviewed but keep original
    const result = await query(
      `UPDATE "references" 
       SET 
         status = 'verified',
         issues = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [referenceId, JSON.stringify(['⚠ Needs review: User kept original values'])]
    );

    console.log('[updateReferenceDecision] Marked as reviewed:', result.rows[0]);
    return result.rows[0];
  }
}

/**
 * Update reference duplicate status
 * @param {string} referenceId - Reference UUID
 * @param {Object} duplicateData - Duplicate data (status, duplicate_group_id, duplicate_group_count, is_primary_duplicate, issues)
 * @returns {Promise<Object>} Updated reference object
 */
export async function updateReferenceDuplicateStatus(referenceId, duplicateData) {
  const {
    status,
    duplicate_group_id,
    duplicate_group_count,
    is_primary_duplicate,
    issues
  } = duplicateData;

  const result = await query(
    `UPDATE "references" 
     SET 
       status = $2,
       duplicate_group_id = $3,
       duplicate_group_count = $4,
       is_primary_duplicate = $5,
       issues = $6
     WHERE id = $1
     RETURNING *`,
    [
      referenceId,
      status,
      duplicate_group_id,
      duplicate_group_count,
      is_primary_duplicate,
      issues ? JSON.stringify(issues) : null
    ]
  );
  return result.rows[0];
}

/**
 * Delete duplicate references
 * @param {string} jobId - Job UUID
 * @param {Array<string>} referenceIds - Array of reference UUIDs to delete
 * @returns {Promise<number>} Number of deleted references
 */
export async function deleteDuplicateReferences(jobId, referenceIds) {
  if (!referenceIds || referenceIds.length === 0) {
    return 0;
  }

  const placeholders = referenceIds.map((_, index) => `$${index + 2}`).join(', ');
  const result = await query(
    `DELETE FROM "references"
     WHERE job_id = $1 AND id IN (${placeholders})`,
    [jobId, ...referenceIds]
  );
  return result.rowCount;
}

// ==================== VERIFICATION SOURCE OPERATIONS ====================

/**
 * Create verification source entry
 * @param {string} referenceId - Reference UUID
 * @param {string} source - Source name (openalex, crossref, semantic_scholar)
 * @param {Object} data - Source data object
 * @returns {Promise<Object>} Created verification source object
 */
export async function createVerificationSource(referenceId, source, data) {
  const result = await query(
    `INSERT INTO verification_sources (reference_id, source_name, found, confidence)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [referenceId, source, data.found || false, data.confidence || 0]
  );
  return result.rows[0];
}

// ==================== REFERENCE ISSUES ====================

/**
 * Create reference issue
 * @param {string} referenceId - Reference UUID
 * @param {string} issueType - Type of issue (missing_doi, author_mismatch, etc.)
 * @param {string} description - Issue description
 * @param {string} severity - Issue severity (low, medium, high)
 * @returns {Promise<Object>} Created issue object
 */
export async function createReferenceIssue(referenceId, issueType, description, severity = 'medium') {
  const result = await query(
    `INSERT INTO reference_issues (reference_id, issue_type, issue_text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [referenceId, issueType, description]
  );
  return result.rows[0];
}

/**
 * Delete a reference
 * @param {string} referenceId - Reference UUID
 * @returns {Promise<Object>} Deleted reference object
 */
export async function deleteReference(referenceId) {
  const result = await query(
    `DELETE FROM "references" 
     WHERE id = $1
     RETURNING *`,
    [referenceId]
  );
  return result.rows[0];
}

// ==================== EXPORT HISTORY ====================

/**
 * Log export activity
 * @param {string} userId - User UUID
 * @param {string} jobId - Job UUID
 * @param {string} exportFormat - Export format (bibtex, json, csv)
 * @returns {Promise<Object>} Created export history object
 */
export async function logExport(userId, jobId, exportFormat) {
  const result = await query(
    `INSERT INTO export_history (user_id, job_id, export_format)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, jobId, exportFormat]
  );
  return result.rows[0];
}

// ==================== ACTIVITY LOG ====================

/**
 * Log user activity
 * @param {string} userId - User UUID
 * @param {string} jobId - Job UUID (optional)
 * @param {string} action - Action type (upload, accept, reject, export, merge)
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Created activity log object
 */
export async function logActivity(userId, jobId, action, details = {}) {
  const result = await query(
    `INSERT INTO activity_log (user_id, job_id, action, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, jobId, action, JSON.stringify(details)]
  );
  return result.rows[0];
}

/**
 * Get user activity history
 * @param {string} userId - User UUID
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} Array of activity log objects
 */
export async function getUserActivity(userId, limit = 100) {
  const result = await query(
    `SELECT * FROM activity_log 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
