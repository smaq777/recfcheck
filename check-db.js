
import { query, pool } from './db-connection.js';

async function checkTables() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check columns for 'jobs' or 'analysis_jobs'
    const tables = res.rows.map(r => r.table_name);
    
    if (tables.includes('jobs')) {
        const cols = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs'`);
        console.log('Columns in jobs:', cols.rows.map(r => r.column_name));
    }
    
    if (tables.includes('analysis_jobs')) {
        const cols = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'analysis_jobs'`);
        console.log('Columns in analysis_jobs:', cols.rows.map(r => r.column_name));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkTables();
