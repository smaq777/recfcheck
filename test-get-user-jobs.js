
import { query, pool } from './db-connection.js';

async function testGetUserJobs() {
  const userId = '2d65151e-a292-4a23-8ad1-a4c3f05df624';
  try {
    const res = await query(
        `SELECT j.*,
         (SELECT COUNT(*)::int FROM "references" r WHERE r.job_id = j.id AND r.status = 'verified') as verified_count,
         (SELECT COUNT(*)::int FROM "references" r WHERE r.job_id = j.id AND jsonb_array_length(r.issues) > 0) as issues_count
         FROM jobs j 
         WHERE user_id = $1 
         ORDER BY upload_time DESC 
         LIMIT $2`,
        [userId, 50]
      );
    console.log('Query success, jobs found:', res.rows.length);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    pool.end();
  }
}

testGetUserJobs();
