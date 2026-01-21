/**
 * Neon PostgreSQL Connection Service
 * Vercel serverless compatible - uses REST API instead of long connections
 */

import { AnalysisJob, BibliographyReference, User } from './db-schema';

const DATABASE_URL = process.env.DATABASE_URL || '';

interface QueryResult {
  rows?: any[];
  rowCount?: number;
  error?: string;
}

/**
 * Execute SQL query via Neon REST API (Vercel compatible)
 * Use connection pooler endpoint for best performance
 */
export async function queryDatabase(sql: string, params?: any[]): Promise<QueryResult> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured. Set it in .env');
  }

  try {
    // Parse connection string to extract details
    const url = new URL(DATABASE_URL);
    const user = url.username;
    const password = url.password;
    const host = url.hostname;
    const database = url.pathname.slice(1);

    // Use Neon HTTP API endpoint
    const neonApiUrl = `https://${host}/sql`;
    
    const response = await fetch(neonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        query: sql,
        params: params || [],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Database error:', error);
      throw new Error(`Database query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

/**
 * Initialize database schema on first run
 */
export async function initializeDatabase() {
  try {
    // Create users table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        photo_url TEXT,
        subscription_plan VARCHAR(50) DEFAULT 'free',
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create analysis_jobs table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS analysis_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        total_references INTEGER DEFAULT 0,
        verified_count INTEGER DEFAULT 0,
        issues_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bibliography_references table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS bibliography_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        bibtex_key VARCHAR(255),
        title VARCHAR(1024),
        authors VARCHAR(1024),
        year INTEGER,
        source VARCHAR(255),
        doi VARCHAR(255),
        url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        confidence_score INTEGER DEFAULT 0,
        canonical_title VARCHAR(1024),
        canonical_year INTEGER,
        venue VARCHAR(255),
        issues TEXT[],
        is_retracted BOOLEAN DEFAULT false,
        ai_insight TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create openalex_cache table
    await queryDatabase(`
      CREATE TABLE IF NOT EXISTS openalex_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query_title VARCHAR(1024) NOT NULL UNIQUE,
        response JSONB,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
      )
    `);

    // Create indexes
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_bibliography_references_job_id ON bibliography_references(job_id)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_bibliography_references_user_id ON bibliography_references(user_id)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_bibliography_references_status ON bibliography_references(status)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_openalex_cache_query ON openalex_cache(query_title)`);
    await queryDatabase(`CREATE INDEX IF NOT EXISTS idx_openalex_cache_expires ON openalex_cache(expires_at)`);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    // Don't throw - tables might already exist
  }
}

/**
 * Create or get user
 */
export async function upsertUser(email: string, displayName: string, photoUrl: string): Promise<User> {
  const result = await queryDatabase(
    `INSERT INTO users (email, display_name, photo_url, email_verified) 
     VALUES ($1, $2, $3, false)
     ON CONFLICT (email) DO UPDATE SET display_name = $2, photo_url = $3, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [email, displayName, photoUrl]
  );
  return result.rows?.[0];
}

/**
 * Create analysis job
 */
export async function createAnalysisJob(userId: string, fileName: string, fileSize: number, fileType: string): Promise<AnalysisJob> {
  const result = await queryDatabase(
    `INSERT INTO analysis_jobs (user_id, file_name, file_size, file_type, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING *`,
    [userId, fileName, fileSize, fileType]
  );
  return result.rows?.[0];
}

/**
 * Save bibliography reference
 */
export async function saveBibliographyReference(ref: Partial<BibliographyReference>): Promise<BibliographyReference> {
  const result = await queryDatabase(
    `INSERT INTO bibliography_references (
      job_id, user_id, bibtex_key, title, authors, year, source, doi, url,
      status, confidence_score, canonical_title, canonical_year, venue, issues, is_retracted, ai_insight
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      ref.job_id, ref.user_id, ref.bibtex_key, ref.title, ref.authors, ref.year, ref.source, ref.doi, ref.url,
      ref.status || 'pending', ref.confidence_score || 0, ref.canonical_title, ref.canonical_year, ref.venue,
      ref.issues || [], ref.is_retracted || false, ref.ai_insight
    ]
  );
  return result.rows?.[0];
}

/**
 * Get cached OpenAlex response
 */
export async function getCachedOpenAlexResponse(queryTitle: string): Promise<any> {
  const result = await queryDatabase(
    `SELECT response FROM openalex_cache 
     WHERE query_title = $1 AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [queryTitle]
  );
  return result.rows?.[0]?.response || null;
}

/**
 * Cache OpenAlex response
 */
export async function cacheOpenAlexResponse(queryTitle: string, response: any): Promise<void> {
  await queryDatabase(
    `INSERT INTO openalex_cache (query_title, response)
     VALUES ($1, $2)
     ON CONFLICT (query_title) DO UPDATE SET response = $2, cached_at = CURRENT_TIMESTAMP`,
    [queryTitle, JSON.stringify(response)]
  );
}

/**
 * Get analysis job results
 */
export async function getAnalysisJobResults(jobId: string): Promise<BibliographyReference[]> {
  const result = await queryDatabase(
    `SELECT * FROM bibliography_references 
     WHERE job_id = $1
     ORDER BY created_at ASC`,
    [jobId]
  );
  return result.rows || [];
}

/**
 * Update analysis job status
 */
export async function updateAnalysisJobStatus(jobId: string, status: string, counts?: { verified: number; issues: number }): Promise<void> {
  let query = `UPDATE analysis_jobs SET status = $1, updated_at = CURRENT_TIMESTAMP`;
  const params: any[] = [status, jobId];
  
  if (counts) {
    query += `, verified_count = $3, issues_count = $4`;
    params.push(counts.verified, counts.issues);
  }
  
  query += ` WHERE id = $2`;
  params.splice(1, 0, jobId);
  
  await queryDatabase(query, params);
}
