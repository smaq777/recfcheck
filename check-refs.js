
import { query, pool } from './db-connection.js';

async function checkReferences() {
  try {
    const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'references'`);
    console.log('Columns in references:', cols.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

checkReferences();
