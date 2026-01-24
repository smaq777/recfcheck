// Quick script to check what's ACTUALLY in the database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('🔍 Checking database contents...\n');
    
    // Get the most recent job
    const jobResult = await pool.query(`
      SELECT id, file_name, status, created_at 
      FROM analysis_jobs 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (jobResult.rows.length === 0) {
      console.log('❌ No jobs found in database');
      process.exit(0);
    }
    
    const job = jobResult.rows[0];
    console.log('📋 Most recent job:');
    console.log('   ID:', job.id);
    console.log('   File:', job.file_name);
    console.log('   Status:', job.status);
    console.log('   Created:', job.created_at);
    console.log('\n');
    
    // Get references for this job
    const refResult = await pool.query(`
      SELECT 
        id,
        title,
        authors,
        original_authors,
        canonical_authors,
        canonical_title,
        canonical_year,
        canonical_venue,
        confidence_score,
        status,
        issues
      FROM "references"
      WHERE job_id = $1
      LIMIT 3
    `, [job.id]);
    
    console.log(`📚 Found ${refResult.rows.length} references (showing first 3):\n`);
    
    refResult.rows.forEach((ref, index) => {
      console.log(`\n--- REFERENCE ${index + 1} ---`);
      console.log('ID:', ref.id);
      console.log('Title (from file):', ref.title);
      console.log('Authors (from file parser):', ref.authors);
      console.log('original_authors (stored):', ref.original_authors);
      console.log('canonical_authors (FROM API):', ref.canonical_authors);
      console.log('canonical_title:', ref.canonical_title);
      console.log('canonical_year:', ref.canonical_year);
      console.log('canonical_venue:', ref.canonical_venue);
      console.log('confidence_score:', ref.confidence_score);
      console.log('status:', ref.status);
      console.log('issues:', JSON.stringify(ref.issues, null, 2));
      console.log('---');
    });
    
    // Summary analysis
    console.log('\n\n📊 ANALYSIS:');
    const withCanonicalAuthors = refResult.rows.filter(r => r.canonical_authors).length;
    const withOriginalAuthors = refResult.rows.filter(r => r.original_authors).length;
    const withAuthors = refResult.rows.filter(r => r.authors).length;
    
    console.log(`✅ References with canonical_authors (from API): ${withCanonicalAuthors}/${refResult.rows.length}`);
    console.log(`✅ References with original_authors: ${withOriginalAuthors}/${refResult.rows.length}`);
    console.log(`✅ References with authors (parsed): ${withAuthors}/${refResult.rows.length}`);
    
    if (withCanonicalAuthors === 0) {
      console.log('\n❌ PROBLEM: No canonical_authors found! API data not being stored.');
    } else {
      console.log('\n✅ Database has API data. Issue may be in transformation or frontend display.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkData();
