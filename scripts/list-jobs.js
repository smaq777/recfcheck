import { query } from '../db-connection.js';

console.log('🔍 Checking database for old jobs...\n');

// Get all jobs
const jobs = await query('SELECT id, file_name, upload_time, status FROM jobs ORDER BY upload_time DESC LIMIT 5');

console.log(`Found ${jobs.rowCount} recent jobs:\n`);

jobs.rows.forEach((job, idx) => {
  console.log(`${idx + 1}. ${job.file_name}`);
  console.log(`   ID: ${job.id}`);
  console.log(`   Uploaded: ${job.upload_time}`);
  console.log(`   Status: ${job.status}`);
  console.log('');
});

// Get reference count for each job
for (const job of jobs.rows) {
  const refs = await query('SELECT COUNT(*) as count FROM "references" WHERE job_id = $1', [job.id]);
  console.log(`Job ${job.file_name}: ${refs.rows[0].count} references`);
}

console.log('\n💡 To delete old jobs, run:');
console.log('   node scripts/delete-job.js <job-id>');

process.exit(0);
