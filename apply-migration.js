#!/usr/bin/env node

/**
 * Database Migration Script
 * Applies the issues column migration to Neon database
 * 
 * Usage: node apply-migration.js
 */

import { query } from './db-connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add-issues-column.sql'),
      'utf8'
    );

    console.log('📋 Migration SQL:');
    console.log(migrationSQL);
    console.log('');

    console.log('🚀 Applying migration to database...');
    
    // Execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('comment')) {
        // Skip COMMENT statements as they might not be supported in all versions
        console.log('⏭️  Skipping COMMENT statement (optional)');
        continue;
      }

      console.log(`⚙️  Executing: ${statement.substring(0, 60)}...`);
      await query(statement);
      console.log('✅ Done');
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Verifying column exists...');
    
    const checkResult = await query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'references' AND column_name = 'issues'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column "issues" verified:');
      console.log(checkResult.rows[0]);
    } else {
      console.log('❌ Column "issues" not found! Migration may have failed.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
