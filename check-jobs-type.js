
import { query, pool } from './db-connection.js';

async function checkJobsUserIdType() {
  try {
    const res = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' AND column_name = 'user_id'
    `);
    console.log('Column user_id type in jobs:', res.rows[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkJobsUserIdType();
