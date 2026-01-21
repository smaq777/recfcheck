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
    `INSERT INTO users (email, name, password_hash)
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
    `SELECT * FROM jobs 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
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
      status, confidence_score, venue, doi
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      jobId,
      referenceData.bibtexKey,
      originalTitle,
      originalAuthors ? JSON.stringify(originalAuthors) : null,
      originalYear,
      referenceData.originalSource,
      suggestedTitle,
      suggestedAuthors ? JSON.stringify(suggestedAuthors) : null,
      suggestedYear,
      referenceData.correctedTitle,
      referenceData.correctedAuthors ? JSON.stringify(referenceData.correctedAuthors) : null,
      referenceData.correctedYear,
      status || 'verified',
      referenceData.confidenceScore,
      suggestedVenue,
      suggestedDoi
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
  const updateFields = {
    user_decision: decision
  };

  // If accepted, update with corrected data
  if (decision === 'accepted' && correctedData) {
    if (correctedData.title) updateFields.corrected_title = correctedData.title;
    if (correctedData.authors) updateFields.corrected_authors = JSON.stringify(correctedData.authors);
    if (correctedData.year) updateFields.corrected_year = correctedData.year;
    if (correctedData.venue) updateFields.venue = correctedData.venue;
    if (correctedData.doi) updateFields.doi = correctedData.doi;
  }

  const setClause = Object.keys(updateFields)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  
  const values = [referenceId, ...Object.values(updateFields)];

  const result = await query(
    `UPDATE "references" 
     SET ${setClause}
     WHERE id = $1
     RETURNING *`,
    values
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
