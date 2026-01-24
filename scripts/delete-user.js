#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Deletes a specific user and all related data
 * 
 * Usage:
 *   node scripts/delete-user.js samq777@hotmail.com
 */

import { query } from '../db-connection.js';

async function deleteUser(email) {
  if (!email) {
    console.error('❌ Error: Email address required');
    console.error('Usage: node scripts/delete-user.js <email>');
    process.exit(1);
  }

  try {
    console.log(`🔍 Finding user: ${email}`);
    
    // First, find the user
    const userResult = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.log(`⚠️  User not found: ${email}`);
      process.exit(0);
    }

    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.email} (ID: ${user.id})`);

    // Delete all related data in correct order (foreign key dependencies)
    console.log('\n🗑️  Deleting related data...');

    // 1. Delete bibliography references for this user's jobs
    const refResult = await query(
      `DELETE FROM bibliography_references 
       WHERE job_id IN (SELECT id FROM jobs WHERE user_id = $1)
       RETURNING id`,
      [user.id]
    );
    console.log(`  ✓ Deleted ${refResult.rowCount} bibliography references`);

    // 2. Delete jobs for this user
    const jobResult = await query(
      'DELETE FROM jobs WHERE user_id = $1 RETURNING id',
      [user.id]
    );
    console.log(`  ✓ Deleted ${jobResult.rowCount} jobs`);

    // 3. Delete activity logs for this user
    const activityResult = await query(
      'DELETE FROM activity_log WHERE user_id = $1 RETURNING id',
      [user.id]
    );
    console.log(`  ✓ Deleted ${activityResult.rowCount} activity logs`);

    // 4. Finally, delete the user
    const deleteResult = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [user.id]
    );

    if (deleteResult.rowCount > 0) {
      console.log(`\n✅ Successfully deleted user: ${email}`);
      console.log(`   User ID: ${user.id}`);
    } else {
      console.log(`❌ Failed to delete user: ${email}`);
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  }
}

// Run the script
const email = process.argv[2];
deleteUser(email).then(() => {
  console.log('\n✓ Cleanup complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
