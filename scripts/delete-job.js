/**
 * Delete a specific job and all its references from the database
 * Usage: node scripts/delete-job.js <jobId>
 */

import { query } from '../db-connection.js';

const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Error: Please provide a job ID');
  console.log('Usage: node scripts/delete-job.js <jobId>');
  console.log('\nTo find your job ID:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Run: localStorage.getItem("current_job_id")');
  process.exit(1);
}

async function deleteJob(jobId) {
  try {
    console.log(`🗑️  Deleting job: ${jobId}`);

    // Delete references first (due to foreign key constraint)
    const refResult = await query(
      'DELETE FROM "references" WHERE job_id = $1',
      [jobId]
    );
    console.log(`   Deleted ${refResult.rowCount} references`);

    // Delete the job
    const jobResult = await query(
      'DELETE FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rowCount === 0) {
      console.log('⚠️  Job not found - may have already been deleted');
    } else {
      console.log(`✅ Job deleted successfully`);
    }

    console.log('\n📝 Next steps:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Upload your BibTeX file again');
    console.log('3. The new analysis will use the fixed parser');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting job:', error.message);
    process.exit(1);
  }
}

deleteJob(jobId);
