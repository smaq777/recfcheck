
import { query, pool } from './db-connection.js';

async function checkUserJobs() {
  const userId = '2d65151e-a292-4a23-8ad1-a4c3f05df624';
  try {
    const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    console.log('User found:', userRes.rows);

    const jobsRes = await query(`SELECT * FROM jobs WHERE user_id = $1`, [userId]);
    console.log('Jobs found:', jobsRes.rows.length);
    
    if (jobsRes.rows.length > 0) {
        console.log('First job sample:', jobsRes.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkUserJobs();
