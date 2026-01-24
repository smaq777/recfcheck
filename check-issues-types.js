
import { query, pool } from './db-connection.js';

async function checkIssuesTypes() {
  try {
    const res = await query(`
      SELECT jsonb_typeof(issues) as type, count(*) 
      FROM "references" 
      GROUP BY jsonb_typeof(issues)
    `);
    console.log('Issues types distribution:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkIssuesTypes();
