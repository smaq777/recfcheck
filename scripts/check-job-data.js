/**
 * Check what data is currently in the database for a job
 * Usage: node scripts/check-job-data.js <jobId>
 */

import { query } from '../db-connection.js';

const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Error: Please provide a job ID');
  console.log('Usage: node scripts/check-job-data.js <jobId>');
  console.log('\nTo find your job ID:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Run: localStorage.getItem("current_job_id")');
  console.log('Or check the URL in the results page');
  process.exit(1);
}

async function checkJobData(jobId) {
  try {
    console.log(`🔍 Checking job: ${jobId}\n`);

    // Get job info
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      console.log('❌ Job not found in database');
      process.exit(1);
    }

    const job = jobResult.rows[0];
    console.log('📋 JOB INFO:');
    console.log(`   File: ${job.file_name}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Total References: ${job.total_references}`);
    console.log(`   Created: ${job.created_at}`);
    console.log('');

    // Get references
    const refResult = await query(
      'SELECT * FROM "references" WHERE job_id = $1 ORDER BY created_at ASC LIMIT 5',
      [jobId]
    );

    console.log(`📚 REFERENCES (showing first 5 of ${refResult.rowCount}):\n`);

    refResult.rows.forEach((ref, idx) => {
      console.log(`${idx + 1}. KEY: ${ref.bibtex_key || 'NO KEY'}`);
      console.log(`   Title: ${ref.original_title || ref.title || 'NO TITLE'}`);
      console.log(`   Authors: ${ref.original_authors || ref.authors || 'NO AUTHORS'}`);
      console.log(`   Year: ${ref.original_year || ref.year || 'NO YEAR'}`);
      console.log(`   Status: ${ref.status}`);
      console.log(`   Confidence: ${ref.confidence_score}%`);
      console.log('');
    });

    // Check if data looks corrupted
    const hasUntitled = refResult.rows.some(r => 
      (r.original_title || r.title || '').toLowerCase().includes('untitled') ||
      (r.original_title || r.title || '').toLowerCase().includes('unknown')
    );

    const hasNoKey = refResult.rows.some(r => 
      !r.bibtex_key || r.bibtex_key === 'no_key'
    );

    if (hasUntitled || hasNoKey) {
      console.log('⚠️  WARNING: Data looks corrupted!');
      console.log('   This data was likely saved with the broken parser.');
      console.log('   You need to delete this job and re-upload the file.\n');
      console.log('💡 To delete this job, run:');
      console.log(`   node scripts/delete-job.js ${jobId}`);
    } else {
      console.log('✅ Data looks good!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkJobData(jobId);
