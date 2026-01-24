import { query } from '../db-connection.js';

const jobId = 'b1dac45d-3b26-4f4d-a7cf-24a97e370ce1';

console.log(`🔍 Checking data for job: ${jobId}\n`);

// Get first 3 references
const refs = await query('SELECT original_title, original_authors, original_year, bibtex_key, status FROM "references" WHERE job_id = $1 LIMIT 3', [jobId]);

console.log(`First 3 references in database:\n`);

refs.rows.forEach((ref, idx) => {
  console.log(`${idx + 1}. Key: ${ref.bibtex_key}`);
  console.log(`   Title: ${ref.original_title}`);
  console.log(`   Authors: ${ref.original_authors}`);
  console.log(`   Year: ${ref.original_year}`);
  console.log(`   Status: ${ref.status}`);
  console.log('');
});

process.exit(0);
