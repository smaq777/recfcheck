
import { query, pool } from './db-connection.js';

async function checkIssuesData() {
  try {
    const res = await query(`
      SELECT id, issues, jsonb_typeof(issues) as type 
      FROM "references" 
      LIMIT 10
    `);
    console.log('Issues data sample:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkIssuesData();
